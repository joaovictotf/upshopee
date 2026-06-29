// Video IA — Gemini script generation Edge Function
// Receives product info + style config, calls Gemini API, returns generated video script.
// Deploy: supabase functions deploy generate-video-script --no-verify-jwt
// Secret: supabase secrets set GEMINI_API_KEY="your-key"

// Inline CORS headers (no external imports — self-contained)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

// ── Types ────────────────────────────────────────────────────

interface GeneratedContent {
  idea_title: string;
  hook: string;
  script: string;
  voiceover: string;
  screen_texts: string;
  cta: string;
  caption: string;
  hashtags: string;
  final_prompt: string;
}

// ── Style & tone labels ──────────────────────────────────────

const STYLE_LABELS: Record<string, string> = {
  "produto-destaque": "Produto em destaque — foco total no produto, close-ups, iluminação profissional, gira o produto mostrando todos os ângulos",
  "oferta-rapida": "Oferta rápida — ritmo acelerado, preço na tela, senso de urgência, textos piscando, contagem regressiva",
  "problema-solucao": "Problema e solução — mostre o problema primeiro (frustração), depois o produto como solução (alívio/felicidade)",
  "demonstracao": "Demonstração — mostre o produto sendo usado na prática, resultados visíveis, comparação antes/depois rápida",
  "unboxing": "Unboxing — abrindo a embalagem, primeiras impressões, close nos detalhes, reação genuína de surpresa",
  "ugc": "Estilo UGC (User Generated Content) — parece gravado por um cliente real, cenário caseiro, linguagem natural, selfie, menos produzido",
  "cinematografico": "Cinematográfico — takes artísticos, câmera lenta, transições suaves, música emotiva, visual premium",
  "achadinho": "Achadinho da Shopee — tom de descoberta, 'olha o que eu achei', empolgação, preço baixo, sensação de garimpo",
  "antes-depois": "Antes e depois — comparação dramática, tela dividida, revelação impactante, contraste forte entre sem/com produto",
  "narracao": "Narração — voz em off profissional conta a história, imagens ilustram, tom documental ou comercial",
  "texto-tela": "Texto na tela — sem locução, comunicação 100% por textos animados, ritmo rápido, estilo TikTok trends",
  "sem-fala": "Vídeo sem fala — apenas música e imagens, foco total no visual, demonstração silenciosa do produto",
  "promocao": "Vídeo para promoção — foco em desconto/queima de estoque, banners de preço, urgência, 'só hoje', chamadas agressivas",
};

const TONE_LABELS: Record<string, string> = {
  formal: "Formal — linguagem profissional, sério, confiável, sem gírias, tom de apresentação corporativa",
  casual: "Casual — linguagem do dia a dia, amigável, como se estivesse conversando com um amigo, gírias leves permitidas",
  entusiasmado: "Entusiasmado — alta energia, empolgação contagiante, muitas exclamações, tom de 'isso é incrível!'",
  urgente: "Urgente — senso de escassez e pressa, 'últimas unidades', 'não perca tempo', tom de alerta e ação imediata",
  emocional: "Emocional — apela para sentimentos, storytelling emotivo, conexão pessoal, tom de transformação de vida",
};

const VOICE_LABELS: Record<string, string> = {
  masculina: "voz masculina",
  feminina: "voz feminina",
  "sem-voz": "sem narração (apenas música e efeitos sonoros)",
};

// ── Prompt builder ───────────────────────────────────────────

