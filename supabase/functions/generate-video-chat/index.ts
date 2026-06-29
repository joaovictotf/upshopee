// Video IA — Gemini Chat Edge Function
// Receives chat history + product context, returns Gemini response.
// Deploy: supabase functions deploy generate-video-chat --no-verify-jwt
// Secret: supabase secrets set GEMINI_API_KEY="your-key" (already set from generate-video-script)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(product: Record<string, unknown>, style: Record<string, unknown>, currentContent: Record<string, unknown>): string {
  return `Você é um assistente especialista em criação de vídeos para a Shopee. Um roteiro de vídeo já foi gerado para o seguinte produto:

PRODUTO:
- Nome: ${product.name || "N/A"}
- Descrição: ${product.description || "N/A"}
- Benefícios: ${product.benefits || "N/A"}
- Público-alvo: ${product.targetAudience || "Geral"}
- Diferenciais: ${product.differentiators || "N/A"}
- Problema que resolve: ${product.problemSolved || "N/A"}

ESTILO DO VÍDEO:
- Estilo: ${style.style || "N/A"}
- Duração: ${style.duration || "30s"}
- Voz: ${style.voiceType || "N/A"}
- Tom: ${style.tone || "N/A"}
- Textos na tela: ${style.hasText ? "Sim" : "Não"}
- Música de fundo: ${style.hasMusic ? "Sim" : "Não"}

CONTEÚDO GERADO ATUAL:
- Título: ${currentContent.idea_title || "N/A"}
- Gancho: ${currentContent.hook || "N/A"}
- Roteiro: ${currentContent.script || "N/A"}
- Locução: ${currentContent.voiceover || "N/A"}
- Textos na tela: ${currentContent.screen_texts || "N/A"}
- CTA: ${currentContent.cta || "N/A"}
- Legenda: ${currentContent.caption || "N/A"}
- Hashtags: ${currentContent.hashtags || "N/A"}

REGRAS:
1. O usuário vai pedir ajustes no roteiro — você DEVE responder com o conteúdo MODIFICADO, não apenas sugestões
2. Se o usuário pedir "tom mais urgente", reescreva o roteiro com tom urgente
3. Se o usuário pedir "versão mais curta", encurte mantendo o essencial
4. Se o usuário pedir mudanças em uma cena específica, modifique APENAS aquela cena
5. Sempre retorne o conteúdo COMPLETO (não só o trecho modificado) quando o usuário pedir alterações no roteiro
6. Mantenha o formato: 3 cenas (abertura, desenvolvimento, fechamento)
7. Seja direto, criativo e profissional
8. Responda em português, no mesmo tom que o usuário usar
9. NUNCA invente características do produto — use apenas as informações fornecidas
10. Se o usuário fizer perguntas gerais sobre o produto ou vídeos, responda naturalmente`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const messages: ChatMessage[] = body.messages || [];
    const product = body.product || {};
    const style = body.style || {};
    const currentContent = body.currentContent || {};

    if (!messages.length) {
      return new Response(JSON.stringify({ ok: false, error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = buildSystemPrompt(product, style, currentContent);

    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (apiKey) {
      try {
        // Build Gemini messages array: system prompt + conversation history
        const contents = [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "Entendido! Estou pronto para ajudar a refinar o roteiro do vídeo. Pode me pedir qualquer ajuste." }] },
          ...messages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          })),
        ];

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);

        const geminiRes = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.9,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
              },
            }),
            signal: controller.signal,
          },
        );

        clearTimeout(timeout);

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (text) {
            console.log("Chat Gemini success, response length:", text.length);
            return new Response(JSON.stringify({ ok: true, reply: text }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          const errText = await geminiRes.text();
          console.error("Chat Gemini error:", geminiRes.status, errText.slice(0, 300));
        }
      } catch (geminiErr) {
        console.error("Chat Gemini call failed:", geminiErr);
      }
    } else {
      console.log("No GEMINI_API_KEY set, using fallback");
    }

    // Fallback
    return new Response(JSON.stringify({
      ok: true,
      reply: "Desculpe, o assistente de IA está temporariamente indisponível. Mas você já tem um roteiro completo gerado! Use os botões abaixo para copiar o prompt final ou voltar e editar manualmente. Tente novamente em alguns instantes.",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Chat fatal error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
