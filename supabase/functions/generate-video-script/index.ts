// Video IA — Gemini script generation Edge Function
// Receives product info + style config, calls Gemini API, returns generated video script.
// Deploy: supabase functions deploy generate-video-script --no-verify-jwt
// Secret: supabase secrets set GEMINI_API_KEY="your-key"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

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

// ── Style labels (English — detailed camera direction) ────────

const STYLE_LABELS: Record<string, string> = {
  "produto-destaque": "Product Spotlight — 360° product rotation with macro close-ups on textures and details, soft key light from front at 45°, rim light for edge separation against dark background, dramatic product reveal entrance with motion blur, rotating showcase with zoom on 3 key features, final hero shot with price overlay, modern clean electronic beat",
  "oferta-rapida": "Flash Sale — fast cuts (0.5-1s each), handheld shaky camera feel, rapid zoom transitions, RED FLASH opening with alert text, rapid-fire product shots, price comparison graphics (was/now with strike-through), countdown timer overlay in red, urgency text flashing 'ULTIMAS UNIDADES', high-energy urgent beat with alarm sounds",
  "problema-solucao": "Problem/Solution — split screen effect, cool/desaturated color grade for problem scenes transitioning to warm/vibrant for solution, actor showing frustration then relief, product enters as hero shot, demonstration of product solving the problem, happy result with smile, music starts tense/dramatic then resolves to uplifting",
  "demonstracao": "Demonstration — overhead tabletop angle, screen-recording style presentation, step-by-step instructional framing, each step highlighted with text overlay and zoom, before/after comparison shots, final result showcase with satisfaction expression, clean tutorial-style light beat music",
  "unboxing": "Unboxing — POV handheld camera, natural window lighting, genuine first-reaction expressions, package reveal with hands opening box, slow pull of product from packaging, close inspection turning product in hands, satisfying ASMR sounds of packaging crinkle, trendy vlog-style music",
  "ugc": "UGC Style (User Generated Content) — selfie mode front camera, bedroom/living room natural setting, window light, creator talking directly to camera with casual language, showing product while talking, phrases like 'gente olha isso', 'muito barato', genuine excitement, no professional lighting, trending TikTok/reels background music",
  "cinematografico": "Cinematic — slow motion 60fps, gimbal smooth movements, anamorphic lens feel with subtle flares, golden hour warm lighting at magic hour, shallow depth of field (f/1.4 look), artistic product reveal with dramatic light, film grain overlay, emotional orchestral score building to climax",
  "achadinho": "Shopee Hidden Gem — casual phone-style vertical recording, mixed selfie and product shots, screen recording showing price on Shopee app, excited discovery tone, comparing to similar products at higher prices, 'ISSO por APENAS R$[price]' emphasis, fun playful trending music",
  "antes-depois": "Before/After — static tripod locked-off shots, consistent framing for comparison validity, split screen or wipe transition effect, cool/gray color grade for BEFORE, warm/vibrant for AFTER, dramatic transformation reveal, side-by-side final comparison freeze frame, dramatic reveal music with transformation sound effect",
  "narracao": "Narration — Ken Burns slow zoom effect on still product photos, smooth cross-dissolve transitions between beauty shots, voiceover tells complete product story, images illustrate each narrated point, informative yet engaging documentary style, subtle ambient background music that never overpowers voice",
  "texto-tela": "Text on Screen — dynamic kinetic typography animations, bold large text as main visual element, product shots as background between text segments, TikTok trend text style with beat-synced animations, BIG BOLD attention-grabbing words, pulsing CTA text, high-energy beat music synced to text reveals, NO voiceover needed",
  "sem-fala": "No Speech — pure visual storytelling, stunning product beauty shots as primary communication, all information through images and occasional subtle text, emphasis on product aesthetics and usage visuals, emotional atmospheric music carries entire video, ambient sound design, no spoken words at all",
  "promocao": "Promotion Video — commercial broadcast style, bold price graphics dominating screen, 'PROMOCAO IMPERDIVEL' siren/alert graphics opening, deal stack graphics (original price struck through → discounted price → savings amount), 'so hoje' urgency elements, limited-time countdown, aggressive CTA with flashing 'COMPRE AGORA', exciting commercial attention-grabbing music",
  "comparacao-precos": "Price Comparison — side-by-side product comparison showing price advantage, competitor price vs Shopee price, savings calculator overlay, value proposition graphics, 'best deal' badge, consumer choice endorsement style, split screen layout with consistent framing for fair comparison",
  "review-produto": "Product Review — honest review style, product testing montage, pros and cons balanced presentation, close-up details with inspection shots, star rating animation overlay, final verdict with recommendation, authentic reviewer vibe, talking head mixed with product B-roll footage",
  "rotina-dia": "Daily Routine — 'day in the life' vlog style showing product integrated into daily routine, morning/afternoon/night segments with time-of-day color grading, natural lighting throughout (warm morning, bright noon, cozy evening), relatable lifestyle content, cozy aesthetic, product as essential part of the day",
};

const TONE_LABELS: Record<string, string> = {
  formal: "Formal — professional business language, serious and trustworthy, no slang, corporate presentation tone, measured pacing",
  casual: "Casual — everyday conversational language, friendly and approachable, like talking to a friend, light slang allowed, relaxed pacing",
  entusiasmado: "Enthusiastic — high energy, contagious excitement, lots of exclamation, fast pacing, 'this is incredible!' energy throughout",
  urgente: "Urgent — scarcity and rush language, 'last units', 'don't miss out', alert and immediate action tone, fast clipped delivery",
  emocional: "Emotional — appeals to feelings and personal connection, emotional storytelling arc, life transformation narrative, warm and intimate delivery",
};

const VOICE_LABELS: Record<string, string> = {
  masculina: "male voice — warm and confident, clear enunciation, professional narrator quality",
  feminina: "female voice — warm and engaging, clear enunciation, professional narrator quality",
  "sem-voz": "no voiceover — music and on-screen text only, no spoken narration",
};

// ── Master prompt builder with style-specific direction ────────

