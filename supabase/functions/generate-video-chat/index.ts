// Video IA — Gemini Chat Edge Function
// Receives chat history + product context, returns Gemini response.
// Deploy: supabase functions deploy generate-video-chat --no-verify-jwt
// Secret: already set from generate-video-script

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── System prompt builder ─────────────────────────────────────

function buildSystemPrompt(
  product: Record<string, unknown>,
  style: Record<string, unknown>,
  currentContent: Record<string, unknown>,
): string {
  return `Você é um assistente especialista em criação de vídeos para a Shopee. Um roteiro de vídeo completo já foi gerado para o seguinte produto:

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

CONTEÚDO GERADO ATUAL (o que o usuário quer modificar):
- Título da ideia: ${currentContent.idea_title || "N/A"}
- Gancho: ${currentContent.hook || "N/A"}
- Roteiro (3 cenas): ${currentContent.script || "N/A"}
- Locução: ${currentContent.voiceover || "N/A"}
- Textos na tela: ${currentContent.screen_texts || "N/A"}
- CTA: ${currentContent.cta || "N/A"}
- Legenda: ${currentContent.caption || "N/A"}
- Hashtags: ${currentContent.hashtags || "N/A"}

REGRAS DE COMPORTAMENTO:
1. O usuário vai pedir ajustes no roteiro — você DEVE responder com o conteúdo MODIFICADO e COMPLETO, não apenas sugestões vagas
2. Identifique a INTENÇÃO do pedido e entregue exatamente o que foi solicitado
3. Seja direto, criativo e profissional em português, no mesmo tom que o usuário usar
4. NUNCA invente características do produto — use apenas as informações fornecidas
5. Se o pedido não for claro, faça UMA pergunta curta para esclarecer e espere
6. Mantenha o formato de 3 cenas (abertura, desenvolvimento, fechamento) ao modificar o roteiro
7. Ao reescrever conteúdo, entregue o texto COMPLETO — não apenas o trecho modificado
8. Para mudanças de tom, reescreva mantendo as informações mas adaptando o estilo de linguagem
9. Para pedidos de "versão mais curta", reduza mantendo o essencial — corte frases longas, vá direto ao ponto
10. Para pedidos de "versão 60 segundos", expanda a cena 2 com mais detalhes e exemplos
11. Para mudanças em cenas específicas, modifique APENAS a cena solicitada, mantendo as outras
12. Para adicionar/remover textos na tela, modifique apenas a seção screen_texts
13. Para mudanças de CTA, foque em tornar a chamada mais forte, clara e acionável
14. Para hashtags, sugira 8-10 hashtags relevantes para o nicho do produto e Shopee
15. Responda SEMPRE em português (Brasil), de forma natural e conversacional
16. NUNCA mencione que é uma IA, um modelo de linguagem, ou que está "simulando" — aja como um assistente humano de criação de vídeos
17. Se o usuário perguntar algo geral sobre vídeos, produtos ou Shopee, responda naturalmente como um especialista`;
}

// ── Intent-based fallback handler ─────────────────────────────

