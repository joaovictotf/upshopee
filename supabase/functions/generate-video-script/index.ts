/// <reference types="https://deno.land/x/deno/types.d.ts" />
// Video IA — Gemini script generation Edge Function
// Receives product info + style config, calls Gemini API, returns generated video script.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// ── Types ────────────────────────────────────────────────────

interface ProductInfo {
  name: string;
  description: string;
  benefits: string;
  targetAudience?: string;
  differentiators?: string;
  problemSolved?: string;
  url?: string;
}

interface StyleConfig {
  style: string;
  duration: string;
  voiceType: string;
  tone: string;
  hasText: boolean;
  hasMusic: boolean;
}

interface GenerateRequest {
  product: ProductInfo;
  style: StyleConfig;
}

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

// ── Gemini API call ──────────────────────────────────────────

async function callGemini(
  apiKey: string,
  product: ProductInfo,
  style: StyleConfig,
): Promise<GeneratedContent> {
  const prompt = buildPrompt(product, style);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    },
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini API");

  return parseResponse(text);
}

// ── Prompt builder ───────────────────────────────────────────

function buildPrompt(product: ProductInfo, style: StyleConfig): string {
  const durationSec = parseInt(style.duration) || 30;

  return `Você é um especialista em marketing e criação de vídeos para Shopee (marketplace).

Crie um roteiro de vídeo para o seguinte produto:

**Produto:** ${product.name}
**Descrição:** ${product.description}
**Benefícios:** ${product.benefits}
${product.targetAudience ? `**Público-alvo:** ${product.targetAudience}` : ""}
${product.differentiators ? `**Diferenciais:** ${product.differentiators}` : ""}
${product.problemSolved ? `**Problema que resolve:** ${product.problemSolved}` : ""}

**Configuração do vídeo:**
- Estilo: ${style.style}
- Duração: ${style.duration} segundos
- Voz: ${style.voiceType}
- Tom: ${style.tone}
- Com textos na tela: ${style.hasText ? "Sim" : "Não"}
- Com música de fundo: ${style.hasMusic ? "Sim" : "Não"}

**Regras:**
1. O roteiro deve ter EXATAMENTE 3 cenas (abertura, desenvolvimento, fechamento)
2. A linguagem deve ser direta, persuasiva e adequada para Shopee
3. Use frases curtas e impactantes (estilo anúncio de marketplace)
4. O vídeo deve ter cerca de ${durationSec} segundos no total
5. Inclua uma chamada para ação (CTA) clara no final
6. As hashtags devem ser relevantes para o produto e para a Shopee
7. O texto na tela deve complementar a narração, não repeti-la

**IMPORTANTE:** Retorne APENAS um JSON válido (sem markdown, sem explicações adicionais) neste formato exato:

{
  "idea_title": "Título criativo e chamativo para o vídeo (max 80 caracteres)",
  "hook": "Frase de abertura que prende a atenção nos primeiros 3 segundos (max 150 caracteres)",
  "script": "Cena 1 (abertura): [descreva a cena visual e a ação]\\n\\nCena 2 (desenvolvimento): [mostre o produto em uso, destaque benefícios]\\n\\nCena 3 (fechamento): [CTA final, oferta, urgência]",
  "voiceover": "Texto completo da narração/locução que acompanha cada cena",
  "screen_texts": "${style.hasText ? "Texto 1: [sobreposição cena 1]\\nTexto 2: [sobreposição cena 2]\\nTexto 3: [sobreposição cena 3]" : "vazio"}",
  "cta": "Chamada para ação final (ex: 'Compre agora com frete grátis!', 'Link na descrição!')",
  "caption": "Legenda completa para o post do vídeo (2-3 frases com emojis, max 300 caracteres)",
  "hashtags": "#shopee #[palavrachave1] #[palavrachave2] #[palavrachave3] #[palavrachave4] #[palavrachave5] #[palavrachave6]",
  "final_prompt": "Prompt completo otimizado para gerar este vídeo no Google Gemini Video. Inclua todas as instruções visuais, textuais e de áudio necessárias para que o Gemini produza o vídeo final. O prompt deve ser em português, detalhado, com especificações de cada cena, estilo visual, textos na tela, locução, música e duração."
}`;
}

// ── Response parser ──────────────────────────────────────────

function parseResponse(text: string): GeneratedContent {
  // Remove markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  // Validate required fields
  const required = [
    "idea_title",
    "hook",
    "script",
    "voiceover",
    "cta",
    "caption",
    "hashtags",
    "final_prompt",
  ];
  for (const key of required) {
    if (!parsed[key]) {
      throw new Error(`Missing required field in Gemini response: ${key}`);
    }
  }

  return {
    idea_title: String(parsed.idea_title),
    hook: String(parsed.hook),
    script: String(parsed.script),
    voiceover: String(parsed.voiceover),
    screen_texts: String(parsed.screen_texts || ""),
    cta: String(parsed.cta),
    caption: String(parsed.caption),
    hashtags: String(parsed.hashtags),
    final_prompt: String(parsed.final_prompt),
  };
}

// ── Main handler ─────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse body
    const body: GenerateRequest = await req.json();

    if (!body.product?.name) {
      return new Response(
        JSON.stringify({ ok: false, error: "product.name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!body.style) {
      return new Response(
        JSON.stringify({ ok: false, error: "style config is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Read Gemini API key from secret
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY secret is not set");
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error: GEMINI_API_KEY not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Generating video script for:", body.product.name);
    console.log("Style:", body.style.style, "| Duration:", body.style.duration);

    // Call Gemini
    const content = await callGemini(apiKey, body.product, body.style);

    console.log("Script generated successfully:", content.idea_title);

    return new Response(
      JSON.stringify({ ok: true, content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error in generate-video-script:", err);

    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("Missing required") ? 422 : 500;

    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