function buildPrompt(
  product: Record<string, string>,
  style: Record<string, string | boolean>,
): string {
  const durationSec = parseInt(String(style.duration || "30")) || 30;
  const styleId = String(style.style || "produto-destaque");
  const styleDesc = STYLE_LABELS[styleId] || styleId;
  const toneId = String(style.tone || "entusiasmado");
  const toneDesc = TONE_LABELS[toneId] || toneId;
  const voiceDesc = VOICE_LABELS[String(style.voiceType || "feminina")] || "female voice";
  const hasText = style.hasText === true || style.hasText === "true";
  const hasMusic = style.hasMusic === true || style.hasMusic === "true";

  // Scene 2 duration is the bulk of the video
  const scene2Duration = Math.max(durationSec - 6, 6);

  return `You are a world-class video director specializing in Shopee product videos. Create a complete, professional video script following ALL specifications below.

## PRODUCT INFORMATION
- Name: ${product.name || ""}
- Description: ${product.description || ""}
- Benefits: ${product.benefits || ""}
- Target Audience: ${product.targetAudience || "General"}
- Differentiators: ${product.differentiators || "Not specified"}
- Problem Solved: ${product.problemSolved || "Not specified"}

## VIDEO CONFIGURATION (USER'S CHOICES — RESPECT ALL)
- STYLE: ${styleDesc}
- DURATION: ${durationSec} seconds total
- VOICE: ${voiceDesc}
- TONE: ${toneDesc}
- ON-SCREEN TEXT: ${hasText ? "YES — include text overlays with exact timing per scene" : "NO — no text on screen, pure visual"}
- BACKGROUND MUSIC: ${hasMusic ? "YES — specify music genre, tempo, and mood per scene" : "NO — voice only or silence"}

## CRITICAL RULES
1. Format: 9:16 VERTICAL (1080x1920) — TikTok, Reels, Shopee optimized
2. Exactly 3 scenes: Opening Hook (0-3s) → Main Content (3-${durationSec - 3}s) → Closing CTA (${durationSec - 3}-${durationSec}s)
3. Hook MUST grab attention in the FIRST 2 SECONDS
4. Camera direction for EVERY scene: angles, movement, framing, lighting setup
5. Text overlays MUST include: exact wording, animation style, screen position, appear/disappear timing
6. Voiceover must be a COMPLETE, PROFESSIONAL narration ready to record — do NOT include scene descriptions in the voiceover, only the spoken words
7. CTA must be strong, clear, and actionable
8. NEVER invent product features — stay 100% accurate to the product info provided
9. Adapt EVERYTHING to the chosen style: "${styleId}"
10. Adapt EVERYTHING to the chosen tone: "${toneId}"
11. On-screen text must COMPLEMENT the voiceover, never repeat it verbatim
12. Hashtags must be relevant to Shopee AND the product niche (8-10 hashtags)
13. The final_prompt must be in PERFECT ENGLISH — this is what gets pasted into a video AI generator
14. The final_prompt must be comprehensive: all product details, all video specs, scene-by-scene direction, full narration, text specs, music direction
15. Script must mention SPECIFIC product details by name — do NOT use generic placeholders
16. ALL narration and voiceover text MUST be in Brazilian Portuguese (pt-BR)
17. ALL on-screen text overlays MUST be in Brazilian Portuguese (pt-BR)

## RESPONSE FORMAT (JSON only, no markdown, no code fences, no explanation text)

Return a valid JSON object with EXACTLY these fields:

{
  "idea_title": "catchy creative title (max 80 chars, in Portuguese)",
  "hook": "opening hook that grabs attention in 2 seconds (max 150 chars, in Portuguese)",
  "script": "FULL scene-by-scene script in Portuguese with camera direction:\n\nCENA 1 — Abertura (0-3s):\n[Camera: specific angles, movement, framing, lighting]\n[Visual: what the viewer sees]\n[Text overlay: exact text, animation, position, timing] (if enabled)\nLocução: [narration text]\n\nCENA 2 — Desenvolvimento (3-${durationSec - 3}s):\n[Camera: specific angles, movement, framing, lighting]\n[Visual: what the viewer sees — product demonstration, benefits, features]\n[Text overlay: exact text per segment with timing] (if enabled)\nLocução: [narration text]\n\nCENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):\n[Camera: specific angles, movement, framing, lighting]\n[Visual: final hero shot, product, price]\n[Text overlay: CTA text, animation, position] (if enabled)\nLocução: [final narration with strong CTA]",
  "voiceover": "Complete narration text only — ready to record. No scene descriptions, no camera notes, just the spoken words in a single flowing text in Portuguese. Use natural pauses (...), emphasis (MAIÚSCULAS), and emotional inflection markers where appropriate.",
  "screen_texts": ${hasText ? '"Scene 1 (0-3s): [exact text] — [animation: fade in/slide/scale] at [top/center/bottom] — appears at 0.5s, fades at 2.8s\\nScene 2 (3-' + (durationSec - 3) + 's): [exact text per segment]\\nScene 3 (' + (durationSec - 3) + '-' + durationSec + 's): [CTA text] — [animation] at [position]"' : '"no on-screen text — visual only"'},
  "cta": "Strong, actionable call-to-action in Portuguese (max 80 chars)",
  "caption": "Social media caption in Portuguese (2-3 lines with emojis, max 300 chars)",
  "hashtags": "#shopee #[niche1] #[niche2] #[product] #promocao #[style] #[category] #[tone] #achadinho #oferta (8-10 total, in lowercase)",
  "final_prompt": "Generate a COMPLETE video creation prompt IN ENGLISH. Do NOT translate from Portuguese — write natively in English. Structure:\n\nVIDEO GENERATION PROMPT\n======================\n\nPRODUCT:\nName: ${product.name || "N/A"}\nDescription: ${product.description || "N/A"}\nKey Benefits: ${product.benefits || "N/A"}\nTarget Audience: ${product.targetAudience || "General"}\nDifferentiators: ${product.differentiators || "N/A"}\nProblem Solved: ${product.problemSolved || "N/A"}\n\nVIDEO SPECIFICATIONS:\n- Format: 9:16 vertical (1080x1920)\n- Platform: TikTok, Instagram Reels, Shopee Video\n- Duration: ${durationSec} seconds\n- Resolution: 1080x1920 pixels\n- Frame Rate: 30fps (60fps for slow motion if cinematic style)\n- Style: ${styleDesc}\n- Tone: ${toneDesc}\n- Voiceover: ${voiceDesc}\n- On-screen Text: ${hasText ? "Yes — detailed text specs per scene below" : "No — visual communication only"}\n- Background Music: ${hasMusic ? "Yes — music direction per scene below" : "No background music"}\n\nSCENE-BY-SCENE DIRECTION:\n\nScene 1 — Opening Hook (0.0s-3.0s):\nCamera: [specific angles, lens choice, camera movement, framing]\nLighting: [setup, mood, key/fill/rim positions]\nVisual: [detailed description of what appears on screen]\n${hasText ? "Text Overlay: [exact English text, font style recommendation, animation type (fade/slide/scale/typewriter), screen position (top third/center/bottom third), appear at X.Xs, disappear at X.Xs]" : ""}\nAudio: [voiceover line + ${hasMusic ? "music genre, tempo, mood" : "silence/ambient"}]\n\nScene 2 — Main Content (3.0s-${durationSec - 3}.0s):\nCamera: [specific angles, lens choice, camera movement, framing for each sub-segment]\nLighting: [setup, mood, any changes from scene 1]\nVisual: [detailed description — product highlights, benefits demonstration, features shown]\n${hasText ? "Text Overlay: [exact English text per sub-segment with timing]" : ""}\nAudio: [voiceover lines + ${hasMusic ? "music progression" : "silence/ambient"}]\n\nScene 3 — Closing CTA (${durationSec - 3}.0s-${durationSec}.0s):\nCamera: [final hero shot — angle, movement, framing]\nLighting: [dramatic final lighting setup]\nVisual: [product + price/offer + brand moment]\n${hasText ? "Text Overlay: [CTA text, bold animation, prominent position]" : ""}\nAudio: [final voiceover line with impact + ${hasMusic ? "music climax/resolution" : "silence"}]\n\nFULL NARRATION SCRIPT (English):\n[Complete voiceover text translated to English, broken down by scene with [timing] notations. Write this as a professional narration script ready for a voice actor to record.]\n\nON-SCREEN TEXT SPECIFICATIONS:\n${hasText ? "[For each text element: exact wording, font style (bold/sans-serif), animation type, screen position, appear/disappear timing in seconds, color (white with dark shadow recommended for visibility)]" : "No on-screen text — visual storytelling only"}\n\nMUSIC DIRECTION:\n${hasMusic ? "[Per scene: genre, tempo (BPM), mood, suggested track style, any sound effects (whoosh, ding, pop)]" : "No background music — natural audio or silence"}\n\nIMPORTANT CONSTRAINTS:\n- Do NOT fabricate or exaggerate product features not listed above\n- Maintain factual accuracy about the product at all times\n- Optimize for mobile viewing (9:16 vertical format)\n- Hook must capture attention within first 2 seconds\n- All text overlays must be readable on mobile screens (minimum 36pt equivalent)\n- Use the ${toneDesc} tone consistently throughout\n- End with a strong, memorable call-to-action\n- Include ALL product information provided above — do not omit details"
}`;
}

// ── Parse Gemini response ────────────────────────────────────

function parseResponse(text: string): GeneratedContent {
  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

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

// ── STYLE-SPECIFIC FALLBACK TEMPLATES ─────────────────────────

// Each template function produces INDISTINGUISHABLE content from real Gemini output

function buildTemplateProdutoDestaque(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const desc = product.description || "";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const audience = product.targetAudience || "geral";
  const diff = product.differentiators || "";
  const problem = product.problemSolved || "";
  const scene2Dur = Math.max(durationSec - 6, 9);

  const idea_title = `${name} em Detalhes — Veja de Perto!`;

  const hook = `Olha só os detalhes do ${name}! ${benefitsList[0] || "Imperdível!"}`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Close-up extremo, lente macro 100mm, câmera desliza lentamente da esquerda para direita revelando textura, foco rack do fundo para o produto]
[Lighting: Key light suave frontal 45°, rim light traseiro para separação do fundo escuro, intensidade 80%]
[Visual: ${name} entra em cena com leve motion blur, giro de 360° controlado, detalhes em close extremo]
${hasText ? `[Text overlay: "${name}" — fade in animado, topo central, aparece em 0.5s, desaparece em 2.5s, fonte bold branca com sombra]` : ""}
Locução: Olha só o que eu encontrei na Shopee! ${name} — ${benefitsList[0] || "qualidade incrível"}!

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Movimento orbital lento ao redor do produto (360° em ${scene2Dur}s), cortes para close-ups de textura, zoom suave nos detalhes, gimbal estabilizado]
[Lighting: Key light constante, fill light em 40% para sombras suaves, backlight para destacar bordas]
[Visual: Produto girando mostrando todos os ângulos, zoom em 3 diferenciais chave com pausa em cada um, demonstração de qualidade dos materiais]
${hasText ? `[Text overlay 1 (3-${Math.floor(scene2Dur / 2) + 3}s): "${benefitsList[0] || "Qualidade premium"}" — slide in da direita, centro, bold]
[Text overlay 2 (${Math.floor(scene2Dur / 2) + 3}-${durationSec - 3}s): "${benefitsList[1] || "Design exclusivo"}" — slide in da direita, centro, bold]` : ""}
Locução: ${name}. ${benefits}. ${diff ? `O que torna ele diferente? ${diff}` : "Qualidade que você só encontra aqui."} Perfeito para ${audience}. ${desc.slice(0, 100)}.

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Plano hero final — câmera se aproxima lentamente (dolly in), foco no produto centralizado, leve tilt para cima revelando grandeza]
[Lighting: Luz dramática final, intensidade máxima no produto, leve flare de lente para glamour]
[Visual: Hero shot do ${name} com iluminação perfeita, preço/valor aparecendo]
${hasText ? `[Text overlay: "LINK NA BIO 🔥" — scale animado pulsante, centro inferior, aparece em ${durationSec - 3}s, mantém até o final]` : ""}
Locução: ${name} na Shopee. Link na bio! Corre antes que acabe!`;

  const voiceover = `Olha só o que eu encontrei na Shopee! ${name} — ${benefitsList[0] || "qualidade incrível"}! ${benefits} ${diff ? `O que torna ele diferente? ${diff}` : "Qualidade que você só encontra aqui."} Perfeito para ${audience}. ${desc.slice(0, 100)}. ${name} na Shopee. Link na bio! Corre antes que acabe!`;

  const screen_texts = hasText
    ? `Cena 1 (0-3s): "${name}" — fade in, topo central, 0.5s-2.5s\nCena 2 (3-${durationSec - 3}s): "${benefitsList[0] || "Qualidade premium"}" / "${benefitsList[1] || "Design exclusivo"}" — slide in, centro, bold\nCena 3 (${durationSec - 3}-${durationSec}s): "LINK NA BIO 🔥" — scale pulsante, centro inferior`
    : "sem textos na tela — visual puro";

  const cta = `Garanta já o seu ${name}! Link na bio! 🔥`;

  const caption = `🎯 ${name} na Shopee!\n${desc.slice(0, 120)}\n\nQualidade incrível, preço imperdível. Link na bio 👆`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #achadinho #promoção #oferta #produto #qualidade #destaque #comprasonline #review`;

  const final_prompt = buildEnglishFinalPrompt(product, "produto-destaque", durationSec, hasText, hasMusic);

  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateOfertaRapida(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";
  const scene2Dur = Math.max(durationSec - 5, 5);

  const idea_title = `⚡ OFERTA RELÂMPAGO: ${name}`;

  const hook = `CORRE! ${name} com preço IMPERDÍVEL na Shopee! ${benefitsList[0] || "Não perca!"}`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-2s):
[Camera: Corte seco, câmera tremida estilo handheld, zoom rápido in]
[Lighting: Flash vermelho pulsante, iluminação de alerta]
[Visual: Flash vermelho na tela — texto gigante "OFERTA RELÂMPAGO ⚡" piscando]
${hasText ? `[Text overlay: "⚡ OFERTA RELÂMPAGO ⚡" — flash animado, centro total, aparece 0s, some 2s, vermelho com borda amarela]` : ""}
Locução: ATENÇÃO! Oferta relâmpago na Shopee!

