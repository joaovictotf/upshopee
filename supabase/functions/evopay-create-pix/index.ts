/// <reference types="https://deno.land/x/deno/types.d.ts" />
// EvoPay PIX creation endpoint — called by the frontend when a user clicks "Comprar".
// Reads EVOPAY_TOKEN from Deno.env (Supabase secret) — NEVER hardcoded.
// Returns QR code data so the frontend can display it.
//
// O VALOR COBRADO É DEFINIDO AQUI, NUNCA PELO CLIENTE. Ver PACK_PRICES abaixo.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const EVOPAY_BASE = "https://api.evopay.cash/v1/pix";
const SUPABASE_FUNCTIONS_BASE =
  "https://ndawyrqzqhzbyjdmkdge.supabase.co/functions/v1";

// ─── PREÇOS DOS PACKS — FONTE DE VERDADE DO SERVIDOR ────────────────────────
// Até 17/08/2026 esta função usava `body.amount`, ou seja, o valor vinha do
// navegador. O evopay-webhook ativa o pack pelo NOME e nunca compara com o
// valor pago — então bastava editar a requisição para pagar R$ 1,00 e receber
// o Pack Máximo (R$ 400,00). A função ainda roda com verify_jwt: false, então
// a requisição nem precisa de login.
//
// Agora o preço é procurado aqui, pelo id do pack. Não existe caminho em que o
// cliente influencie o valor.
//
// Estes quatro ids e valores espelham PACKS em
// src/routes/dashboard.impulsionar-vendas.tsx. Mudou preço na UI, MUDE AQUI
// TAMBÉM: a UI decide o que o usuário vê, este objeto decide o que ele paga.
const PACK_PRICES: Record<string, number> = {
  inicio: 40,
  aceleracao: 64.9,
  escala: 150,
  maximo: 400,
};

// ─── FORMATO DE userId ──────────────────────────────────────────────────────
// Esta função roda com verify_jwt: false, então body.userId chega sem nenhuma
// garantia — qualquer um pode mandar qualquer coisa.
//
// Um userId malformado não é só lixo no banco: ele muda a contagem de hífens
// do clientReference. O evopay-webhook faz split("-") e exige exatamente 9
// partes; quando não bate, ele DESCARTA o pagamento e devolve 200 para a
// EvoPay. Ou seja: o cliente paga, não recebe nada, e não há retry. Por isso a
// validação acontece ANTES da chamada à EvoPay — nenhuma cobrança é criada.
//
// v4 estrito: 8-4-4-4-12, com o dígito de versão '4' e a variante [89ab].
// Conferido contra a produção em 17/08/2026: 511 de 511 linhas em auth.users
// são v4, então nenhum cliente legítimo é barrado por esta regra.
//
// As âncoras ^ e $ são a parte que protege o contrato de 9 partes: com elas a
// string tem exatamente 4 hífens e nenhum caractere extra. Um userId com hífen
// a mais, a menos, ou com espaço/sufixo colado não passa.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CreatePixRequest {
  // NÃO EXISTE CAMPO `amount` AQUI, DE PROPÓSITO. O preço sai de PACK_PRICES,
  // indexado por packName. Não readicione — um valor vindo do cliente é
  // exatamente o buraco do "R$ 1,00 e leva o Pack Máximo".
  //
  // Esta função atende DOIS propósitos, escolhidos pela presença de bookingId:
  //   • bookingId ausente  → Impulsionar (packName + userEmail + userId)
  //   • bookingId presente → aula ao vivo (só bookingId importa)
  // Nenhum dos dois aceita valor nem clientReference vindos do cliente.
  bookingId?: string;
  packName?: string;
  userEmail?: string;
  userId?: string;
}

interface EvoPayPixResponse {
  id?: string;
  qrCodeText?: string;
  qrCodeUrl?: string;
  qrCodeBase64?: string;
  transactionId?: string;
  error?: string;
  message?: string;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- 1. Validate input ---
    const body: CreatePixRequest = await req.json();

    // ─── ROTEAMENTO POR PROPÓSITO ───────────────────────────────────────────
    // Estas duas variáveis são a única saída dos dois caminhos, e as duas são
    // decididas pelo SERVIDOR: PACK_PRICES no Impulsionar, a linha de
    // class_bookings na aula. Nem o valor nem a referência vêm do corpo da
    // requisição em nenhum dos casos.
    let chargeAmount: number;
    let chargeReference: string;

