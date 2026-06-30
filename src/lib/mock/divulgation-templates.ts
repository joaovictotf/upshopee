// ── Types ──
export type DivulgationTone = "entusiasmado" | "profissional" | "curioso" | "urgente" | "emocional" | "simples" | "exclusivo" | "desejo";

export type ProductContext = {
  category: string;
  benefit: string;
  audience: string;
};

// ── Keyword detection ──
const CATEGORY_MAP: Array<{ keywords: string[]; context: ProductContext }> = [
  { keywords: ["placa solar","painel solar","energia solar","fotovoltaico","inversor solar","bateria solar","lítio","controlador carga"], context: { category: "Energia Solar", benefit: "Economizar até 90% na conta de luz", audience: "Quem quer reduzir gastos com energia" } },
  { keywords: ["camisa","camiseta","blusa","vestido","calça","bermuda","moda","moletom","biquíni","meia","óculos","bolsa","corrente","pingente","relógio","pulseira","brinco","colar","anel","cinto","chinelo","tênis","sapato","mochila","carteira","jaqueta","casaco","suéter","saia","short","camisa feminina","camisa masculina","regata","body","cropped","macacão","conjunto"], context: { category: "Moda", benefit: "Estilo e conforto por preço justo", audience: "Quem gosta de se vestir bem" } },
  { keywords: ["celular","fone","carregador","smartwatch","notebook","tablet","webcam","ring light","caixa de som","bluetooth","adaptador","película","capa iphone","capa samsung","teclado","mouse","monitor","hdmi","ssd","hub usb","power bank","cabos","suporte veicular","suporte notebook","case","fone bluetooth","fone de ouvido","headset","microfone","stream deck","controle","carregador veicular","carregador turbo"], context: { category: "Eletrônicos", benefit: "Tecnologia que facilita seu dia", audience: "Quem ama tecnologia" } },
  { keywords: ["maquiagem","base","protetor solar","creme","perfume","shampoo","cílios","secador","pincel","máscara facial","argila","beleza","batom","esmalte","sérum","hidratante","óleo corporal","sabonete","esfoliante","demaquilante","protetor labial","kit maquiagem","paleta sombra","delineador","rimel","corretivo","iluminador","contorno","blush","pó compacto","primer","fixador"], context: { category: "Beleza", benefit: "Autoestima e cuidado pessoal", audience: "Quem se cuida" } },
  { keywords: ["panela","air fryer","cafeteira","liquidificador","pote","faca","garrafa térmica","tapete","organizador","prateleira","luminária","toalha","ventilador","caixa organizadora","hermético","tábua","espremedor","ralador","descascador","porta tempero","lixeira","escova","rodo","vassoura","balde","pano microfibra","cesto","cabide","sapateira","porta","espelho","quadro","vela aromática","difusor","capa sofá","almofada","jogo cama","edredom","travesseiro","cortina","persiana"], context: { category: "Casa", benefit: "Mais organização e conforto no seu lar", audience: "Sua casa" } },
  { keywords: ["bola","yoga","faixa elástica","camisa treino","mochila esportiva","futebol","exercício","dry fit","caneleira","luva","joelheira","munhequeira","corda pular","colchonete","peso","halteres","garrafa água","squeeze","bicicleta","patins","skate","sup","nadadeira","óculos natação","touca"], context: { category: "Esportes", benefit: "Performance e saúde em primeiro lugar", audience: "Quem pratica esportes" } },
  { keywords: ["boneca","carrinho","blocos","slime","massinha","pelúcia","brinquedo","lego","montar","controle remoto","jogo tabuleiro","quebra-cabeça","boneco ação","pista carrinho","playmobil","massinha modelar","brinquedo educativo","areia cinética","slime kit","fantoche","dedoche","pião","ioiô","peteca","bambolê","pular corda"], context: { category: "Brinquedos", benefit: "Diversão garantida para as crianças", audience: "Crianças e família" } },
  { keywords: ["pet","cachorro","gato","caminha","fonte","ração","brinquedo interativo","mordedor","coleira","antipulgas","arranhador","caixa transporte","comedouro","bebedouro","areia gato","tapete higiênico","fralda pet","roupa cachorro","petisco","ossinho","bolinha","laser","guia","peitoral","enforcador","focinheira"], context: { category: "Pets", benefit: "Bem-estar e felicidade do seu pet", audience: "Seu pet" } },
];

const DEFAULT_CONTEXT: ProductContext = { category: "Produto", benefit: "Custo-benefício excelente", audience: "Você" };

export function inferProductContext(productName: string): ProductContext {
  const n = productName.toLowerCase();
  for (const entry of CATEGORY_MAP) {
    if (entry.keywords.some((k) => n.includes(k))) return entry.context;
  }
  return DEFAULT_CONTEXT;
}

