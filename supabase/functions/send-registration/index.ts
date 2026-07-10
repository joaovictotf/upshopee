// UpShopee — Registration Form Proxy Edge Function
// Proxies form data from the Video IA registration step to Google Sheets.
// Deploy: supabase functions deploy send-registration --no-verify-jwt
// CORS is bypassed because the fetch to Google Script is server-side.

const GOOGLE_SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbwcQgsGcAR92aN_S2xQSzxhbE1NA6ANuOJRjTumTHCT5nYCMpUksKWDWKYfq7xqh8Ea/exec";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();

    // Validate required fields
    const required = ["nome", "cpf", "celular", "tiktok", "email", "produto"];
    for (const field of required) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({ ok: false, error: `Campo obrigatório ausente: ${field}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Forward to Google Sheets (server-side — no CORS)
    const payload = JSON.stringify(body);
    const sheetRes = await fetch(GOOGLE_SHEETS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(payload.length),
      },
      body: payload,
    });

    const text = await sheetRes.text();

    // Try to parse JSON response from Google Script
    let sheetData: unknown;
    try {
      sheetData = JSON.parse(text);
    } catch {
      // Google Script may return HTML on error
      if (!sheetRes.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: `Google Sheets retornou erro ${sheetRes.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      sheetData = { received: true };
    }

    return new Response(
      JSON.stringify({ ok: true, sheetResponse: sheetData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