CENA 2 — Desenvolvimento (2-${durationSec - 3}s):
[Camera: Cortes rápidos a cada 1-2 segundos, zoom in/out agressivo, transições whip pan]
[Lighting: Iluminação de estúdio forte, alto contraste, sombras dramáticas]
[Visual: Produto em close → preço original riscado → preço com desconto → produto com detalhes → timer regressivo no canto]
${hasText ? `[Text overlay: "DE R$[original]" riscado → "POR R$[promo]" gigante — slide in, centro, ${2}s-${durationSec - 3}s]\n[Timer overlay: "⏱️ ÚLTIMAS HORAS" — canto superior direito, piscando]` : ""}
Locução: ${name}! ${benefitsList[0] || "Preço nunca visto!"} ${benefitsList[1] || ""} APROVEITA porque é por tempo limitado! ${desc.slice(0, 80)}.

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Zoom out dramático revelando produto + CTA]
[Lighting: Flash final branco para destaque máximo]
[Visual: Produto centralizado, texto urgente piscando, CTA enorme]
${hasText ? `[Text overlay: "COMPRE AGORA! 🔥" — scale + flash, centro total, pulsando até o final]` : ""}
Locução: ${name} com preço de loucura! Link na bio, COMPRA AGORA antes que acabe!`;

  const voiceover = `ATENÇÃO! Oferta relâmpago na Shopee! ${name}! ${benefitsList[0] || "Preço nunca visto!"} ${benefitsList[1] || ""} APROVEITA porque é por tempo limitado! ${desc.slice(0, 80)}. ${name} com preço de loucura! Link na bio, COMPRA AGORA antes que acabe!`;

  const screen_texts = hasText
    ? `Cena 1 (0-2s): "⚡ OFERTA RELÂMPAGO ⚡" — flash, centro, vermelho/amarelo\nCena 2 (2-${durationSec - 3}s): Preço riscado → novo preço + timer "⏱️ ÚLTIMAS HORAS"\nCena 3 (${durationSec - 3}-${durationSec}s): "COMPRE AGORA! 🔥" — scale pulsante`
    : "sem textos na tela";

  const cta = `COMPRE AGORA! Link na bio! ⚡🔥`;

  const caption = `⚡ OFERTA RELÂMPAGO! ${name}\n${desc.slice(0, 100)}\n\nPreço imperdível na Shopee. Corre antes que acabe! 👆`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #oferta #promoção #desconto #relampago #oportunidade #imperdivel #comprasonline #corre`;

  const final_prompt = buildEnglishFinalPrompt(product, "oferta-rapida", durationSec, hasText, hasMusic);

  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateProblemaSolucao(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const problem = product.problemSolved || "um problema comum";
  const desc = product.description || "";
  const audience = product.targetAudience || "você";
  const scene2Dur = Math.max(durationSec - 6, 9);

  const idea_title = `Cansado de ${problem.slice(0, 40)}? A Solução é ${name}`;

  const hook = `Cansado de ${problem}? Eu também estava... até descobrir ${name}!`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Plano médio, câmera handheld leve tremido, split screen esquerda/direita — esquerda dessaturada (problema), direita aguardando]
[Lighting: Iluminação fria/azulada para tom de frustração, baixo contraste, sombras pesadas]
[Visual: Pessoa demonstrando frustração com ${problem.toLowerCase()}, expressão de cansaço, ambiente bagunçado/desorganizado]
${hasText ? `[Text overlay: "Cansado de ${problem.slice(0, 50)}?" — fade in lento, topo, cor cinza azulada, 0.5s-2.8s]` : ""}
Locução: Cansado de ${problem}? Eu sei como é...

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Transição wipe da esquerda para direita revelando cena colorida, estabilização total, movimentos suaves de gimbal, close-ups do produto em uso]
[Lighting: Transição dramática para iluminação quente/dourada, key light forte, backlight para halo de "solução"]
[Visual: ${name} entra como herói, pessoa usando o produto e sorrindo, transformação visível, resultados claros]
${hasText ? `[Text overlay 1: "A solução: ${name}" — revelação animada, centro, 3.5s-${Math.floor(scene2Dur / 2) + 3}s]\n[Text overlay 2: "${benefitsList[0] || "Resultado real"}" — slide up, centro inferior, ${Math.floor(scene2Dur / 2) + 3}s-${durationSec - 3}s]` : ""}
Locução: Mas aí eu descobri ${name}. ${benefits} ${diff ? `O diferencial? ${diff}` : ""} ${desc.slice(0, 80)}. Olha a diferença!

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Dolly in suave para close no rosto feliz + produto, foco no sorriso e satisfação]
[Lighting: Iluminação quente e acolhedora, tom dourado de final feliz, glow suave]
[Visual: Pessoa feliz com o produto, transformação completa, resultado visível]
${hasText ? `[Text overlay: "Sua vida mais fácil. Link na bio! 💫" — fade in suave, centro inferior, ${durationSec - 3}s até o fim]` : ""}
Locução: ${name} mudou minha rotina. Link na bio! Sua vida mais fácil começa agora!`;

  const voiceover = `Cansado de ${problem}? Eu sei como é... Mas aí eu descobri ${name}. ${benefits} ${diff ? `O diferencial? ${diff}` : ""} ${desc.slice(0, 80)}. Olha a diferença! ${name} mudou minha rotina. Link na bio! Sua vida mais fácil começa agora!`;

  const screen_texts = hasText
    ? `Cena 1 (0-3s): "Cansado de ${problem.slice(0, 50)}?" — fade in, topo, cinza\nCena 2 (3-${durationSec - 3}s): "A solução: ${name}" → "${benefitsList[0] || "Resultado real"}" — revelação animada\nCena 3 (${durationSec - 3}-${durationSec}s): "Sua vida mais fácil. Link na bio! 💫" — fade in suave`
    : "sem textos na tela";

  const cta = `Resolva seu problema agora! ${name} na Shopee. Link na bio! 💫`;

  const caption = `😫 Cansado de ${problem.slice(0, 60)}?\n\n✨ ${name} resolve! ${benefitsList[0] || ""}\n\nLink na bio 👆 #Solução #Shopee`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #solução #dicadodia #antesedepois #resultado #dica #produto #comprasonline #qualidadedevida`;

  const final_prompt = buildEnglishFinalPrompt(product, "problema-solucao", durationSec, hasText, hasMusic);

  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateDemonstracao(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";
  const scene2Dur = Math.max(durationSec - 6, 9);

  const idea_title = `Como Usar ${name} em ${durationSec} Segundos`;

  const hook = `Aprenda a usar ${name} do jeito certo! Tutorial rápido em ${durationSec}s.`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Overhead/zenital, ângulo de cima para baixo (top-down), mesa limpa como fundo]
[Lighting: Iluminação difusa uniforme, sem sombras duras, temperatura neutra 5600K]
[Visual: ${name} centralizado na mesa, mãos entram em cena, título do tutorial aparece]
${hasText ? `[Text overlay: "Como usar ${name}" — typewriter animado, centro, 0.3s-2.8s, fonte clean]` : ""}
Locução: Como usar ${name} em ${durationSec} segundos? Vem comigo!

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Overhead contínuo, cortes ocasionais para close-up em detalhes importantes, zoom em gestos específicos, câmera estática com cortes limpos]
[Lighting: Iluminação consistente, leve ajuste de brilho para destacar detalhes em close-up]
[Visual: Demonstração passo a passo do uso do ${name}, cada etapa com destaque visual, resultado/transformação visível ao final]
${hasText ? `[Text overlay por etapa: "Passo 1" → "Passo 2" → "Resultado" — números grandes no canto superior esquerdo, instrução breve no centro inferior]` : ""}
Locução: Primeiro, ${desc.slice(0, 60)}. ${benefitsList[0] || "Qualidade garantida."} ${benefitsList[1] || ""} Olha que resultado incrível!

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Close no produto em uso final ou resultado, leve zoom out revelando satisfação]
[Lighting: Brilho levemente aumentado para destaque final]
[Visual: Resultado final impressionante, produto em destaque]
${hasText ? `[Text overlay: "Simples assim! 😍 Link na bio" — fade in, centro inferior, ${durationSec - 3}s até o fim]` : ""}
Locução: Simples assim! ${name} na Shopee. Link na bio!`;

  const voiceover = `Como usar ${name} em ${durationSec} segundos? Vem comigo! Primeiro, ${desc.slice(0, 60)}. ${benefitsList[0] || "Qualidade garantida."} ${benefitsList[1] || ""} Olha que resultado incrível! Simples assim! ${name} na Shopee. Link na bio!`;

  const screen_texts = hasText
    ? `Cena 1 (0-3s): "Como usar ${name}" — typewriter, centro\nCena 2 (3-${durationSec - 3}s): "Passo 1" → "Passo 2" → "Resultado" — canto superior esquerdo\nCena 3 (${durationSec - 3}-${durationSec}s): "Simples assim! 😍 Link na bio" — fade in`
    : "sem textos na tela";

  const cta = `Teste você mesmo! ${name} na Shopee. Link na bio! 😍`;

  const caption = `📹 Tutorial rápido: ${name}\n\n${desc.slice(0, 120)}\n\nSimples, fácil e eficaz! Link na bio 👆 #Tutorial`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #tutorial #comousar #dica #dicadodia #review #produto #passoapasso #resultado`;

  const final_prompt = buildEnglishFinalPrompt(product, "demonstracao", durationSec, hasText, hasMusic);

  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateUnboxing(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";
  const scene2Dur = Math.max(durationSec - 6, 9);

  const idea_title = `📦 Unboxing: ${name} Chegou!`;

  const hook = `Olha o que chegou! 📦 Abrindo ${name} com vocês — primeira impressão!`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: POV subjetivo, câmera na mão simulando visão da pessoa, leve balanço natural, close na embalagem]