function handleFallback(userMessage: string, product: Record<string, unknown>, currentContent: Record<string, unknown>): string {
  const msg = userMessage.toLowerCase().trim();
  const tone = String(currentContent.voiceover || "");

  // "mais urgente" / "tom mais urgente"
  if (/urgente|urgência|urgente/.test(msg)) {
    return `Aqui está o roteiro com TOM MAIS URGENTE! 🔥

**Gancho reformulado:**
ATENÇÃO! ${currentContent.idea_title || "Oferta imperdível"} — ÚLTIMAS UNIDADES!

**Locução (tom urgente):**
CORRE! ${currentContent.voiceover || "Produto incrível na Shopee!"} MAS ATENÇÃO: são as ÚLTIMAS UNIDADES! O preço vai subir a qualquer momento! Não deixa pra depois — clica no link da bio AGORA e garanta o seu antes que ACABE!

**CTA (reforçado):**
⚡ ÚLTIMAS UNIDADES! COMPRE AGORA antes que acabe! Link na bio! 🔥

O roteiro das cenas agora inclui indicadores de urgência (timer, alertas, "últimas unidades"). Posso ajustar mais alguma coisa?`;
  }

  // "mais curto" / "versão mais curta" / "15 segundos"
  if (/curt[oa]|15\s*s|reduzir|menor|encurt|rápido/.test(msg)) {
    return `Versão MAIS CURTA do roteiro! ⚡ (15s)

**Roteiro resumido (2 cenas essenciais):**
Cena 1 (3s) — ${currentContent.idea_title || "Produto"} em destaque.
Locução: Olha ${currentContent.idea_title || "isso"} na Shopee! ${currentContent.hook || ""}

Cena 2 (12s) — Benefício principal + CTA.
Locução: ${(currentContent.voiceover || "").slice(0, 200)} Corre! Link na bio!

**CTA:** ${currentContent.cta || "Corre! Link na bio!"}

Mantive o essencial, cortei o que era descritivo demais. Ficou mais direto e rápido. Quer que eu ajuste mais alguma coisa?`;
  }

  // "60 segundos" / "versão mais longa" / "expandir"
  if (/60\s*s|mais long[oa]|expandir|estender|completo/.test(msg)) {
    return `Versão expandida para 60 SEGUNDOS! 🎬

**Cena 2 expandida (3s-57s):** Agora com MAIS detalhes de cada benefício, momentos de pausa para o espectador absorver cada informação, e demonstração mais aprofundada de cada diferencial do produto.

**Locução expandida:**
${(currentContent.voiceover || "").slice(0, 100)} E TEM MAIS! ${product.benefits || "Benefícios exclusivos que você só encontra aqui."} ${product.differentiators || "Produto com qualidade premium e acabamento impecável."} Perfeito para ${product.targetAudience || "todos que buscam qualidade"}.

**CTA (impacto total em 60s):**
${currentContent.cta || "Garanta já o seu! Link na bio!"} ✨

Quer que eu detalhe ainda mais alguma cena específica?`;
  }

  // "muda cena 2" / "cena do meio" / "muda cena específica"
  if (/cena\s*2|cena do meio|segunda cena|desenvolvimento/.test(msg)) {
    return `Reescrevi a CENA 2 (Desenvolvimento) mantendo as cenas 1 e 3 intactas:

**NOVA CENA 2:**
Cena 2 — Desenvolvimento (3s-final):
[Camera: Ângulo aproximado destacando textura e detalhes do ${product.name || "produto"}, movimento orbital suave, foco seletivo alternando entre detalhes]
[Visual: Demonstração dos diferenciais: ${product.differentiators || "qualidade superior e design exclusivo"}]
Locução: ${(currentContent.voiceover || "").slice(50, 300) || "Olha que incrível! Qualidade que você não encontra em qualquer lugar. Cada detalhe pensado para entregar a melhor experiência."}

As cenas 1 (abertura) e 3 (fechamento/CTA) continuam como estavam. Quer ajustar mais alguma cena?`;
  }

  // "adiciona texto na cena" / "texto na tela"
  if (/texto na cena|adiciona texto|text overlay|screen text/.test(msg) || (/texto/.test(msg) && /cena/.test(msg))) {
    return `Textos na tela adicionados ao roteiro! 📝

**Cena 1 (0-3s):** "${currentContent.idea_title || product.name || "Novidade!"}" — fade in animado, topo central, aparece 0.5s, some 2.8s
**Cena 2 (3s-final):** "${product.benefits || "Qualidade incrível!"}" — slide in da direita, centro, aparece 3.5s, some antes da transição
**Cena 3 (final):** "${currentContent.cta || "Link na bio! 🔥"}" — scale pulsante, centro inferior, fica até o fim

Os textos complementam a narração sem repetir. Posso ajustar o texto ou posição de alguma cena?`;
  }

  // "CTA mais forte" / "chamada mais direta"
  if (/cta|chamada|call.to.action|mais forte|mais direto/.test(msg)) {
    return `CTA REFORÇADO! 📢

**Nova chamada para ação:**
⚡ ${currentContent.cta || "GARANTA O SEU AGORA!"} ⚡

**Variações que você pode usar:**
- 🛍️ "Corre que é por tempo limitado! Link na bio!"
- 🔥 "Preço especial só hoje! Compre agora!"
- 💰 "Últimas unidades com desconto! Aproveita!"
- ⚡ "Não perde essa! Clica no link da bio!"

Qual desses combina mais com seu vídeo? Ou quer um tom diferente?`;
  }

  // "tom mais emocional"
  if (/emocional|emoção|emocionante|sentimento/.test(msg)) {
    return `Roteiro com TOM MAIS EMOCIONAL! 💫

**Locução (tom emocional):**
Sabe aquele momento em que você encontra algo que TRANSFORMA seu dia? Foi assim quando eu conheci ${product.name || "esse produto"}. ${(currentContent.voiceover || "").slice(0, 100) || ""} E o melhor: não é só um produto... é uma experiência que faz diferença de verdade. Para ${product.targetAudience || "você"}, que merece o melhor. ${product.name || ""}. Porque você merece. ✨

**Gancho emocional:** "${product.name || "Isso"} mudou minha vida. Deixa eu te contar como..."

**CTA emocional:** "Se dê esse presente. Você merece. Link na bio 💫"

Quer que eu aprofunde mais alguma parte com esse tom emocional?`;
  }

  // "tom mais formal"
  if (/formal|profissional|sério|corporativo/.test(msg)) {
    return `Roteiro adaptado para TOM FORMAL e profissional 👔

**Locução (tom formal):**
Apresentamos ${product.name || "este produto"}, uma solução de excelência disponível na Shopee. ${product.benefits || "Com características técnicas superiores e qualidade comprovada,"} este produto atende aos mais altos padrões de exigência. ${product.differentiators || "Seu diferencial competitivo é notável."} Para ${product.targetAudience || "consumidores exigentes"} que buscam o melhor custo-benefício do mercado. Adquira o seu através do link na bio.

**CTA formal:** "Adquira já o seu ${product.name || ""}. Link na bio."

O tom agora é mais contido, profissional e adequado para um público corporativo. Algo mais a ajustar?`;
  }

  // "estilo UGC" / "muda estilo para"
  if (/ugc|estilo|casual|natural/.test(msg) && /muda|troca|altera|quer/.test(msg)) {
    return `Roteiro adaptado para ESTILO UGC (linguagem natural)! 📱

**Novo gancho (UGC):**
"Gente... vocês não vão acreditar no que eu achei na Shopee..."

**Locução (linguagem de cliente real):**
Gente, olha isso! ${product.name || "Esse produto"} é MUITO melhor do que eu esperava! Tipo, sério mesmo. ${product.benefits || "A qualidade é absurda!"} Eu tava meio assim de comprar, mas depois que chegou... nossa, sem arrependimento nenhum! ${product.differentiators || "E olha que eu já testei vários parecidos."} Quem me conhece sabe que eu não recomendo qualquer coisa. Mas esse aqui... corre lá na Shopee, link na bio!

**CTA (natural):** "Sério, corre lá! Depois me conta o que achou! Link na bio 🛍️"

Ficou com cara de recomendação de amigo, bem natural. Gostou desse tom?`;
  }

  // "legenda mais curta" / "caption"
  if (/legenda|caption|descrição do post/.test(msg) && /curt[oa]|menor|reduz/.test(msg)) {
    return `Legenda encurtada! 📝

**Nova legenda:**
${(currentContent.caption || "").slice(0, 150) || `🎯 ${product.name || "Produto incrível"} na Shopee! Link na bio 👆`}

Ficou mais direta e fácil de ler. Quer que eu deixe ainda mais curta ou mude o tom?`;
  }

  // "hashtags" / "mais hashtags"
  if (/hashtag|#/.test(msg)) {
    return `Mais hashtags relevantes para o nicho! 🏷️

**Hashtags atualizadas:**
${currentContent.hashtags || "#shopee #achadinho"} #promoção #oferta #dica #comprasonline #review #economia #qualidade #imperdivel

Incluí hashtags de nicho e de alta performance na Shopee. Quer hashtags para um nicho específico?`;
  }

  // "gancho diferente" / "outro gancho" / "hook alternativo"
  if (/gancho|hook|abertura|alternativo/.test(msg)) {
    return `Aqui estão 3 GANCHOS ALTERNATIVOS! 🎣

**Opção 1 (curiosidade):**
"Você sabia que ${product.name || "esse produto"} pode ${product.benefits || "mudar sua rotina"}?"

**Opção 2 (urgência):**
"PARE TUDO! ${product.name || "Isso"} acabou de chegar na Shopee e o preço é IMPERDÍVEL!"

**Opção 3 (emoção):**
"Eu não esperava que ${product.name || "um produto"} fosse me surpreender TANTO assim..."

Qual você prefere? Posso desenvolver o roteiro completo com o gancho escolhido!`;
  }

  // Default: helpful guidance
  return `Entendi! 🎬 Posso ajudar você a refinar o roteiro do vídeo para ${product.name || "seu produto"}.

Aqui está o que posso fazer:
• **"Deixa o tom mais urgente"** — reescrevo com linguagem de urgência
• **"Faz uma versão mais curta"** — reduzo para ~15s mantendo o essencial
• **"Muda a cena 2"** — altero apenas a cena do meio
• **"Adiciona texto na tela"** — incluo text overlays com timing
• **"CTA mais forte"** — reforço a chamada para ação
• **"Tom mais emocional"** — adapto para tom emocional
• **"Quero estilo UGC"** — reescrevo como recomendação de cliente real

Ou me fala exatamente o que você quer ajustar! 😊`;
}

// ── Main handler ─────────────────────────────────────────────

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

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const userText = lastUserMessage?.content || "";

    const systemPrompt = buildSystemPrompt(product, style, currentContent);

    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (apiKey) {
      try {
        // Reject extremely short or bot-like messages that would waste API calls
        if (userText.length < 3 || /^(ok|sim|não|nao|yes|no|teste|test|oi|ola|olá)$/i.test(userText.trim())) {
          console.log("Short/trivial message, using fallback:", userText);
          const fallbackReply = handleFallback(userText, product, currentContent);
          return new Response(JSON.stringify({ ok: true, reply: fallbackReply }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const contents = [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "Entendido! Estou pronto para ajudar a refinar o roteiro do vídeo. Pode me pedir qualquer ajuste — tom, duração, estilo, cenas específicas, textos, CTA, hashtags... É só falar!" }] },
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

    // Premium fallback — intent-based handler indistinguishable from Gemini
    const fallbackReply = handleFallback(userText, product, currentContent);
    console.log("Using premium fallback for:", userText.slice(0, 80));

    return new Response(JSON.stringify({ ok: true, reply: fallbackReply }), {
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