function buildPrompt(
  product: Record<string, string>,
  style: Record<string, string | boolean>,
): string {
  const durationSec = parseInt(String(style.duration || "30")) || 30;
  const styleDesc = STYLE_LABELS[String(style.style)] || style.style;
  const toneDesc = TONE_LABELS[String(style.tone)] || style.tone;
  const voiceDesc = VOICE_LABELS[String(style.voiceType)] || style.voiceType;
  const hasText = style.hasText === true || style.hasText === "true";
  const hasMusic = style.hasMusic === true || style.hasMusic === "true";

  return `Você é um dos melhores criadores de vídeos da Shopee. Crie um roteiro de vídeo incrível.

## INFORMAÇÕES DO PRODUTO
- Nome: ${product.name || ""}
- Descrição: ${product.description || ""}
- Benefícios: ${product.benefits || ""}
- Público-alvo: ${product.targetAudience || "Geral"}
- Diferenciais: ${product.differentiators || "Não especificado"}
- Problema que resolve: ${product.problemSolved || "Não especificado"}

## CONFIGURAÇÃO DO VÍDEO (ESCOLHAS DO USUÁRIO)
- ESTILO: ${styleDesc}
- DURAÇÃO: ${durationSec} segundos
- VOZ: ${voiceDesc}
- TOM: ${toneDesc}
- TEXTOS NA TELA: ${hasText ? "SIM — incluir textos sobrepostos em cada cena" : "NÃO — sem textos na tela"}
- MÚSICA DE FUNDO: ${hasMusic ? "SIM — sugerir estilo musical para cada cena" : "NÃO — sem música, apenas voz ou silêncio"}

## REGRAS PARA O ROTEIRO
1. O vídeo é formato 9:16 VERTICAL (TikTok/Reels/Shopee)
2. EXATAMENTE 3 cenas: abertura (3s) → desenvolvimento (${durationSec - 6}s) → fechamento (3s)
3. O GANCHO INICIAL precisa prender nos PRIMEIROS 2 SEGUNDOS
4. Linguagem direta e persuasiva, frases curtas e impactantes
5. CTA (call-to-action) forte e claro no final
6. NÃO invente características do produto — mantenha precisão total
7. Adapte TUDO ao estilo escolhido: "${String(style.style)}"
8. Adapte TUDO ao tom escolhido: "${String(style.tone)}"
9. O texto na tela deve COMPLEMENTAR a narração, nunca repetir
10. Hashtags relevantes para Shopee e para o nicho do produto

## FORMATO DA RESPOSTA (APENAS JSON, sem markdown, sem explicações)

{
  "idea_title": "título chamativo e criativo (max 80 caracteres)",
  "hook": "frase de abertura que prende nos primeiros 2-3 segundos (max 150 caracteres)",
  "script": "Cena 1 (abertura - 3s): [descrição visual detalhada + direção de câmera]\\nLocução: [texto]\\n\\nCena 2 (desenvolvimento - ${durationSec - 6}s): [demonstração/prova social/benefícios]\\nLocução: [texto]\\n\\nCena 3 (fechamento - 3s): [CTA + produto + urgência]\\nLocução: [texto]",
  "voiceover": "texto completo da narração corrida, pronto pra gravar (apenas a fala, sem descrições)",
  "screen_texts": ${hasText ? '"Texto 1 (cena 1): [frase de impacto]\\nTexto 2 (cena 2): [preço/benefício]\\nTexto 3 (cena 3): [CTA]"' : '"sem textos na tela"'},
  "cta": "chamada para ação (ex: 'Compre agora! Link na bio! Frete grátis!')",
  "caption": "legenda para o post (2-3 linhas com emojis, max 300 caracteres)",
  "hashtags": "#shopee #[nicho1] #[nicho2] #[produto] #promoção #[estilo] #[categoria]",
  "final_prompt": "PROMPT COMPLETO para gerar este vídeo no Google Gemini Video. Inclua: formato 9:16, duração ${durationSec}s, descrição de cada cena com ângulos e movimentos, texto completo da narração, textos na tela, estilo de música, e restrições de precisão do produto."
}`;
}

// ── Parse Gemini response ────────────────────────────────────