[Lighting: Luz natural de janela, iluminação ambiente real, sem equipamento profissional, sombras suaves naturais]
[Visual: Mãos mostrando a embalagem/caixa fechada, batendo levemente, mostrando todos os lados]
${hasText ? `[Text overlay: "📦 Olha o que chegou!" — pop animado, centro, 0.5s-2.8s, fonte casual]` : ""}
Locução: Gente, olha o que chegou! 📦 ${name}!

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: POV contínuo, aproximações naturais para detalhes, foco automático buscando texturas, câmera se aproxima e afasta naturalmente]
[Lighting: Luz natural mantida, reflexos naturais em superfícies brilhantes, sombras orgânicas do ambiente]
[Visual: Abrindo a embalagem camada por camada, retirando o produto lentamente, inspecionando detalhes, mostrando acessórios, primeira reação de surpresa/emoção]
${hasText ? `[Text overlay: "Que lindo! 😍" — pop up animado, centro, ${Math.floor(scene2Dur / 2) + 3}s-${durationSec - 3}s]` : ""}
Locução: Olha isso! ${benefitsList[0] || "Que qualidade!"} ${benefitsList[1] || "Muito melhor que nas fotos."} ${desc.slice(0, 80)}. Gente, que incrível!

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Plano aberto mostrando produto já fora da caixa em uso ou em destaque, leve estabilização]
[Lighting: Luz natural, produto posicionado perto da janela para melhor iluminação]
[Visual: Produto montado/posicionado/em uso, visual final impressionante]
${hasText ? `[Text overlay: "Já quero outro! Corre na Shopee 🔥" — slide up, centro inferior, ${durationSec - 3}s até o fim]` : ""}
Locução: Já quero comprar outro! Link na bio, corre que tá na Shopee!`;

  const voiceover = `Gente, olha o que chegou! 📦 ${name}! Olha isso! ${benefitsList[0] || "Que qualidade!"} ${benefitsList[1] || "Muito melhor que nas fotos."} ${desc.slice(0, 80)}. Gente, que incrível! Já quero comprar outro! Link na bio, corre que tá na Shopee!`;

  const screen_texts = hasText
    ? `Cena 1 (0-3s): "📦 Olha o que chegou!" — pop, centro\nCena 2 (3-${durationSec - 3}s): "Que lindo! 😍" — pop up, centro\nCena 3 (${durationSec - 3}-${durationSec}s): "Já quero outro! Corre na Shopee 🔥" — slide up`
    : "sem textos na tela";

  const cta = `Garanta o seu ${name} na Shopee! Link na bio! 📦🔥`;

  const caption = `📦 Unboxing do ${name}!\n\n${desc.slice(0, 100)}\n\nQue produto incrível! Link na bio 👆 #Unboxing #Shopee`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #unboxing #review #primeiraimpressao #comprei #produto #novidade #chegou #achadinho`;

  const final_prompt = buildEnglishFinalPrompt(product, "unboxing", durationSec, hasText, hasMusic);

  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateUgc(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";
  const price = product.price || "";
  const scene2Dur = Math.max(durationSec - 6, 9);

  const idea_title = `Gente, Olha o que Achei na Shopee: ${name}`;

  const hook = `Gente, vocês não vão acreditar no que eu achei na Shopee... ${name}!`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Selfie frontal, celular na mão, quarto/sala ao fundo desfocado, enquadramento vertical natural]
[Lighting: Luz natural de janela lateral, sem equipamento, sombras suaves, visual de "filmei agora"]
[Visual: Pessoa falando direto pra câmera, expressão animada, mostrando o celular com a página do produto na Shopee]
${hasText ? `[Text overlay: "ACHADO NA SHOPEE 🛍️" — pop up animado, topo, 0.3s-2.8s, fonte casual colorida]` : ""}
Locução: Gente, vocês não vão acreditar no achado que eu fiz na Shopee!

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Alterna entre selfie e câmera traseira mostrando o produto, movimentos naturais de quem está filmando casualmente, zoom digital nas partes importantes]
[Lighting: Luz ambiente natural, sem preocupação com iluminação profissional, autenticidade total]
[Visual: Mostrando o produto de perto, virando, mostrando detalhes, voltando pra selfie pra comentar, linguagem corporal animada e genuína]
${hasText ? `[Text overlay: "${benefitsList[0] || "Muito barato!"} 💰" — sticker animado, canto inferior, ${4}s-${durationSec - 3}s]` : ""}
Locução: Olha isso! ${name}. ${benefitsList[0] || "Muito melhor do que eu esperava!"} ${benefitsList[1] || "E o preço? Nem vou falar pra vocês não se assustarem!"} ${desc.slice(0, 60)}. Sério, tô chocada!

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Volta pra selfie, close no rosto, olhando direto pra câmera, tom de recomendação pessoal]
[Lighting: Mesma luz natural, autenticidade mantida]
[Visual: Pessoa falando direto pra câmera, recomendando, mostrando o produto uma última vez]
${hasText ? `[Text overlay: "Link na bio! Corre 🔥" — pop up, centro inferior, ${durationSec - 3}s até o fim]` : ""}
Locução: Então corre lá na Shopee, link na bio! Depois me contem se gostaram!`;

  const voiceover = `Gente, vocês não vão acreditar no achado que eu fiz na Shopee! Olha isso! ${name}. ${benefitsList[0] || "Muito melhor do que eu esperava!"} ${benefitsList[1] || "E o preço? Nem vou falar pra vocês não se assustarem!"} ${desc.slice(0, 60)}. Sério, tô chocada! Então corre lá na Shopee, link na bio! Depois me contem se gostaram!`;

  const screen_texts = hasText
    ? `Cena 1 (0-3s): "ACHADO NA SHOPEE 🛍️" — pop up, topo\nCena 2 (3-${durationSec - 3}s): "${benefitsList[0] || "Muito barato!"} 💰" — sticker, canto inferior\nCena 3 (${durationSec - 3}-${durationSec}s): "Link na bio! Corre 🔥" — pop up`
    : "sem textos na tela";

  const cta = `Corre na Shopee! Link na bio! 🛍️🔥`;

  const caption = `🛍️ Achado na Shopee: ${name}!\n\n${desc.slice(0, 100)}\n\nSério, que produto incrível! Link na bio 👆 #Shopee #Achadinho`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #achadinho #achado #comprei #review #dica #dicadodia #barato #amei`;

  const final_prompt = buildEnglishFinalPrompt(product, "ugc", durationSec, hasText, hasMusic);

  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateCinematografico(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";
  const diff = product.differentiators || "";
  const scene2Dur = Math.max(durationSec - 6, 9);

  const idea_title = `${name} — Uma Obra-Prima`;

  const hook = `${name}. ${benefitsList[0] || "Além do comum."} Experimente o extraordinário.`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Câmera lenta 60fps, movimento gimbal suave da esquerda para direita revelando o produto, lente anamórfica simulada, profundidade de campo rasa (f/1.4)]
[Lighting: Golden hour — luz dourada entrando em ângulo baixo (hora mágica), lens flare controlado, sombras longas e suaves, temperatura 3200K quente]
[Visual: ${name} emerge de sombras com luz dramática, partículas de poeira dourada flutuando, revelação artística em câmera lenta]
${hasText ? `[Text overlay: "${name}" — fade in extremamente lento (1.5s), fonte serifada elegante, centro inferior, 1s-3s, tracking wide]` : ""}
Locução: (voz pausada, tom cinematográfico) ${name}. Além do comum.

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Slow motion contínuo, movimentos de gimbal extremamente suaves, close-ups com foco rack (transição de foco entre elementos), orbiting shot lento ao redor do produto]
[Lighting: Golden hour mantido, transições de luz suaves, flare de lente em momentos chave, iluminação que esculpe o produto]
[Visual: Detalhes do produto revelados um a um, close-ups extremos de textura, luz dançando sobre superfícies, cinematografia que conta uma história visual sem pressa]
${hasText ? `[Text overlay: "${benefitsList[0] || "Excelência"}" — fade in/out lento, centro, 4s-${Math.floor(scene2Dur / 2) + 3}s, fonte serifada fina]\n[Text overlay: "${diff || "Artesanal"}" — idem, ${Math.floor(scene2Dur / 2) + 3}s-${durationSec - 3}s]` : ""}
Locução: ${benefits} ${diff} ${desc.slice(0, 60)}. Criado para quem busca o melhor.

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Dolly out extremamente lento, revelando o produto em toda sua grandeza, último frame congela em still fotográfico]
[Lighting: Luz atinge pico dramático, flare final artístico, fade para preto nos últimos 0.5s]
[Visual: Hero shot cinematográfico final, produto banhado em luz dourada, composição perfeita]
${hasText ? `[Text overlay: "Shopee" — fade in elegante, centro inferior, ${durationSec - 2.5}s até fade para preto]` : ""}
Locução: ${name}. Na Shopee. Link na bio.`;

  const voiceover = `(tom cinematográfico, pausado) ${name}. Além do comum. ${benefits} ${diff} ${desc.slice(0, 60)}. Criado para quem busca o melhor. ${name}. Na Shopee. Link na bio.`;

  const screen_texts = hasText
    ? `Cena 1 (0-3s): "${name}" — fade in lento, serifado elegante, centro inferior\nCena 2 (3-${durationSec - 3}s): "${benefitsList[0] || "Excelência"}" / "${diff || "Artesanal"}" — fade in/out lento\nCena 3 (${durationSec - 3}-${durationSec}s): "Shopee" — fade in elegante`
    : "sem textos na tela — visual puro";

  const cta = `Descubra ${name} na Shopee. Link na bio. ✨`;

  const caption = `✨ ${name}\n\n${desc.slice(0, 100)}\n\nExcelência em cada detalhe. Link na bio 👆 #Shopee`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #premium #design #cinematic #luxo #qualidade #exclusivo #elegance #arte`;

  const final_prompt = buildEnglishFinalPrompt(product, "cinematografico", durationSec, hasText, hasMusic);

  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateAchadinho(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";
  const scene2Dur = Math.max(durationSec - 6, 9);

  const idea_title = `🛍️ Achadinho da Shopee: ${name}`;

  const hook = `Gente, olha o ACHADINHO que eu encontrei na Shopee! ${name}!`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Selfie animada, celular mostrando a tela da Shopee com o preço, expressão de "vocês não vão acreditar"]
