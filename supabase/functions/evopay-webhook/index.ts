/// <reference types="https://deno.land/x/deno/types.d.ts" />
// EvoPay webhook receiver — called by EvoPay when a PIX payment status changes.
// If the deposit is COMPLETED, activates the boost pack for the user.
// Uses the Supabase service_role key to call webhook_activate_boost_pack RPC.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// EvoPay webhook payload (relevant fields)
interface EvoPayWebhookPayload {
  id?: string;
  transactionId?: string;
  clientReference?: string;
  status?: string;      // "COMPLETED" | "PENDING" | "CANCELLED" | etc.
  type?: string;         // "DEPOSIT" | "WITHDRAWAL" | etc.
  amount?: number;
  createdAt?: string;
}

serve(async (req: Request) => {
  try {
    const body: EvoPayWebhookPayload = await req.json();

    console.log("EvoPay webhook received:", {
      id: body.id,
      status: body.status,
      type: body.type,
      clientReference: body.clientReference,
      amount: body.amount,
    });

    // --- 1. Validate — only process COMPLETED deposits ---
    if (body.status !== "COMPLETED") {
      console.log(`Ignoring webhook: status is "${body.status}", not "COMPLETED"`);
      return new Response(JSON.stringify({ received: true, action: "ignored_status" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (body.type !== "DEPOSIT") {
      console.log(`Ignoring webhook: type is "${body.type}", not "DEPOSIT"`);
      return new Response(JSON.stringify({ received: true, action: "ignored_type" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // --- 2. Parse clientReference ---
    // Format: shopesync-impulsionar-{userId}-{packName}-{timestamp}
    if (!body.clientReference) {
      console.error("Missing clientReference in webhook payload");
      return new Response(
        JSON.stringify({ received: true, error: "missing clientReference" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Format: shopesync-{purpose}-{uuid}-{...}-{timestamp}
    // UUID has 5 dash-separated groups: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    // So the full string has 1 + 1 + 5 + 1 + 1 = 9 dash-separated parts
    //
    // DOIS propósitos usam este webhook, e os dois têm exatamente 9 partes:
    //   shopesync-impulsionar-<uuid>-<packName>-<timestamp>     boost pack
    //   shopesync-aula-<uuid>-<professor_id>-<epoch_ms>         aula ao vivo
    //
    // A checagem de 9 partes NÃO mudou. A única diferença é que o segmento de
    // propósito agora aceita 'aula' além de 'impulsionar'; antes, um pagamento
    // de aula caía no rejeite abaixo e era descartado em silêncio (com 200).
    // Qualquer outro valor continua sendo rejeitado exatamente como antes.
    const parts = body.clientReference.split("-");

    if (parts.length !== 9 || parts[0] !== "shopesync" ||
        (parts[1] !== "impulsionar" && parts[1] !== "aula")) {
      console.error("Invalid clientReference format:", body.clientReference,
        `parts=${parts.length}`);
      return new Response(
        JSON.stringify({ received: true, error: "invalid clientReference format" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // --- 3. Create Supabase client with service_role ---
    // Subiu para antes do roteamento: os dois propósitos precisam do client.
    // As linhas em si são as mesmas de sempre.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
      return new Response(
        JSON.stringify({ received: true, error: "server configuration" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ═══════════════════════════════════════════════════════════════════════
    // AULA AO VIVO
    // ═══════════════════════════════════════════════════════════════════════
    // A referência INTEIRA é a chave de busca — confirm_class_booking procura
    // por client_reference. Nada é remontado a partir das partes, então o
    // professor_id em parts[3] não precisa ser interpretado aqui.
    //
    // confirm_class_booking é idempotente de propósito: se a EvoPay entregar o
    // mesmo webhook duas vezes, a segunda encontra 'paid', devolve true e não
    // reescreve paid_at.
    if (parts[1] === "aula") {
      const txId = body.transactionId || body.id || null;

      console.log("Aula payment received:", {
        clientReference: body.clientReference,
        txId,
      });

      const { data, error } = await supabase.rpc("confirm_class_booking", {
        _client_reference: body.clientReference,
        _tx_id: txId,
      });

      if (error) {
        console.error("RPC error confirming class booking:", error);
        return new Response(
          JSON.stringify({
            received: true,
            error: "failed to confirm booking",
            detail: error.message,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      // A RPC devolve false quando não existe reserva com esta referência.
      // Continua 200: a EvoPay não deve reprocessar uma referência que não é
      // nossa. Mesma postura de todos os outros caminhos desta função.
      if (data !== true) {
        console.error("Booking not confirmed:", body.clientReference, data);
        return new Response(
          JSON.stringify({
            received: true,
            error: "booking not confirmed",
            detail: data,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      console.log("Class booking confirmed:", body.clientReference);
      return new Response(
        JSON.stringify({
          received: true,
          action: "class_booking_confirmed",
          clientReference: body.clientReference,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // IMPULSIONAR — CÓDIGO DE PRODUÇÃO, NÃO ALTERAR
    // ═══════════════════════════════════════════════════════════════════════
    // Um pagamento real passou por aqui em 25/06/2026. Daqui até o fim da
    // função nada mudou, nem o texto nem a indentação.

    // Reconstruct UUID from parts[2..6]
    const userId = parts.slice(2, 7).join("-");
    const packName = parts[7];
    const timestamp = parts[8];

    console.log("Parsed clientReference:", { userId, packName, timestamp });

    // --- 4. Call the webhook_activate_boost_pack RPC ---
    const { data, error } = await supabase.rpc("webhook_activate_boost_pack", {
      _user_id: userId,
      _pack_id: packName,
    });

    if (error) {
      console.error("RPC error activating pack:", error);
      return new Response(
        JSON.stringify({
          received: true,
          error: "failed to activate pack",
          detail: error.message,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!data?.ok) {
      console.error("RPC returned not-ok:", data);
      return new Response(
        JSON.stringify({
          received: true,
          error: "pack activation returned not ok",
          detail: data,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log("Pack activated successfully:", data);

    // --- 5. Return 200 to EvoPay ---
    return new Response(
      JSON.stringify({
        received: true,
        action: "pack_activated",
        campaign_id: data.campaign_id,
        pack_name: data.pack_name,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error in evopay-webhook:", err);
    // Always return 200 to EvoPay — they'll retry otherwise
    return new Response(
      JSON.stringify({
        received: true,
        error: err instanceof Error ? err.message : "unknown error",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }
});