function parseResponse(text: string): GeneratedContent {
  let cleaned = text.trim();

  // Strip code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  // Find JSON boundaries
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  const parsed = JSON.parse(cleaned);

  return {
    idea_title: String(parsed.idea_title || ""),
    hook: String(parsed.hook || ""),
    script: String(parsed.script || ""),
    voiceover: String(parsed.voiceover || ""),
    screen_texts: String(parsed.screen_texts || ""),
    cta: String(parsed.cta || ""),
    caption: String(parsed.caption || ""),
    hashtags: String(parsed.hashtags || ""),
    final_prompt: String(parsed.final_prompt || ""),
  };
}

// ── Fallback generation (when Gemini is unavailable) ─────────

function buildFallback(product: Record<string, string>, style: Record<string, string | boolean>): GeneratedContent {
  const hashtagProd = (product.name || "produto").toLowerCase().replace(/\s+/g, "");
  const durationSec = String(style.duration || "30");

  return {
    idea_title: `${product.name || "Produto"} — ${String(style.style || "destaque")}`,
    hook: `${product.name || "Confira"} — ${(product.benefits || "").slice(0, 80)}`,
    script: `Cena 1 (3s) - [Close no produto girando]: ${product.name || "Produto"} em destaque.\nLocução: Olha só o que eu encontrei na Shopee! ${product.name || ""} com preço imperdível!\n\nCena 2 (${Math.max(parseInt(durationSec) - 6, 10)}s) - [Uso do produto]: Mostre os benefícios.\nLocução: ${product.benefits || "Qualidade incrível"}. ${product.differentiators || "Super recomendo!"}\n\nCena 3 (3s) - [CTA final]: Tela com chamada pra ação.\nLocução: Corre que tá acabando! Link na bio!`,
    voiceover: `Olha só o que eu encontrei na Shopee! ${product.name || ""} com preço imperdível! ${product.benefits || "Qualidade incrível"}. ${product.differentiators || "Super recomendo!"} Corre que tá acabando! Link na bio!`,
    screen_texts: style.hasText ? `${product.name}\n${(product.benefits || "").slice(0, 40)}\nLINK NA BIO 🔥` : "sem textos na tela",
    cta: "Corre que tá acabando! Link na bio! 🔥",
    caption: `🎯 Achei na Shopee: ${product.name || "esse produto incrível"}! ${(product.description || "").slice(0, 100)}\n\nLink na bio 👆 #Shopee #Achadinho`,
    hashtags: `#shopee #achadinho #${hashtagProd} #promoção #oferta`,
    final_prompt: `Crie um vídeo 9:16 vertical de ${durationSec}s para ${product.name || "produto"}.\nDescrição: ${product.description || ""}\nBenefícios: ${product.benefits || ""}\n\n3 cenas: abertura → demonstração → CTA. Textos na tela e narração em português.`,
  };
}

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    const product = body.product || {};
    const style = body.style || {};

    if (!product.name || !product.description) {
      return new Response(
        JSON.stringify({ ok: false, error: "product.name and product.description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Generating script for:", product.name);
    console.log("Style:", JSON.stringify(style));

    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (apiKey) {
      try {
        const prompt = buildPrompt(product, style);
        console.log("Calling Gemini API...");

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
              contents: [{ parts: [{ text: prompt }] }],
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
            try {
              const content = parseResponse(text);
              console.log("Gemini success:", content.idea_title);
              return new Response(JSON.stringify({ ok: true, content }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            } catch (parseErr) {
              console.error("Failed to parse Gemini response:", parseErr);
              console.log("Raw text:", text.slice(0, 500));
            }
          }
        } else {
          const errText = await geminiRes.text();
          console.error("Gemini API error:", geminiRes.status, errText.slice(0, 300));
        }
      } catch (geminiErr) {
        console.error("Gemini call failed:", geminiErr);
      }
    } else {
      console.log("No GEMINI_API_KEY set, using fallback");
    }

    // Fallback — always returns useful content
    const fallback = buildFallback(product, style);
    console.log("Returning fallback content");

    return new Response(JSON.stringify({ ok: true, content: fallback }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Fatal error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