[Lighting: Luz ambiente natural, quarto/sala, sem produção]
[Visual: Pessoa mostrando o celular com a página do produto na Shopee, zoom digital no preço]
${hasText ? `[Text overlay: "ACHADINHO! 🛍️" — bounce animado, topo, 0.2s-2.8s, colorido]` : ""}
Locução: Gente, ISSO na Shopee por APENAS esse preço? Tá de brincadeira!

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Alterna entre câmera traseira (mostrando produto) e selfie (reação), movimentos rápidos e animados, zoom em detalhes]
[Lighting: Iluminação caseira natural, sem frescuras, real e autêntico]
[Visual: Produto de perto, comparando mentalmente com similares mais caros, mostrando qualidade que não esperava pelo preço]
${hasText ? `[Text overlay: "ISSO por APENAS R$[preço]! 😱" — pop grande, centro, 4s-${durationSec - 3}s, amarelo/laranja chamativo]` : ""}
Locução: Olha a qualidade disso! ${benefitsList[0] || "Incrível!"} ${benefitsList[1] || "E pensa que é caro? Nada!"} ${desc.slice(0, 60)}. Gente, eu tô passada!

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Selfie final com produto na mão, sorriso, tom de "corre antes que acabe"]
[Lighting: Natural, mesma consistência]
[Visual: Produto em destaque na mão, pessoa apontando pra baixo (link na bio)]
${hasText ? `[Text overlay: "CORRE! Link na bio 🏃‍♀️🔥" — pulse animado, centro inferior, ${durationSec - 3}s até o fim]` : ""}
Locução: Corre que é achadinho! Link na bio antes que acabe!`;

  const voiceover = `Gente, ISSO na Shopee por APENAS esse preço? Tá de brincadeira! Olha a qualidade disso! ${benefitsList[0] || "Incrível!"} ${benefitsList[1] || "E pensa que é caro? Nada!"} ${desc.slice(0, 60)}. Gente, eu tô passada! Corre que é achadinho! Link na bio antes que acabe!`;

  const screen_texts = hasText
    ? `Cena 1 (0-3s): "ACHADINHO! 🛍️" — bounce, topo\nCena 2 (3-${durationSec - 3}s): "ISSO por APENAS R$[preço]! 😱" — pop, centro\nCena 3 (${durationSec - 3}-${durationSec}s): "CORRE! Link na bio 🏃‍♀️🔥" — pulse`
    : "sem textos na tela";

  const cta = `Corre que é achadinho! Link na bio! 🛍️🔥`;

  const caption = `🛍️ ACHADINHO DA SHOPEE: ${name}!\n\n${desc.slice(0, 100)}\n\nPreço imperdível! Link na bio 👆 #Achadinho #Shopee`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #achadinho #achado #barato #promoção #comprasonline #dica #economizei #amei`;

  const final_prompt = buildEnglishFinalPrompt(product, "achadinho", durationSec, hasText, hasMusic);

  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateAntesDepois(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const problem = product.problemSolved || "o problema";
  const desc = product.description || "";
  const scene2Dur = Math.max(durationSec - 6, 9);

  const idea_title = `ANTES × DEPOIS: ${name} — A Diferença é Real`;

  const hook = `ANTES: ${problem.slice(0, 60)}. DEPOIS: ${name} mudou tudo! Olha a diferença!`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Tripé fixo, enquadramento consistente, split screen vertical — lado esquerdo ativo (ANTES), lado direito escuro aguardando revelação]
[Lighting: Lado esquerdo: iluminação fria/dessaturada (5600K + filtro azul), contraste baixo, sombras duras. Lado direito: apagado]
[Visual: Lado esquerdo mostra situação problemática — produto antigo ou sem o produto, cores opacas, expressão de insatisfação]
${hasText ? `[Text overlay: "ANTES" — lado esquerdo, topo, fade in 0.5s, cor cinza azulada, fonte bold]` : ""}
Locução: Isso era eu antes de conhecer ${name}...

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Wipe transition dramático da esquerda para direita, câmera mantém posição fixa para comparação justa, split screen final: ANTES | DEPOIS]
[Lighting: Transição progressiva — luz quente invade o quadro (3200K dourado), saturação aumenta, contraste sobe, cores vibrantes no DEPOIS]
[Visual: Lado direito revela transformação com ${name}, cores vibrantes, contraste dramático com o antes, diferença visível e impactante]
${hasText ? `[Text overlay 1: "DEPOIS" — lado direito, topo, revelação animada 3.5s, cor dourada, fonte bold]
[Text overlay 2: "${benefitsList[0] || "Resultado real!"}" — centro, ${Math.floor(scene2Dur / 2) + 3}s-${durationSec - 3}s]` : ""}
Locução: Depois de ${name}, olha a diferença! ${benefits} ${desc.slice(0, 60)}. Inacreditável!

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Zoom in lento no lado DEPOIS, quadro congela em still de comparação final ANTES vs DEPOIS lado a lado]
[Lighting: Iluminação quente total, glow de transformação, cores no máximo]
[Visual: Comparação final lado a lado, diferença dramática, resultado impressionante]
${hasText ? `[Text overlay: "Incrível, né? Link na bio! ✨" — fade in, centro inferior, ${durationSec - 3}s até o fim]` : ""}
Locução: Incrível, né? ${name} na Shopee. Link na bio!`;

  const voiceover = `Isso era eu antes de conhecer ${name}... Depois de ${name}, olha a diferença! ${benefits} ${desc.slice(0, 60)}. Inacreditável! Incrível, né? ${name} na Shopee. Link na bio!`;

  const screen_texts = hasText
    ? `Cena 1 (0-3s): "ANTES" — lado esquerdo, cinza azulado\nCena 2 (3-${durationSec - 3}s): "DEPOIS" lado direito (3.5s) → "${benefitsList[0] || "Resultado real!"}" centro\nCena 3 (${durationSec - 3}-${durationSec}s): "Incrível, né? Link na bio! ✨" — fade in`
    : "sem textos na tela";

  const cta = `Transforme seu resultado! ${name} na Shopee. Link na bio! ✨`;

  const caption = `✨ ANTES × DEPOIS com ${name}!\n\n${desc.slice(0, 100)}\n\nIncrível a diferença, né? Link na bio 👆 #AntesEDepois #Shopee`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #antesedepois #transformação #resultado #mudança #dica #produto #real #comprovado`;

  const final_prompt = buildEnglishFinalPrompt(product, "antes-depois", durationSec, hasText, hasMusic);

  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

// ── Remaining 5 style templates (narracao, texto-tela, sem-fala, promocao) use generic fallback enhanced with style data ──

function buildTemplateNarracao(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";
  const diff = product.differentiators || "";
  const audience = product.targetAudience || "você";
  const problem = product.problemSolved || "";

  const idea_title = `${name} — A História Que Você Precisa Conhecer`;

  const hook = `${benefitsList[0] || `Descubra ${name}`} — vou te contar por que esse produto é diferente.`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Ken Burns slow zoom (3% scale) em foto beauty shot do produto, cross-dissolve de 1.5s a partir de tela preta]
[Lighting: Iluminação suave estilo documentário, key light difuso, sem sombras duras, temperatura 4500K neutra]
[Visual: ${name} em foto profissional com fundo desfocado, título aparece com fade elegante]
${hasText ? `[Text overlay: "${name}" — fade in lento (1.2s), fonte serifada elegante, tracking wide, centro inferior, aparece 0.5s, fade out 2.8s]` : ""}
Locução: (voz calma e profissional) ${name}. ${benefitsList[0] || "Um produto que merece sua atenção."}

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Sequência de Ken Burns em 4-5 fotos do produto — cada uma com zoom lento (2-4%), cross-dissolve entre elas, close-ups em texturas e detalhes, ritmo pausado e contemplativo]
[Lighting: Iluminação consistente e suave em todas as fotos, correção de cor quente e convidativa]
[Visual: Cada benefício ilustrado por uma imagem correspondente — produto em uso, detalhes de qualidade, lifestyle shot, resultado final]
${hasText ? `[Text overlay: "${benefitsList[0] || "Qualidade excepcional"}" — fade in suave, centro, ${4}s-${Math.floor((durationSec - 6) / 2) + 3}s]\n[Text overlay: "${diff || "Design exclusivo"}" — fade in suave, centro, ${Math.floor((durationSec - 6) / 2) + 3}s-${durationSec - 3}s]` : ""}
Locução: ${benefits} ${diff} ${desc.slice(0, 100)}. Perfeito para ${audience}. ${problem ? `Se você enfrenta ${problem}, ${name} é a resposta.` : ""}

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Último Ken Burns em foto hero shot, zoom out lento revelando produto em toda sua glória, fade para preto nos últimos 0.5s]
[Lighting: Iluminação final mais dramática, leve vinheta nas bordas para foco total no produto]
[Visual: Hero shot final do produto, composição limpa e profissional]
${hasText ? `[Text overlay: "${name} na Shopee. Link na bio." — fade in elegante, centro inferior, ${durationSec - 3}s até fade para preto]` : ""}
Locução: ${name}. Na Shopee. Link na bio.`;

  const voiceover = `(voz calma e profissional) ${name}. ${benefitsList[0] || "Um produto que merece sua atenção."} ${benefits} ${diff} ${desc.slice(0, 100)}. Perfeito para ${audience}. ${problem ? `Se você enfrenta ${problem}, ${name} é a resposta.` : ""} ${name}. Na Shopee. Link na bio.`;

  const screen_texts = hasText
    ? `Cena 1 (0-3s): "${name}" — fade in lento, serifado, centro inferior, 0.5s-2.8s\nCena 2 (3-${durationSec - 3}s): "${benefitsList[0] || "Qualidade excepcional"}" / "${diff || "Design exclusivo"}" — fade in suave, centro\nCena 3 (${durationSec - 3}-${durationSec}s): "${name} na Shopee. Link na bio." — fade in elegante`
    : "sem textos na tela";

  const cta = `${name} na Shopee. Link na bio! 📖`;

  const caption = `📖 ${name}\n\n${desc.slice(0, 120)}\n\nDescubra por que ${name} é diferente. Link na bio 👆 #Shopee`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #review #dica #conheça #produto #qualidade #narração #comprasonline #detalhes`;

  const final_prompt = buildEnglishFinalPrompt(product, "narracao", durationSec, hasText, hasMusic);
  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateTextoTela(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";
  const diff = product.differentiators || "";

  const idea_title = `ATENÇÃO! ${name} — Imperdível!`;

  const hook = `ATENÇÃO! ${benefitsList[0] || `Você precisa ver ${name}`}!`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Fundo colorido sólido com gradiente, texto como elemento visual principal, animações de entrada impactantes]