// ── 8 tones × 4 templates each = 32 templates ──
const TONE_TEMPLATES: Record<DivulgationTone, string[]> = {
  // 1. ENTUSIASMADO — alta energia, exclamações, emojis
  entusiasmado: [
    "🔥 ACABEI DE ACHAR! {nome} na Shopee e tô CHOCADA! 😍 {beneficio}! Corre que o preço tá surreal! 🏃‍♀️💨\n{link}",
    "GENTE!!! {nome} — isso aqui é MUITO bom! 🤩 {beneficio}. Comprei, chegou rápido e já virei fã! Dá uma olhada! 🔥\n{link}",
    "PARE TUDO! 🛑 {nome} com preço que faz sentido! {beneficio}. Já garanti o meu e vim correndo avisar! ⚡\n{link}",
    "MELHOR COMPRA DO ANO! 🏆 {nome} entregou TUDO que prometeu. {beneficio}. Tô indicando pra todo mundo! 🎯\n{link}",
  ],
  // 2. PROFISSIONAL — análise técnica, credibilidade
  profissional: [
    "📊 Análise: {nome} — {beneficio}. Material de qualidade comprovada, entrega dentro do prazo e suporte confiável. Recomendo para {publico}.\n{link}",
    "✅ {nome} avaliado e aprovado. Especificações conferem com o anúncio. {beneficio}. Ótima aquisição para quem valoriza eficiência.\n{link}",
    "🛡️ Review técnico: {nome}. {beneficio}. Testei por 15 dias antes de opinar. Resultado consistente. Indicado para {publico}.\n{link}",
    "📋 Ficha técnica verificada: {nome} atende aos padrões esperados. {beneficio}. Custo-benefício competitivo no mercado atual.\n{link}",
  ],
  // 3. CURIOSO — pergunta-gancho, curiosidade, revelação
  curioso: [
    "Sabe o que eu descobri essa semana? 🤔 {nome}. {beneficio}. Demorei pra testar, mas quando testei... nossa. Dá uma olhada:\n{link}",
    "Quanto você acha que custa {nome}? Provavelmente mais do que o preço real. {beneficio}. Clique e se surpreenda:\n{link}",
    "Segredo revelado: {nome} é o motivo pelo qual {beneficio}. Eu não sabia disso até experimentar. Veja você também:\n{link}",
    "Você já ouviu falar de {nome}? Eu não conhecia até semana passada. {beneficio}. Agora não vivo sem. Confira:\n{link}",
  ],
  // 4. URGENTE — escassez, FOMO, ação imediata
  urgente: [
    "⚠️ ATENÇÃO: {nome} está com estoque baixíssimo! {beneficio}. Não deixa pra amanhã o que você pode garantir hoje.\n{link}",
    "ÚLTIMA CHANCE! {nome} por esse preço não vai durar. {beneficio}. Eu já garanti o meu — agora é sua vez:\n{link}",
    "ESGOTANDO! {nome} — {beneficio}. Quando eu vi o preço, comprei na hora. Depois não diz que eu não avisei.\n{link}",
    "SÓ HOJE! {nome} disponível. {beneficio}. Oportunidades assim não aparecem sempre. Aproveite agora:\n{link}",
  ],
  // 5. EMOCIONAL — storytelling, transformação pessoal, conexão
  emocional: [
    "Quando eu recebi {nome}, confesso que me emocionei. 💝 {beneficio}. Parece exagero, mas fez diferença real na minha rotina. Espero que faça na sua também.\n{link}",
    "Sabe aquele produto que muda sua relação com {publico}? {nome} fez isso comigo. {beneficio}. De coração, recomendo:\n{link}",
    "Eu não esperava me apegar tanto a {nome}. Mas {beneficio}. Às vezes a gente acha que é só mais um produto, até ele provar o contrário.\n{link}",
    "Minha história com {nome} começou com desconfiança e terminou com gratidão. {beneficio}. Se permite viver isso também:\n{link}",
  ],
  // 6. SIMPLES — direto, amigável, mínimo
  simples: [
    "Olha que legal: {nome} na Shopee! 😊 {beneficio}. Gostei bastante, chegou certinho. Dá uma olhada:\n{link}",
    "{nome} — preço bom, entrega rápida. {beneficio}. Recomendo! 👍\n{link}",
    "Comprei {nome} e curti. {beneficio}. Nada muito complicado — só um produto bom com preço justo.\n{link}",
    "{nome} na Shopee. {beneficio}. Simples assim. Se serve pra você, o link tá aí:\n{link}",
  ],
  // 7. EXCLUSIVO — VIP, premium, acesso limitado
  exclusivo: [
    "👑 Seleção especial: {nome}. {beneficio}. Poucas unidades disponíveis para {publico} que valoriza o melhor. Garanta o seu:\n{link}",
    "Nem todo mundo vai ter {nome}. Mas {publico} que exige {beneficio} merece. Edição limitada:\n{link}",
    "🌟 {nome} — curadoria premium para {publico}. {beneficio}. Não é para qualquer um. É para você:\n{link}",
    "Exclusividade tem nome: {nome}. {beneficio}. Quando acabar, não sei se volta. Aproveite:\n{link}",
  ],
  // 8. DESEJO — aspiracional, lifestyle, auto-presente
  desejo: [
    "Imagina chegar {nome} na sua casa hoje... ✨ {beneficio}. Você merece esse presente. Se permita:\n{link}",
    "Você trabalhou duro essa semana. {nome} é aquela recompensa que {beneficio}. Vai, você merece:\n{link}",
    "Sonhei com {nome} por semanas antes de comprar. {beneficio}. E valeu cada centavo. Realize o seu também:\n{link}",
    "Sabe quando você olha algo e pensa 'é isso que eu quero'? {nome} foi assim pra mim. {beneficio}. Clique e se dê esse prazer:\n{link}",
  ],
};

// ── Generator ──
export function generateDivulgationText(productName: string, tone: DivulgationTone): string {
  const ctx = inferProductContext(productName);
  const templates = TONE_TEMPLATES[tone] ?? TONE_TEMPLATES.curioso;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template
    .replace(/\{nome\}/g, productName.trim())
    .replace(/\{beneficio\}/g, ctx.benefit)
    .replace(/\{publico\}/g, ctx.audience)
    .replace(/\{link\}/g, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}