    if (typeof body.bookingId === "string" && body.bookingId.length > 0) {
      // ═══ CAMINHO AULA AO VIVO ═══
      // create_class_booking já validou o preço contra class_professors e já
      // montou o client_reference de 9 partes. Aqui a função só LÊ a linha:
      // não recalcula preço e não remonta referência.
      if (!UUID_V4.test(body.bookingId)) {
        console.error("Invalid bookingId rejected:", body.bookingId);
        return new Response(
          JSON.stringify({ ok: false, error: "invalid bookingId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
        return new Response(
          JSON.stringify({ ok: false, error: "server configuration error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // service_role: a reserva é do usuário e esta função roda sem JWT
      // (verify_jwt: false), então a RLS de class_bookings barraria a leitura.
      // Mesmo padrão que o evopay-webhook já usa.
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: booking, error: bookingError } = await supabase
        .from("class_bookings")
        .select("id, amount, client_reference, payment_status")
        .eq("id", body.bookingId)
        .maybeSingle();

      if (bookingError) {
        console.error("Error reading class_bookings:", bookingError);
        return new Response(
          JSON.stringify({ ok: false, error: "could not read booking" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!booking) {
        console.error("Booking not found:", body.bookingId);
        return new Response(
          JSON.stringify({ ok: false, error: "booking not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Só reserva 'pending' vira cobrança. Gerar PIX para uma reserva já
      // 'paid' seria cobrar a mesma aula duas vezes.
      if (booking.payment_status !== "pending") {
        console.error("Booking is not pending:", body.bookingId, booking.payment_status);
        return new Response(
          JSON.stringify({ ok: false, error: "booking is not pending" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // client_reference é nullable no schema. Sem ele o webhook nunca acha a
      // reserva, e o pagamento viraria dinheiro perdido — melhor recusar antes.
      if (typeof booking.client_reference !== "string" || booking.client_reference.length === 0) {
        console.error("Booking has no client_reference:", body.bookingId);
        return new Response(
          JSON.stringify({ ok: false, error: "booking has no client_reference" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // numeric do Postgres pode chegar como string no JSON do PostgREST.
      const bookingAmount = Number(booking.amount);
      if (!Number.isFinite(bookingAmount) || bookingAmount <= 0) {
        console.error("Booking has invalid amount:", body.bookingId, booking.amount);
        return new Response(
          JSON.stringify({ ok: false, error: "booking has invalid amount" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      chargeAmount = bookingAmount;
      chargeReference = booking.client_reference;

      console.log("Aula booking resolved:", {
        bookingId: body.bookingId,
        amount: chargeAmount,
        clientReference: chargeReference,
      });
    } else {
      // ═══ CAMINHO IMPULSIONAR — CÓDIGO DE PRODUÇÃO, NÃO ALTERAR ═══
      // Daqui até o fim do bloco tudo é idêntico ao que já rodava; a única
      // diferença é a indentação, por causa do `else`. Um pagamento real
      // passou por este caminho em 25/06/2026.
      if (!body.packName || !body.userEmail || !body.userId) {
        return new Response(
          JSON.stringify({ ok: false, error: "packName, userEmail, and userId are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // --- 1a. userId tem que ser UUID v4 ---
      if (typeof body.userId !== "string" || !UUID_V4.test(body.userId)) {
        console.error("Invalid userId rejected:", body.userId);
        return new Response(
          JSON.stringify({ ok: false, error: "invalid userId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // --- 1b. Preço pelo servidor ---
      // hasOwnProperty em vez de acesso direto: `PACK_PRICES["toString"]`
      // devolveria uma função herdada de Object.prototype, e um pack inventado
      // chegaria adiante como valor não numérico.
      const amount = Object.prototype.hasOwnProperty.call(PACK_PRICES, body.packName)
        ? PACK_PRICES[body.packName]
        : undefined;

      // Pack desconhecido morre aqui: a EvoPay não chega a ser chamada, então
      // nenhuma cobrança órfã é criada.
      if (typeof amount !== "number") {
        console.error("Unknown packName rejected:", body.packName);
        return new Response(
          JSON.stringify({ ok: false, error: "unknown pack" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // --- 3. Build EvoPay request ---
      // FORMATO DO clientReference — NÃO ALTERAR.
      // O evopay-webhook faz split("-") e exige exatamente 9 partes:
      //   'shopesync'(1) + 'impulsionar'(1) + uuid(5) + packName(1) + timestamp(1)
      // Mudar o prefixo ou acrescentar um segmento quebra o Impulsionar em
      // produção — o webhook descarta o pagamento devolvendo 200, sem retry.
      // Os quatro ids de PACK_PRICES não têm hífen, então a contagem se mantém.
      const timestamp = Date.now();
      const clientReference =
        `shopesync-impulsionar-${body.userId}-${body.packName}-${timestamp}`;

      console.log("Creating PIX via EvoPay:", {
        amount,
        clientReference,
        packName: body.packName,
        userId: body.userId,
      });

      chargeAmount = amount;
      chargeReference = clientReference;
    }

    // --- 2. Read token from secret ---
    const token = Deno.env.get("EVOPAY_TOKEN");
    if (!token) {
      console.error("EVOPAY_TOKEN secret is not set");
      return new Response(
        JSON.stringify({ ok: false, error: "server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const evopayBody = {
      amount: chargeAmount,
      callbackUrl: `${SUPABASE_FUNCTIONS_BASE}/evopay-webhook`,
      clientReference: chargeReference,
      expiresIn: 1800, // 30 minutes
    };

    // --- 4. Call EvoPay API ---
    const evopayRes = await fetch(EVOPAY_BASE, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(evopayBody),
    });

    const evopayData: EvoPayPixResponse = await evopayRes.json();

    if (!evopayRes.ok) {
      console.error("EvoPay API error:", evopayRes.status, evopayData);
      return new Response(
        JSON.stringify({
          ok: false,
          error: evopayData.error || evopayData.message || "EvoPay API error",
          status: evopayRes.status,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("PIX created successfully:", {
      transactionId: evopayData.id || evopayData.transactionId,
    });

    // --- 5. Return QR code data to frontend ---
    return new Response(
      JSON.stringify({
        ok: true,
        qrCodeText: evopayData.qrCodeText,
        qrCodeUrl: evopayData.qrCodeUrl,
        qrCodeBase64: evopayData.qrCodeBase64,
        transactionId: evopayData.id || evopayData.transactionId,
        // Mesma CHAVE de antes ("clientReference") — o frontend do Impulsionar
        // lê data.clientReference. Só a variável de origem mudou de nome.
        clientReference: chargeReference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error in evopay-create-pix:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