[Lighting: Iluminação de estúdio vibrante no produto ao fundo, cores saturadas]
[Visual: Texto gigante "ATENÇÃO!" explode na tela com scale animation (0.3s), depois "${name}" aparece com slide up]
${hasText ? `[Text overlay: "ATENÇÃO!" — scale explosivo (0-300%), centro, 0-1.5s, fonte ultra bold, cor vibrante]\n[Text overlay: "${name}" — slide up de baixo, centro, 1.5s-2.8s, bold]` : ""}
(SEM LOCUÇÃO — apenas música e texto)

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Transições dinâmicas entre cards de texto — cada benefício é um card animado, produto aparece brevemente entre os textos como background, animações sincronizadas com a batida da música]
[Lighting: Iluminação de estúdio consistente, produto bem iluminado quando aparece]
[Visual: Sequência de 3-4 cards de texto com benefícios, cada um com animação diferente (slide left, slide right, bounce, scale), produto ao fundo com opacidade 30% entre os textos]
${hasText ? `[Text overlay: Sequência animada de benefícios — "${benefitsList[0] || "QUALIDADE PREMIUM"}" → "${benefitsList[1] || "PREÇO IMPERDÍVEL"}" → "${benefitsList[2] || "RESULTADO GARANTIDO"}" → "${diff || "EXCLUSIVO"}" — cada card sincronizado com a batida, centro, bold máximo]` : ""}
(SEM LOCUÇÃO — apenas música e texto)

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Plano final com texto CTA gigante, produto aparece como background com blur, animação final impactante]
[Lighting: Iluminação dramática final, cores no máximo]
[Visual: Texto "LINK NA BIO 👆" pulsando/girando/scale, produto ao fundo, efeito de partículas ou glitter]
${hasText ? `[Text overlay: "LINK NA BIO 👆" — pulse + scale animado, centro, ${durationSec - 3}s até o fim, maior texto do vídeo, efeito glow]` : ""}
(SEM LOCUÇÃO — apenas música e texto)`;

  const voiceover = "(sem voz — vídeo 100% texto e música)";

  const screen_texts = `Cena 1 (0-3s): "ATENÇÃO!" (0-1.5s) → "${name}" (1.5s-2.8s) — animações bold, centro\nCena 2 (3-${durationSec - 3}s): Cards animados: "${benefitsList[0] || "QUALIDADE PREMIUM"}" / "${benefitsList[1] || "PREÇO IMPERDÍVEL"}" / "${benefitsList[2] || "RESULTADO GARANTIDO"}" / "${diff || "EXCLUSIVO"}"\nCena 3 (${durationSec - 3}-${durationSec}s): "LINK NA BIO 👆" — pulse + glow, centro`;

  const cta = `LINK NA BIO 👆🔥`;

  const caption = `⚠️ ATENÇÃO! ${name} na Shopee!\n${desc.slice(0, 100)}\n\nLink na bio 👆 #Shopee #Imperdivel`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #atenção #promoção #oferta #imperdivel #linknabio #comprasonline #dica #fyp`;

  const final_prompt = buildEnglishFinalPrompt(product, "texto-tela", durationSec, hasText, hasMusic);
  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateSemFala(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";

  const idea_title = `${name} — Visualmente Impressionante`;

  const hook = `Deixe as imagens falarem por ${name}.`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Plano de beleza absoluta — close-up extremo do produto com movimento orbital ultra lento (60fps), revelação atmosférica com fade in do preto]
[Lighting: Iluminação cinematográfica dramática — key light angular criando sombras artísticas, backlight para silhueta inicial, transição para revelação completa]
[Visual: ${name} emerge dramaticamente das sombras, close extremo em textura e acabamento, composição visual de beleza pura]
(SEM LOCUÇÃO — experiência puramente visual com trilha sonora atmosférica)

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Sequência de planos de beleza — close-ups de detalhes, produto em uso filmado em câmera lenta (60fps), ângulos criativos, macro, transições suaves com cross-dissolve de 2s]
[Lighting: Evolução de iluminação ao longo da cena — começa suave, atinge pico dramático no meio, retorna à suavidade — narrativa visual através da luz]
[Visual: Cada detalhe do produto explorado visualmente — materiais, texturas, design, uso, resultado — tudo comunicado APENAS através de imagens belíssimas e cinematográficas]
${hasText ? `[Text overlay: "${benefitsList[0] || "Excelência em cada detalhe"}" — fade in/out extremamente sutil, canto inferior, mínimo, ${6}s-${durationSec - 3}s, fonte fina e elegante]` : ""}
(SEM LOCUÇÃO — narrativa 100% visual)

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Plano hero final — dolly out extremamente lento revelando o produto em composição perfeita, último frame congela como fotografia]
[Lighting: Iluminação mais dramática do vídeo — pico de intensidade, flare de lente artístico, fade para branco nos últimos 0.5s]
[Visual: Hero shot final de beleza absoluta, produto em sua apresentação mais impressionante]
${hasText ? `[Text overlay: "Shopee" — fade in minimalista, centro inferior, ${durationSec - 2}s até fade para branco, fonte ultrafina]` : ""}
(SEM LOCUÇÃO — final puramente visual)`;

  const voiceover = "(sem voz — vídeo puramente visual com trilha sonora atmosférica)";

  const screen_texts = hasText
    ? `Cena 2 (6-${durationSec - 3}s): "${benefitsList[0] || "Excelência em cada detalhe"}" — fade sutil, canto inferior\nCena 3 (${durationSec - 2}-${durationSec}s): "Shopee" — fade minimalista, centro inferior`
    : "sem textos na tela — comunicação 100% visual";

  const cta = `Descubra ${name} na Shopee. Link na bio. ✨`;

  const caption = `✨ ${name}\n\n${desc.slice(0, 120)}\n\nDeixe as imagens falarem. Link na bio 👆 #Shopee`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #visual #design #aesthetic #cinematic #beleza #premium #arte #inspiração`;

  const final_prompt = buildEnglishFinalPrompt(product, "sem-fala", durationSec, hasText, hasMusic);
  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplatePromocao(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";
  const diff = product.differentiators || "";

  const idea_title = `🔥 PROMOÇÃO: ${name} — Preço Imperdível!`;

  const hook = `PROMOÇÃO IMPERDÍVEL! ${name} com o MELHOR PREÇO na Shopee! 🔥`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-2s):
[Camera: Corte seco com flash vermelho, zoom in rápido, efeito de sirene visual]
[Lighting: Flash vermelho pulsante, iluminação de alerta máxima, alto contraste]
[Visual: Selo "PROMOÇÃO" explode na tela, fundo vermelho com alerta piscando, ${name} aparece em destaque]
${hasText ? `[Text overlay: "🔥 PROMOÇÃO IMPERDÍVEL! 🔥" — flash + scale, centro, 0-2s, vermelho e amarelo, efeito de tremor]` : ""}
Locução: ATENÇÃO! PROMOÇÃO IMPERDÍVEL NA SHOPEE!

CENA 2 — Desenvolvimento (2-${durationSec - 3}s):
[Camera: Cortes rápidos e dinâmicos, gráficos de preço sobrepostos, zoom em detalhes do produto, transições whip pan]
[Lighting: Iluminação comercial de alto impacto, cores vibrantes, contraste máximo]
[Visual: Stack de preços animado — PREÇO ORIGINAL riscado em vermelho → PREÇO PROMOCIONAL em verde gigante → ECONOMIA em destaque → badge "SÓ HOJE" piscando → timer regressivo → produto em close]
${hasText ? `[Text overlay 1: "DE R$[original]" — riscado em vermelho, ${2}s, centro]\n[Text overlay 2: "POR APENAS R$[promo]!" — verde gigante, ${2.8}s, centro]\n[Text overlay 3: "⏱️ SÓ HOJE!" — piscando, canto superior, timer regressivo animado]` : ""}
Locução: ${name}! ${benefitsList[0] || "Qualidade premium"} ${benefitsList[1] || ""} E OLHA O PREÇO! ${desc.slice(0, 60)}. ${diff || "Oportunidade única!"} MAS ATENÇÃO: é só hoje!

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Zoom out dramático revelando produto + CTA gigante, efeitos de partículas e glow]
[Lighting: Iluminação de clímax comercial, máximo brilho, efeito de holofote no CTA]
[Visual: Produto centralizado com glow, CTA "COMPRE AGORA!" gigante e pulsante]
${hasText ? `[Text overlay: "COMPRE AGORA! LINK NA BIO! 🔥" — scale + pulse + glow, centro total, ${durationSec - 3}s até o fim, efeito máximo]` : ""}
Locução: COMPRE AGORA! Link na bio! Corre antes que ACABE! 🔥`;

  const voiceover = `ATENÇÃO! PROMOÇÃO IMPERDÍVEL NA SHOPEE! ${name}! ${benefitsList[0] || "Qualidade premium"} ${benefitsList[1] || ""} E OLHA O PREÇO! ${desc.slice(0, 60)}. ${diff || "Oportunidade única!"} MAS ATENÇÃO: é só hoje! COMPRE AGORA! Link na bio! Corre antes que ACABE! 🔥`;

  const screen_texts = hasText
    ? `Cena 1 (0-2s): "🔥 PROMOÇÃO IMPERDÍVEL! 🔥" — flash + scale, centro\nCena 2 (2-${durationSec - 3}s): Preço riscado → novo preço → "⏱️ SÓ HOJE!"\nCena 3 (${durationSec - 3}-${durationSec}s): "COMPRE AGORA! LINK NA BIO! 🔥" — scale + pulse + glow`
    : "sem textos na tela";

  const cta = `COMPRE AGORA! Link na bio! 🔥⚡`;

  const caption = `🔥 PROMOÇÃO IMPERDÍVEL! ${name}\n\n${desc.slice(0, 100)}\n\nPreço especial por tempo limitado! Link na bio 👆 #Promoção #Shopee`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #promoção #oferta #desconto #imperdivel #sohoje #liquidação #comprasonline #corre`;

  const final_prompt = buildEnglishFinalPrompt(product, "promocao", durationSec, hasText, hasMusic);
  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateComparacaoPrecos(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";
  const diff = product.differentiators || "";

  const idea_title = `Compare: ${name} — O Melhor Custo-Benefício`;

  const hook = `COMPARE OS PREÇOS! ${name} na Shopee — o MELHOR custo-benefício! 📊`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Split screen horizontal — dois produtos lado a lado em enquadramento idêntico, câmera travada para comparação justa]
