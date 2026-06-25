/// <reference types="https://deno.land/x/deno/types.d.ts" />
// EvoPay PIX creation endpoint — called by the frontend when a user clicks "Comprar".
// Reads EVOPAY_TOKEN from Deno.env (Supabase secret) — NEVER hardcoded.
// Returns QR code data so the frontend can display it.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const EVOPAY_BASE = "https://api.evopay.cash/v1/pix";
const SUPABASE_FUNCTIONS_BASE =
  "https://ndawyrqzqhzbyjdmkdge.supabase.co/functions/v1";

interface CreatePixRequest {
  amount: number;
  packName: string;
  userEmail: string;
  userId: string;
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

    if (!body.amount || typeof body.amount !== "number" || body.amount <= 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "amount is required and must be > 0" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!body.packName || !body.userEmail || !body.userId) {
      return new Response(
        JSON.stringify({ ok: false, error: "packName, userEmail, and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

    // --- 3. Build EvoPay request ---
    const timestamp = Date.now();
    const clientReference =
      `shopesync-impulsionar-${body.userId}-${body.packName}-${timestamp}`;

    const evopayBody = {
      amount: body.amount,
      callbackUrl: `${SUPABASE_FUNCTIONS_BASE}/evopay-webhook`,
      clientReference,
      expiresIn: 1800, // 30 minutes
    };

    console.log("Creating PIX via EvoPay:", {
      amount: body.amount,
      clientReference,
      packName: body.packName,
      userId: body.userId,
    });

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
        clientReference,
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