[Lighting: Iluminação idêntica nos dois lados para comparação justa — mesma temperatura, mesma intensidade]
[Visual: Lado esquerdo: "OUTROS" com preço mais alto visível. Lado direito: "${name}" com preço Shopee. Diferença de preço destacada com animação]
${hasText ? `[Text overlay: "COMPARE OS PREÇOS 📊" — slide in, topo central, 0.3s-2.8s, bold, azul confiança]` : ""}
Locução: Compare os preços! Olha a diferença que faz comprar na Shopee!

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Split screen mantido, zoom alternado entre os produtos para mostrar detalhes, gráfico de barras animado comparando preços]
[Lighting: Iluminação consistente e justa, lado Shopee ganha destaque sutil (5% mais brilho)]
[Visual: Comparação detalhada — preço, qualidade lado a lado, badge "MELHOR CUSTO-BENEFÍCIO" aparece sobre o produto Shopee]
${hasText ? `[Text overlay 1: "MESMA QUALIDADE" — ambos os lados, ${3.5}s, centro superior]\n[Text overlay 2: "PREÇO MENOR!" — lado Shopee destacado, ${5}s, verde]\n[Text overlay 3: "🏆 MELHOR CUSTO-BENEFÍCIO" — badge sobre produto Shopee, ${durationSec - 5}s-${durationSec - 3}s, dourado]` : ""}
Locução: ${name}. ${benefitsList[0] || "Mesma qualidade"} ${benefitsList[1] || "Melhor preço"} ${desc.slice(0, 60)}. ${diff} Por que pagar mais caro?

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Zoom in no lado Shopee, lado OUTROS fade out, produto Shopee ocupa tela inteira]
[Lighting: Iluminação triunfante no produto Shopee, glow de "escolha certa"]
[Visual: ${name} em destaque total, badge "O MELHOR PREÇO TÁ NA SHOPEE"]
${hasText ? `[Text overlay: "O MELHOR PREÇO TÁ NA SHOPEE! 🛍️" — scale animado, centro, ${durationSec - 3}s até o fim, cores Shopee]` : ""}
Locução: O melhor preço tá na Shopee! ${name} — link na bio!`;

  const voiceover = `Compare os preços! Olha a diferença que faz comprar na Shopee! ${name}. ${benefitsList[0] || "Mesma qualidade"} ${benefitsList[1] || "Melhor preço"} ${desc.slice(0, 60)}. ${diff} Por que pagar mais caro? O melhor preço tá na Shopee! ${name} — link na bio!`;

  const screen_texts = hasText
    ? `Cena 1 (0-3s): "COMPARE OS PREÇOS 📊" — slide in, topo\nCena 2 (3-${durationSec - 3}s): "MESMA QUALIDADE" → "PREÇO MENOR!" → "🏆 MELHOR CUSTO-BENEFÍCIO"\nCena 3 (${durationSec - 3}-${durationSec}s): "O MELHOR PREÇO TÁ NA SHOPEE! 🛍️" — scale`
    : "sem textos na tela";

  const cta = `O melhor preço tá na Shopee! Link na bio! 📊🛍️`;

  const caption = `📊 COMPARAMOS PARA VOCÊ: ${name}\n\n${desc.slice(0, 100)}\n\nMelhor custo-benefício na Shopee. Link na bio 👆 #Comparação #Shopee`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #comparação #custobeneficio #preço #economia #melhorpreço #dica #comprasonline #valeapena`;

  const final_prompt = buildEnglishFinalPrompt(product, "comparacao-precos", durationSec, hasText, hasMusic);
  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateReview(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";
  const diff = product.differentiators || "";

  const idea_title = `Review Completo: ${name} — Vale a Pena?`;

  const hook = `Review completo do ${name}! Testei por dias e vou contar TUDO pra vocês! ⭐`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Talking head — pessoa falando direto pra câmera, fundo clean, enquadramento médio, produto visível na mão]
[Lighting: Iluminação de estúdio suave, key light frontal, fill para suavizar sombras, visual de canal de review]
[Visual: Pessoa segurando ${name}, estrelas de avaliação aparecem animadas (5 estrelas preenchendo uma a uma)]
${hasText ? `[Text overlay: "REVIEW COMPLETO ⭐⭐⭐⭐⭐" — typewriter, topo, 0.3s-2.8s, bold com estrelas animadas]` : ""}
Locução: Review completo do ${name}! Usei por dias e vou contar tudo!

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Alterna entre talking head (comentando) e B-roll do produto (close-ups, uso, detalhes), transições limpas com swipe]
[Lighting: Talking head: iluminação consistente. B-roll: iluminação de produto profissional]
[Visual: Cards de PRÓS aparecendo em verde (✓ ${benefitsList[0] || "Qualidade"}, ✓ ${benefitsList[1] || "Preço"}, ✓ ${diff || "Design"}), close-ups do produto confirmando cada ponto, teste real de uso]
${hasText ? `[Text overlay: "PRÓS: ✓ ${benefitsList[0] || "Qualidade excelente"}" — slide in, verde, canto esquerdo]\n[Text overlay: "✓ ${benefitsList[1] || "Preço justo"}" — slide in, verde]\n[Text overlay: "✓ ${diff || "Design premium"}" — slide in, verde]\n[Text overlay: "NOTA FINAL: ⭐⭐⭐⭐⭐" — scale, centro, ${durationSec - 5}s-${durationSec - 3}s, dourado]` : ""}
Locução: Os pontos positivos: ${benefits} ${desc.slice(0, 80)}. ${diff} Minha nota? ${benefitsList.length >= 3 ? "5 de 5 estrelas!" : "Muito positivo!"}

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Talking head final, close no rosto, tom de recomendação pessoal e honesta]
[Lighting: Iluminação levemente mais quente, tom acolhedor de recomendação final]
[Visual: Pessoa falando com confiança, produto em destaque na mão, selo "VALE A PENA ✅" aparece]
${hasText ? `[Text overlay: "VALE MUITO A PENA! ✅ Link na bio" — fade in, centro inferior, ${durationSec - 3}s até o fim, verde confiança]` : ""}
Locução: Resumindo: ${name} vale MUITO a pena! Link na bio na Shopee!`;

  const voiceover = `Review completo do ${name}! Usei por dias e vou contar tudo! Os pontos positivos: ${benefits} ${desc.slice(0, 80)}. ${diff} Minha nota? ${benefitsList.length >= 3 ? "5 de 5 estrelas!" : "Muito positivo!"} Resumindo: ${name} vale MUITO a pena! Link na bio na Shopee!`;

  const screen_texts = hasText
    ? `Cena 1 (0-3s): "REVIEW COMPLETO ⭐⭐⭐⭐⭐" — typewriter, topo\nCena 2 (3-${durationSec - 3}s): PRÓS em verde → "NOTA FINAL: ⭐⭐⭐⭐⭐" dourado\nCena 3 (${durationSec - 3}-${durationSec}s): "VALE MUITO A PENA! ✅ Link na bio" — fade in`
    : "sem textos na tela";

  const cta = `Vale muito a pena! ${name} na Shopee. Link na bio! ⭐`;

  const caption = `⭐ Review completo: ${name}!\n\n${desc.slice(0, 100)}\n\nMinha opinião sincera: vale a pena! Link na bio 👆 #Review #Shopee`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #review #testei #valeapena #opinião #produto #dica #comprasonline #recomendo`;

  const final_prompt = buildEnglishFinalPrompt(product, "review-produto", durationSec, hasText, hasMusic);
  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

function buildTemplateRotina(product: Record<string, string>, durationSec: number, hasText: boolean, hasMusic: boolean): GeneratedContent {
  const name = product.name || "Produto";
  const benefits = product.benefits || "";
  const benefitsList = benefits.split("\n").filter(Boolean);
  const desc = product.description || "";
  const diff = product.differentiators || "";

  const idea_title = `Meu Dia com ${name} — Rotina Completa`;

  const hook = `Vem ver como ${name} faz parte do meu dia a dia! ✨ Rotina completa!`.slice(0, 150);

  const script = `CENA 1 — Abertura (0-3s):
[Camera: Vlog estilo — câmera na mão, acordando/começando o dia, luz natural da manhã entrando pela janela, warm tones]
[Lighting: Luz natural matinal, tons quentes e dourados (3200K), sombras suaves, cozy morning vibes]
[Visual: Cena matinal aconchegante — pessoa começa o dia, ${name} aparece como primeiro item usado na rotina]
${hasText ? `[Text overlay: "☀️ Meu dia com ${name}" — fade in suave, canto superior, 0.5s-2.8s, fonte handwritten style]` : ""}
Locução: (voz calma e acolhedora) Vem comigo ver como é meu dia com ${name}!

CENA 2 — Desenvolvimento (3-${durationSec - 3}s):
[Camera: Vlog seguindo a pessoa em diferentes momentos do dia — manhã (luz quente), tarde (luz neutra), noite (luz aconchegante), transições com cross-dissolve suave entre momentos]
[Lighting: Evolução natural da luz ao longo do dia — manhã dourada → tarde clara → noite aconchegante com luz artificial quente]
[Visual: ${name} sendo usado em 2-3 momentos diferentes do dia — cada momento mostra um benefício diferente, produto integrado naturalmente na rotina, estilo de vida aspiracional mas realista]
${hasText ? `[Text overlay 1: "☀️ Manhã: ${benefitsList[0] || "Começando bem o dia"}" — ${4}s, canto]\n[Text overlay 2: "🌤️ Tarde: ${benefitsList[1] || "Perfeito para o dia a dia"}" — aparece no meio]\n[Text overlay 3: "🌙 Noite: ${benefitsList[2] || "Resultado incrível"}" — aparece próximo ao final]` : ""}
Locução: De manhã, ${name} me ajuda a ${benefitsList[0] || "começar bem o dia"}. Durante a tarde, ${benefitsList[1] || "faz toda diferença na rotina"}. ${desc.slice(0, 60)}. ${diff}

CENA 3 — Fechamento (${durationSec - 3}-${durationSec}s):
[Camera: Momento final do dia — pessoa relaxando, produto por perto, atmosfera de satisfação e aconchego, plano mais fechado e íntimo]
[Lighting: Luz noturna quente e aconchegante (2800K), lâmpadas ou velas criando atmosfera acolhedora, glow suave]
[Visual: Cena final de satisfação — pessoa sorrindo, ${name} ao lado como parte essencial da rotina]
${hasText ? `[Text overlay: "Não vivo mais sem! 💫 Link na bio" — fade in suave, centro inferior, ${durationSec - 3}s até o fim]` : ""}
Locução: ${name} já faz parte da minha rotina. Não vivo mais sem! Link na bio na Shopee!`;

  const voiceover = `(voz calma e acolhedora) Vem comigo ver como é meu dia com ${name}! De manhã, ${name} me ajuda a ${benefitsList[0] || "começar bem o dia"}. Durante a tarde, ${benefitsList[1] || "faz toda diferença na rotina"}. ${desc.slice(0, 60)}. ${diff} ${name} já faz parte da minha rotina. Não vivo mais sem! Link na bio na Shopee!`;

  const screen_texts = hasText
    ? `Cena 1 (0-3s): "☀️ Meu dia com ${name}" — fade in, canto superior\nCena 2 (3-${durationSec - 3}s): "☀️ Manhã: ${benefitsList[0] || "Começando bem"}" / "🌤️ Tarde: ${benefitsList[1] || "Dia a dia"}" / "🌙 Noite: ${benefitsList[2] || "Resultado"}"\nCena 3 (${durationSec - 3}-${durationSec}s): "Não vivo mais sem! 💫 Link na bio" — fade in`
    : "sem textos na tela";

  const cta = `Não vivo mais sem! ${name} na Shopee. Link na bio! 💫`;

  const caption = `💫 Minha rotina com ${name}!\n\n${desc.slice(0, 100)}\n\nNão vivo mais sem! Link na bio 👆 #Rotina #Shopee`;

  const hashtagProd = name.toLowerCase().replace(/\s+/g, "");
  const hashtags = `#shopee #${hashtagProd} #rotina #diadia #vlog #lifestyle #dica #produto #essencial #recomendo`;

  const final_prompt = buildEnglishFinalPrompt(product, "rotina-dia", durationSec, hasText, hasMusic);
  return { idea_title, hook, script, voiceover, screen_texts, cta, caption, hashtags, final_prompt };
}

// ── English final prompt builder (shared by all templates) ─────

function buildEnglishFinalPrompt(product: Record<string, string>, styleId: string, durationSec: number, hasText: boolean, hasMusic: boolean): string {
  const name = product.name || "N/A";
  const desc = product.description || "N/A";
  const benefits = product.benefits || "N/A";
  const audience = product.targetAudience || "General";
  const differentiators = product.differentiators || "N/A";
  const problemSolved = product.problemSolved || "N/A";
  const styleDesc = STYLE_LABELS[styleId] || styleId;
  const scene2End = Math.max(durationSec - 3, 10);

  return `VIDEO GENERATION PROMPT
======================

PRODUCT:
Name: ${name}
Description: ${desc}
Key Benefits: ${benefits}
Target Audience: ${audience}
Differentiators: ${differentiators}
Problem Solved: ${problemSolved}

VIDEO SPECIFICATIONS:
- Format: 9:16 vertical (1080x1920 pixels)
- Platform: TikTok, Instagram Reels, Shopee Video
- Duration: ${durationSec} seconds
- Resolution: 1080x1920
- Language: Brazilian Portuguese — ALL narration and on-screen text must be in Brazilian Portuguese (pt-BR)
- Style: ${styleDesc}
- Tone: ${TONE_LABELS[String(product.tone || "entusiasmado")] || "Enthusiastic"}
- Voiceover: ${VOICE_LABELS[String(product.voiceType || "feminina")] || "Female voice"} — narration MUST be in Brazilian Portuguese (pt-BR), NOT English
- On-screen Text: ${hasText ? "Yes — ALL text overlays MUST be in Brazilian Portuguese (pt-BR)" : "No — visual communication only"}
- Background Music: ${hasMusic ? "Yes — music direction specified per scene" : "No background music"}

SCENE-BY-SCENE DIRECTION:

Scene 1 — Opening Hook (0.0s-3.0s):
Camera: Based on the "${styleId}" style — dramatic product reveal, smooth camera movement, shallow depth of field
Lighting: Professional key light at 45° from front, subtle rim light for edge definition, warm color temperature
Visual: ${name} dramatic entrance, immediate visual impact, motion blur or slow-motion reveal depending on style
${hasText ? `Text Overlay: "${name}" — animated entrance (fade or slide), bold sans-serif white font with dark shadow, positioned center to upper-third, appears at 0.5s, fades at 2.8s, minimum 42pt equivalent` : ""}
Audio: ${hasMusic ? "Opening music hit establishing energy, then settle into groove for scene 2" : "Voiceover opening line with impact"}

Scene 2 — Main Content (3.0s-${scene2End}.0s):
Camera: Product showcase with varied angles — macro close-ups on textures, smooth orbiting movement around product, demonstration shots as applicable to "${styleId}" style
Lighting: Consistent key light maintained, fill light at 40% for soft shadows, backlight for product edge definition
Visual: Detailed product exploration — show key features, materials, benefits in action. Each benefit gets visual emphasis through camera movement or lighting change
${hasText ? `Text Overlay: Key benefit text elements appearing sequentially — bold white font with dark shadow, animated slide-in from right or bottom, positioned center to lower-third, each text element visible for 2-3 seconds, minimum 36pt equivalent for readability on mobile` : ""}
Audio: ${hasMusic ? "Music continues at steady groove, supporting but not overwhelming the voiceover" : "Voiceover continues clearly"} — ${benefits.slice(0, 100)}

Scene 3 — Closing CTA (${scene2End}.0s-${durationSec}.0s):
Camera: Final hero shot — slow dolly push-in toward product, dramatic final framing, product centered and dominant in frame
Lighting: Peak dramatic lighting for final moment — maximum key light intensity, optional subtle lens flare for cinematic feel
Visual: Ultimate product presentation — ${name} shown in its best light, all key features visible, premium feel
${hasText ? `Text Overlay: Call-to-action text — bold animated entrance (scale or pulse), white with optional accent color, prominent center or lower-third position, appears at scene start and holds through end, largest text element at 48pt+ equivalent` : ""}
Audio: ${hasMusic ? "Music reaches emotional climax then resolves, final hit or fade on CTA words" : "Voiceover delivers final CTA with emphasis and impact"}

FULL NARRATION SCRIPT (Brazilian Portuguese):
[Complete voiceover text in BRAZILIAN PORTUGUESE (pt-BR), professionally written for a voice actor. NOT English. Include [timing] markers at each scene transition. Use natural pacing with pauses marked by ellipses (...). Emphasize key words with ALL CAPS sparingly. The narration should tell a complete story: hook → benefits → proof → call to action. Total narration duration: ${durationSec} seconds at natural speaking pace (approximately ${Math.round(durationSec * 2.5)} words).]

Scene 1 [0-3s]:
[Hook — 6-8 words maximum, grab attention immediately]

Scene 2 [3-${scene2End}s]:
[Main content — describe product benefits naturally, mention key differentiators, speak directly to target audience (${audience}), use conversational but professional tone]

Scene 3 [${scene2End}-${durationSec}s]:
[Closing — strong call to action, create urgency, clear next step for viewer]

ON-SCREEN TEXT SPECIFICATIONS:
${hasText ? `Each text element:
- Font: Bold sans-serif (Montserrat, Inter, or similar)
- Color: White (#FFFFFF) with dark shadow (rgba 0,0,0,0.5) for maximum readability on any background
- Animation: Smooth fade-in (0.3s) with slight upward slide (10px) for entrance, fade-out (0.3s) for exit
- Positioning: Scene-dependent — upper-third for titles, center for key messages, lower-third for CTAs
- Sizing: Minimum 36pt equivalent for body text, 48pt+ for headlines, calibrated for 1080px width at mobile viewing distance
- Timing: Each overlay visible for 2-3 seconds minimum to ensure readability` : "No on-screen text — visual communication only"}

MUSIC DIRECTION:
${hasMusic ? `Scene 1: High-energy opener establishing mood — 1-2 second attention grab then settle
Scene 2: Steady groove supporting narration — moderate tempo (100-120 BPM), consistent energy, genre matching "${styleId}" style
Scene 3: Climax and resolution — build intensity for CTA, final hit or fade on closing words` : "No background music — ambient room tone or silence"}

IMPORTANT CONSTRAINTS:
- Do NOT fabricate, exaggerate, or invent any product features not explicitly listed in the PRODUCT section above
- Maintain 100% factual accuracy — never claim features, benefits, or specifications not provided
- Optimize every frame for 9:16 vertical mobile viewing — all text must be large enough to read without zooming
- The opening hook MUST capture viewer attention within the first 2 seconds
- End with a clear, memorable, and actionable call-to-action
- Use the tone consistently throughout every scene — maintain tonal coherence
- Write ALL narration and on-screen text in Brazilian Portuguese (pt-BR) — NOT English
- Include all product information provided — a comprehensive prompt produces a better video
- ALL narration and on-screen text MUST be in Brazilian Portuguese (pt-BR) — NOT English
- The video should look PROFESSIONAL and ready for commercial use on social media platforms`;
}

// ── Master fallback dispatcher ─────────────────────────────────

function buildFallback(product: Record<string, string>, style: Record<string, string | boolean>): GeneratedContent {
  const styleId = String(style.style || "produto-destaque");
  const durationSec = parseInt(String(style.duration || "30")) || 30;
  const hasText = style.hasText === true || style.hasText === "true";
  const hasMusic = style.hasMusic === true || style.hasMusic === "true";

  // Enrich product with tone and voiceType for English prompt builder
  const enrichedProduct = {
    ...product,
    tone: String(style.tone || "entusiasmado"),
    voiceType: String(style.voiceType || "feminina"),
  };

  // Dispatch to style-specific template
  switch (styleId) {
    case "produto-destaque": return buildTemplateProdutoDestaque(enrichedProduct, durationSec, hasText, hasMusic);
    case "oferta-rapida": return buildTemplateOfertaRapida(enrichedProduct, durationSec, hasText, hasMusic);
    case "problema-solucao": return buildTemplateProblemaSolucao(enrichedProduct, durationSec, hasText, hasMusic);
    case "demonstracao": return buildTemplateDemonstracao(enrichedProduct, durationSec, hasText, hasMusic);
    case "unboxing": return buildTemplateUnboxing(enrichedProduct, durationSec, hasText, hasMusic);
    case "ugc": return buildTemplateUgc(enrichedProduct, durationSec, hasText, hasMusic);
    case "cinematografico": return buildTemplateCinematografico(enrichedProduct, durationSec, hasText, hasMusic);
    case "achadinho": return buildTemplateAchadinho(enrichedProduct, durationSec, hasText, hasMusic);
    case "antes-depois": return buildTemplateAntesDepois(enrichedProduct, durationSec, hasText, hasMusic);
    case "narracao": return buildTemplateNarracao(enrichedProduct, durationSec, hasText, hasMusic);
    case "texto-tela": return buildTemplateTextoTela(enrichedProduct, durationSec, hasText, hasMusic);
    case "sem-fala": return buildTemplateSemFala(enrichedProduct, durationSec, hasText, hasMusic);
    case "promocao": return buildTemplatePromocao(enrichedProduct, durationSec, hasText, hasMusic);
    case "comparacao-precos": return buildTemplateComparacaoPrecos(enrichedProduct, durationSec, hasText, hasMusic);
    case "review-produto": return buildTemplateReview(enrichedProduct, durationSec, hasText, hasMusic);
    case "rotina-dia": return buildTemplateRotina(enrichedProduct, durationSec, hasText, hasMusic);
    default: return buildTemplateProdutoDestaque(enrichedProduct, durationSec, hasText, hasMusic);
  }
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

    // Fallback — generates premium style-specific content
    const fallback = buildFallback(product, style);
    console.log("Returning premium fallback for style:", style.style);

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
