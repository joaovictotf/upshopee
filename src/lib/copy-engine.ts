/**
 * Gerador de copy para divulgação em grupos — 100% offline, sem API e sem dependências.
 *
 * A ideia central: nada de template fixo. Cada texto é montado a partir de blocos
 * intercambiáveis (abertura, produto, benefício, preço, urgência, CTA, link), sorteados
 * de forma independente. Dois afiliados que divulguem o mesmo produto, no mesmo grupo,
 * no mesmo minuto, praticamente não têm como publicar o mesmo texto — e texto idêntico
 * repetido é justamente o que faz cair em filtro de spam.
 *
 * O mapa de palavras-chave → contexto (categoria/benefício/público) foi herdado de
 * src/lib/mock/divulgation-templates.ts e ampliado para cobrir o catálogo real
 * (colecionáveis, Copa, presentes, automotivo, ferramentas, papelaria, bebê, saúde).
 */

const TONES = [
  "Direto",
  "Oferta urgente",
  "Simples",
  "Profissional",
  "Chamativo",
  "Grupo de WhatsApp",
  "Grupo do Facebook",
] as const;

export type CopyTone = (typeof TONES)[number];

export type CopyInput = {
  name: string;
  description: string;
  link: string;
  price?: number;
  tone: CopyTone;
};

// ─── Contexto por palavra-chave ──────────────────────────────────────────────

type ProductContext = {
  category: string;
  benefit: string;
  audience: string;
};

/**
 * Benefícios e públicos são escritos em minúscula e como sintagma nominal
 * ("economia de até 90% na conta de luz", "quem tem pet"). Isso permite encaixar
 * o mesmo valor em dezenas de moldes diferentes sem quebrar a concordância.
 */
const CATEGORY_MAP: Array<{ keywords: string[]; context: ProductContext }> = [
  {
    keywords: ["placa solar", "painel solar", "energia solar", "fotovoltaico", "inversor solar", "bateria solar", "controlador carga", "gerador solar"],
    context: { category: "Energia Solar", benefit: "economia de até 90% na conta de luz", audience: "quem quer parar de tomar susto com a conta de luz" },
  },
  {
    keywords: ["album", "álbum", "figurinha", "panini", "colecionavel", "colecionável", "card colecionavel", "miniatura", "action figure", "funko", "carta rara", "booster"],
    context: { category: "Colecionáveis", benefit: "aquela peça que faltava pra fechar a coleção", audience: "quem coleciona" },
  },
  {
    keywords: ["copa do mundo", "selecao brasileira", "seleção brasileira", "camisa do brasil", "torcedor", "chuteira", "bola de futebol", "escudo cbf", "camisa argentina", "kit torcedor", "bandeira do brasil"],
    context: { category: "Futebol e Copa", benefit: "aquele clima de Copa que contagia todo mundo", audience: "quem é apaixonado por futebol" },
  },
  {
    keywords: ["presente", "buque", "buquê", "rosa eterna", "pelucia", "pelúcia", "ursinho", "caixa coracao", "caixa coração", "dia dos namorados", "namorada", "namorado", "aniversario", "aniversário", "dia das maes", "dia das mães", "cesta"],
    context: { category: "Presentes", benefit: "presente que agrada de verdade sem precisar gastar muito", audience: "quem quer acertar no presente" },
  },
  {
    keywords: ["bebe", "bebê", "fralda", "mamadeira", "chupeta", "berco", "berço", "carrinho de bebe", "chocalho", "babador", "infantil", "papinha", "banheira bebe"],
    context: { category: "Bebê e Infantil", benefit: "praticidade e segurança na rotina com criança pequena", audience: "quem tem bebê em casa" },
  },
  {
    keywords: ["pet", "cachorro", "gato", "caminha", "racao", "ração", "mordedor", "coleira", "antipulgas", "arranhador", "caixa transporte", "comedouro", "bebedouro", "areia gato", "tapete higienico", "roupa cachorro", "petisco", "peitoral", "focinheira", "guia pet"],
    context: { category: "Pets", benefit: "bem-estar e felicidade do pet", audience: "quem tem pet" },
  },
  {
    keywords: ["massageador", "massage gun", "ortopedico", "ortopédico", "postura", "corretor postural", "suplemento", "balanca digital", "balança digital", "termometro", "termômetro", "medidor pressao", "alivio dor", "bolsa termica", "bolsa térmica", "joelheira", "palmilha"],
    context: { category: "Saúde e Bem-estar", benefit: "alívio de verdade e mais conforto no corpo", audience: "quem vive com dor ou tensão no fim do dia" },
  },
  {
    keywords: ["maquiagem", "base", "protetor solar", "creme", "perfume", "shampoo", "cilios", "cílios", "secador", "pincel", "mascara facial", "argila", "batom", "esmalte", "serum", "sérum", "hidratante", "oleo corporal", "sabonete", "esfoliante", "demaquilante", "kit maquiagem", "paleta sombra", "delineador", "rimel", "corretivo", "iluminador", "blush", "po compacto", "primer", "skincare", "escova secadora", "alisadora", "aparador de barba", "chapinha"],
    context: { category: "Beleza", benefit: "autoestima lá em cima e aquele cuidado que faz falta", audience: "quem gosta de se cuidar" },
  },
  {
    keywords: ["celular", "fone", "carregador", "smartwatch", "notebook", "tablet", "webcam", "ring light", "caixa de som", "bluetooth", "adaptador", "pelicula", "película", "capa iphone", "capa samsung", "teclado", "mouse", "monitor", "hdmi", "ssd", "hub usb", "power bank", "suporte notebook", "fone de ouvido", "headset", "microfone", "projetor", "umidificador", "aspirador", "tripe", "tripé", "smart tv", "roteador", "pendrive"],
    context: { category: "Eletrônicos", benefit: "tecnologia que facilita o dia a dia de verdade", audience: "quem gosta de tecnologia" },
  },
  {
    keywords: ["automotivo", "veicular", "suporte veicular", "carregador veicular", "pneu", "som automotivo", "capa banco", "tapete carro", "cera automotiva", "limpa vidro", "calibrador", "aspirador veicular", "cabo chupeta"],
    context: { category: "Automotivo", benefit: "mais praticidade e cuidado com o carro", audience: "quem passa o dia dirigindo" },
  },
  {
    keywords: ["furadeira", "parafusadeira", "chave de fenda", "kit ferramenta", "trena", "alicate", "serra", "martelo", "esmerilhadeira", "lixadeira", "solda", "multimetro", "multímetro", "caixa ferramenta"],
    context: { category: "Ferramentas", benefit: "o serviço resolvido em casa sem precisar chamar ninguém", audience: "quem gosta de resolver por conta própria" },
  },
  {
    keywords: ["caderno", "caneta", "planner", "agenda", "mochila escolar", "estojo", "marca texto", "papelaria", "impressora", "cartucho", "post it", "fichario", "fichário", "calculadora", "grampeador"],
    context: { category: "Papelaria", benefit: "organização e foco no estudo e no trabalho", audience: "quem estuda ou trabalha em casa" },
  },
  {
    keywords: ["yoga", "faixa elastica", "camisa treino", "dry fit", "corda pular", "colchonete", "halteres", "squeeze", "bicicleta", "patins", "skate", "oculos natacao", "óculos natação", "touca", "caneleira", "munhequeira", "academia", "musculacao", "musculação", "elastico treino"],
    context: { category: "Esportes", benefit: "performance e saúde em primeiro lugar", audience: "quem treina" },
  },
  {
    keywords: ["boneca", "carrinho", "blocos", "slime", "massinha", "brinquedo", "lego", "controle remoto", "jogo tabuleiro", "quebra-cabeca", "quebra-cabeça", "boneco", "pista carrinho", "areia cinetica", "fantoche", "piao", "pião", "bambole", "bambolê"],
    context: { category: "Brinquedos", benefit: "diversão garantida pra criançada", audience: "quem tem criança em casa" },
  },
  {
    keywords: ["camisa", "camiseta", "blusa", "vestido", "calca", "calça", "bermuda", "moletom", "biquini", "biquíni", "meia", "oculos", "óculos", "bolsa", "corrente", "pingente", "relogio", "relógio", "pulseira", "brinco", "colar", "anel", "cinto", "chinelo", "tenis", "tênis", "sapato", "mochila", "carteira", "jaqueta", "casaco", "sueter", "suéter", "saia", "short", "regata", "cropped", "macacao", "macacão", "moda", "bone", "boné", "polo"],
    context: { category: "Moda", benefit: "estilo e conforto por um preço justo", audience: "quem gosta de se vestir bem" },
  },
  {
    keywords: ["panela", "air fryer", "cafeteira", "liquidificador", "pote", "faca", "garrafa termica", "garrafa térmica", "tapete", "organizador", "prateleira", "luminaria", "luminária", "toalha", "ventilador", "caixa organizadora", "hermetico", "hermético", "tabua", "tábua", "espremedor", "ralador", "porta tempero", "lixeira", "vassoura", "balde", "pano microfibra", "cesto", "cabide", "espelho", "vela aromatica", "difusor", "capa sofa", "almofada", "jogo cama", "edredom", "travesseiro", "cortina", "abajur", "cozinha", "banheiro"],
    context: { category: "Casa", benefit: "mais organização e conforto dentro de casa", audience: "quem cuida da casa" },
  },
];

const DEFAULT_CONTEXT: ProductContext = {
  category: "Achadinhos",
  benefit: "um custo-benefício difícil de achar por aí",
  audience: "você",
};

const deburr = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Escolhe o contexto pela palavra-chave MAIS LONGA encontrada no texto, e não pela
 * primeira da lista. Assim "camisa da seleção brasileira" cai em Futebol (via
 * "seleção brasileira") e não em Moda (via "camisa"), sem depender da ordem do array.
 */
function inferProductContext(text: string): ProductContext {
  const hay = deburr(text);
  let best = DEFAULT_CONTEXT;
  let bestLen = 0;
  for (const entry of CATEGORY_MAP) {
    for (const keyword of entry.keywords) {
      const k = deburr(keyword);
      if (k.length > bestLen && hay.includes(k)) {
        bestLen = k.length;
        best = entry.context;
      }
    }
  }
  return best;
}

// ─── Blocos ──────────────────────────────────────────────────────────────────
// Tokens disponíveis: {NOME} (com destaque) {oque} {Oque} {beneficio} {Beneficio}
//                     {publico} {Publico} {categoria} {preco}

const OPENERS: Record<CopyTone, string[]> = {
  "Direto": [
    "Achei e já trago pra vocês:",
    "Direto ao ponto:",
    "Vale o clique:",
    "Separei esse aqui:",
    "Olha esse:",
    "Indicação rápida:",
    "Achado do dia:",
    "Sem enrolação:",
    "Esse aqui merece atenção:",
    "Passando rápido pra deixar essa:",
    "Anota essa:",
    "Deixo aqui a dica:",
  ],
  "Oferta urgente": [
    "🔥 Corre que é por tempo limitado!",
    "🚨 Últimas unidades!",
    "⏰ Promoção relâmpago!",
    "⚡ É agora ou nunca!",
    "🔥 Baixou agora e não deve durar!",
    "🚨 Atenção: estoque acabando!",
    "⏰ Última chance!",
    "🔥 Oportunidade rápida — corre!",
    "⚡ Quem ver primeiro leva!",
    "🚨 Tá voando, corre!",
    "⏰ Acaba hoje!",
    "🔥 Alerta de oferta!",
  ],
  "Simples": [
    "Achei bom e vim contar.",
    "Olha que legal:",
    "Passando pra indicar:",
    "Encontrei isso aqui:",
    "Uma dica rapidinha:",
    "Vim deixar essa aqui:",
    "Descobri e gostei:",
    "Coisa boa:",
    "Deixa eu mostrar uma coisa:",
    "Achadinho simples:",
    "Vou deixar aqui, vai que serve:",
    "Uma indicação sincera:",
  ],
  "Profissional": [
    "Análise rápida do produto:",
    "Vale uma avaliação:",
    "Compartilho uma recomendação:",
    "Indicação baseada no que o produto entrega:",
    "Segue uma sugestão avaliada:",
    "Recomendação da semana:",
    "Avaliação objetiva:",
    "Um produto que merece consideração:",
    "Selecionei com critério:",
    "Para quem busca custo-benefício:",
    "Ficha rápida:",
    "Item verificado e recomendado:",
  ],
  "Chamativo": [
    "✨ OLHA ISSO ✨",
    "💥 PRECISA VER 💥",
    "🤩 ACHADINHO TOP 🤩",
    "🔥 TÁ VOANDO 🔥",
    "😱 EU NÃO ACREDITEI 😱",
    "🚀 ISSO AQUI É OUTRO NÍVEL 🚀",
    "💎 ACHADO DO DIA 💎",
    "🤯 GENTE, OLHA SÓ 🤯",
    "⭐ O QUERIDINHO DO MOMENTO ⭐",
    "💥 PAREI TUDO PRA POSTAR ISSO 💥",
    "🔥 O QUE TÁ BOMBANDO 🔥",
    "✨ VOCÊ PRECISA CONHECER ✨",
  ],
  "Grupo de WhatsApp": [
    "Gente, olha esse achadinho 👀",
    "Oi pessoal! Achei isso e precisava mostrar 🛍️",
    "Corre ver isso aqui 🏃‍♀️",
    "Achadinho da semana 💥",
    "Passando rapidinho pra mostrar isso 😍",
    "Olha o que eu achei 🤩",
    "Vocês precisam ver isso ✨",
    "Gente, esse aqui vale a pena 🛒",
    "Achei e já corri pra contar 💨",
    "Tô até agora impressionada com isso 😱",
    "Deixa eu mostrar uma coisa 👇",
    "Olha isso, gente 🔥",
  ],
  "Grupo do Facebook": [
    "Pessoal, encontrei um produto que vale a pena compartilhar aqui no grupo.",
    "Passando para deixar uma dica que pode ajudar bastante quem procura algo assim.",
    "Achei essa oferta navegando e resolvi trazer para o grupo.",
    "Vim compartilhar um achado que gostei bastante e acho que vocês também vão gostar.",
    "Olha só o que encontrei hoje e precisava dividir com vocês.",
    "Fiz questão de trazer essa dica aqui porque sei que muita gente procura por isso.",
    "Encontrei esse produto e achei que combina bastante com o pessoal do grupo.",
    "Deixo aqui uma indicação para quem estava procurando algo do tipo.",
    "Estava pesquisando e acabei achando algo que merece ser compartilhado.",
    "Trago para vocês um achado que me surpreendeu positivamente.",
    "Aproveitando o grupo para deixar uma recomendação sincera.",
    "Vi esse produto e lembrei de quem já perguntou sobre isso por aqui.",
  ],
};

/**
 * Aberturas que citam preço só entram em jogo quando o usuário informou um preço.
 * Sem isso, um post sem preço abriria com "Olha esse preço" e nenhum valor no corpo —
 * o tipo de incoerência que denuncia texto gerado.
 */
const PRICE_OPENERS: Partial<Record<CopyTone, string[]>> = {
  "Oferta urgente": ["🔥 O preço caiu — corre!", "⚡ Só hoje com esse preço!"],
  "Chamativo": ["😱 NÃO ACREDITEI NO PREÇO 😱", "💸 OLHA ESSE PREÇO 💸"],
  "Grupo de WhatsApp": ["Olha esse preço, gente 🔥", "Gente, o preço desse aqui 😱"],
  "Direto": ["Preço bom, vale o clique:"],
};

/**
 * Nenhuma variante usa artigo antes de {NOME} ("o", "a", "do", "da"). O nome vem
 * digitado pelo usuário e pode ter qualquer gênero — "É o Camisa" quebraria o texto.
 */
const PRODUCT_LINES: Record<CopyTone, string[]> = {
  "Direto": [
    "{NOME} — {oque}.",
    "{NOME}. {Oque}.",
    "{NOME}: {oque}.",
    "Produto: {NOME} — {oque}.",
    "{NOME}\n{Oque}.",
    "Se chama {NOME}. {Oque}.",
  ],
  "Oferta urgente": [
    "{NOME} — {oque}.",
    "{NOME}. {Oque}.",
    "É {NOME}: {oque}.",
    "{NOME}\n{Oque}.",
    "Produto: {NOME} — {oque}.",
    "{NOME} • {Oque}.",
  ],
  "Simples": [
    "{NOME} — {oque}.",
    "{NOME}. {Oque}.",
    "{NOME}: {oque}.",
    "{NOME}\n{Oque}.",
    "Se chama {NOME}. {Oque}.",
    "Produto: {NOME}. {Oque}.",
  ],
  "Profissional": [
    "{NOME} — {oque}.",
    "{NOME}. {Oque}.",
    "Produto: {NOME}. {Oque}.",
    "{NOME}: {oque}.",
    "Trata-se de {NOME}. {Oque}.",
    "{NOME}\n{Oque}.",
  ],
  "Chamativo": [
    "{NOME} — {oque}!",
    "{NOME}! {Oque}.",
    "{NOME}\n{Oque}!",
    "É {NOME}: {oque}!",
    "{NOME} 👉 {Oque}.",
    "Chegou {NOME}! {Oque}.",
  ],
  "Grupo de WhatsApp": [
    "{NOME}\n{Oque}.",
    "{NOME} — {oque}.",
    "{NOME}\n👉 {Oque}.",
    "É {NOME}!\n{Oque}.",
    "{NOME}\n✅ {Oque}.",
    "Produto: {NOME}\n{Oque}.",
  ],
  "Grupo do Facebook": [
    "{NOME} — {oque}.",
    "{NOME}. {Oque}.",
    "Trata-se de {NOME} — {oque}.",
    "O produto é {NOME}. {Oque}.",
    "{NOME}: {oque}.",
    "Estou falando de {NOME}. {Oque}.",
  ],
};

const BENEFITS: Record<CopyTone, string[]> = {
  "Direto": [
    "O ponto forte: {beneficio}.",
    "Na prática: {beneficio}.",
    "O que você leva: {beneficio}.",
    "Vantagem real: {beneficio}.",
    "{Beneficio}, direto assim.",
    "Feito pra quem busca {beneficio}.",
    "Motivo pra levar: {beneficio}.",
    "Sem mistério: {beneficio}.",
    "Faz diferença pra {publico}.",
    "Se você procura algo de {categoria}, é uma boa.",
  ],
  "Oferta urgente": [
    "E o melhor: {beneficio}.",
    "Ainda entrega {beneficio}.",
    "{Beneficio} — por isso some rápido.",
    "Quem procura {beneficio} não deixa passar.",
    "Vale pelo que entrega: {beneficio}.",
    "Não é só a oferta: {beneficio}.",
    "Perfeito pra {publico}.",
    "{Beneficio}, e sai voando.",
    "O motivo do estoque sumir: {beneficio}.",
    "{Publico} já entendeu o porquê.",
  ],
  "Simples": [
    "Gostei porque entrega {beneficio}.",
    "Ponto positivo: {beneficio}.",
    "{Beneficio}, sem enrolação.",
    "Simples assim: {beneficio}.",
    "Serve bem pra {publico}.",
    "Ajuda bastante quem procura {beneficio}.",
    "O bom mesmo é {beneficio}.",
    "Nada complicado, só {beneficio}.",
    "Vale pra {publico}.",
    "No fim das contas: {beneficio}.",
  ],
  "Profissional": [
    "Principal benefício: {beneficio}.",
    "Destaque do produto: {beneficio}.",
    "Entrega {beneficio}, o que justifica a indicação.",
    "Atende bem {publico}.",
    "Diferencial: {beneficio}.",
    "O retorno percebido está em {beneficio}.",
    "Recomendado especialmente para {publico}.",
    "{Beneficio} — é o que sustenta a recomendação.",
    "Custo-benefício equilibrado: {beneficio}.",
    "Entre as opções de {categoria}, se destaca por {beneficio}.",
  ],
  "Chamativo": [
    "E olha: {beneficio}! 😍",
    "O melhor de tudo: {beneficio}!",
    "{Beneficio} — simplesmente perfeito!",
    "{Publico} vai amar! 💖",
    "Entrega {beneficio} e ainda é lindo! ✨",
    "Não é só bonito não: {beneficio}! 🔥",
    "Vale cada centavo: {beneficio}!",
    "Surpreende de verdade: {beneficio}! 🤩",
    "Feito pra {publico}! 🎯",
    "Tá bombando por causa disso: {beneficio}! 🚀",
  ],
  "Grupo de WhatsApp": [
    "E o melhor: {beneficio} 😍",
    "{Beneficio} 🙌",
    "Vale muito pra {publico} 💚",
    "Adorei porque entrega {beneficio}",
    "Sério, {beneficio} 👏",
    "O bom mesmo é {beneficio} ✨",
    "{Publico} vai amar 💖",
    "Ponto alto: {beneficio} ⭐",
    "Comprei pensando em {beneficio} e não me arrependi",
    "Resolve certinho pra {publico} ✅",
  ],
  "Grupo do Facebook": [
    "O que mais me chamou atenção foi {beneficio}.",
    "O grande diferencial está em {beneficio}.",
    "Vale destacar {beneficio}, que faz bastante diferença no dia a dia.",
    "Recomendo principalmente para {publico}.",
    "Entrega exatamente o que promete quando o assunto é {beneficio}.",
    "Para {publico}, é o tipo de produto que resolve de verdade.",
    "{Beneficio} é o ponto que mais pesa a favor.",
    "O que conta mesmo no fim das contas é {beneficio}.",
    "Quem procura {beneficio} dificilmente vai se decepcionar.",
    "Para quem acompanha {categoria}, é uma boa oportunidade.",
  ],
};

const PRICE_LINES: Record<CopyTone, string[]> = {
  "Direto": [
    "Sai por {preco}.",
    "Preço: {preco}.",
    "Custa {preco}.",
    "{preco} no link.",
    "Valor: {preco}.",
    "Tá {preco}.",
  ],
  "Oferta urgente": [
    "Saindo por {preco}!",
    "De olho: {preco}.",
    "Por {preco} neste momento.",
    "{preco} enquanto durar.",
    "Preço agora: {preco}.",
    "Fecha por {preco}.",
  ],
  "Simples": [
    "Custa {preco}.",
    "Preço: {preco}.",
    "Sai por {preco}.",
    "Tá {preco}.",
    "Valor: {preco}.",
    "Por {preco}.",
  ],
  "Profissional": [
    "Investimento: {preco}.",
    "Valor atual: {preco}.",
    "Disponível por {preco}.",
    "Preço praticado: {preco}.",
    "Custo: {preco}.",
    "Faixa de preço: {preco}.",
  ],
  "Chamativo": [
    "Por apenas {preco}! 😱",
    "SÓ {preco}! 💥",
    "{preco} — sério mesmo! 🤯",
    "Preço: {preco} 🔥",
    "Saindo a {preco}! ✨",
    "Olha o preço: {preco}! 👀",
  ],
  "Grupo de WhatsApp": [
    "Sai por {preco} 😱",
    "{preco} 🔥",
    "Tá {preco} agora",
    "Por apenas {preco} 💸",
    "Preço: {preco} ✅",
    "Olha o preço 👉 {preco}",
  ],
  "Grupo do Facebook": [
    "Está saindo por {preco}.",
    "O valor atual é {preco}.",
    "Encontrei por {preco}.",
    "O preço está em {preco}, o que considerei justo.",
    "Disponível por {preco}.",
    "Custa {preco} no momento.",
  ],
};

/** Só entram no tom "Oferta urgente". */
const URGENCY_LINES: string[] = [
  "Estoque baixo, não deixa pra depois.",
  "Quando acabar, não sei se volta.",
  "Os primeiros levam, os outros ficam no arrependimento.",
  "Essa oferta não fica o dia todo.",
  "Já vi sumir mais rápido que isso.",
  "Cada minuto conta nessa.",
  "Não dá pra garantir que amanhã ainda tem.",
  "Amanhã pode estar esgotado.",
  "Corre antes que zere.",
  "Promoção assim não aparece toda semana.",
];

const CTAS: Record<CopyTone, string[]> = {
  "Direto": [
    "Link abaixo.",
    "Confere no link.",
    "Tá tudo no link.",
    "Dá uma olhada:",
    "Só clicar:",
    "Detalhes no link:",
    "Segue o link:",
    "Clica e confere:",
  ],
  "Oferta urgente": [
    "Garante o seu agora:",
    "Corre no link:",
    "Pega o seu antes que acabe:",
    "Toca no link e aproveita:",
    "Aproveita enquanto tem:",
    "Clica antes que suma:",
    "Link aqui, vai rápido:",
    "Não perde essa:",
  ],
  "Simples": [
    "Link aqui:",
    "Dá uma olhada:",
    "Se quiser ver:",
    "Tá no link:",
    "Confere se gostar:",
    "Deixo o link:",
    "Olha aí:",
    "Se servir pra você, o link tá abaixo:",
  ],
  "Profissional": [
    "Detalhes completos no link:",
    "Informações no link abaixo:",
    "Confira as especificações:",
    "Acesse para avaliar:",
    "Disponível no link:",
    "Veja a página do produto:",
    "Link para consulta:",
    "Avalie você mesmo:",
  ],
  "Chamativo": [
    "CORRE NO LINK! 🏃‍♀️💨",
    "CLICA AQUI 👇",
    "GARANTE O SEU! 🛒",
    "Toca no link e vai! ⚡",
    "Link logo abaixo 👇🔥",
    "NÃO PERDE ESSA! 💥",
    "Vai lá conferir! 👀",
    "Aproveita! 🎉",
  ],
  "Grupo de WhatsApp": [
    "Link aqui 👇",
    "Corre lá 🏃‍♀️",
    "Toca no link 👇",
    "Garante o seu 🛒",
    "Dá uma olhada 👀",
    "Tá tudo no link ⬇️",
    "Aproveita 💨",
    "Clica aqui e vê 👇",
  ],
  "Grupo do Facebook": [
    "Quem tiver interesse, o link está logo abaixo.",
    "Deixo o link para quem quiser conferir os detalhes.",
    "O link está aqui embaixo para quem quiser dar uma olhada.",
    "Segue o link para quem se interessar.",
    "Quem quiser ver mais informações, é só acessar o link.",
    "Coloco o link abaixo para facilitar.",
    "Basta clicar no link para conferir.",
    "O link com todos os detalhes está a seguir.",
  ],
};

/** Usado quando o campo "o que ele faz" vem vazio. */
const NAME_ONLY_LINES: string[] = ["{NOME}.", "Produto: {NOME}.", "{NOME}"];

// ─── Montagem ────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function upperFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Minúscula na primeira letra para encaixar a descrição no meio de uma frase —
 * mas preserva siglas e nomes próprios ("LED de alta potência" continua "LED...").
 */
function lowerFirst(s: string): string {
  if (!s) return s;
  const firstWord = s.split(/\s/)[0];
  if (firstWord.length > 1 && firstWord === firstWord.toUpperCase()) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function cleanDescription(raw: string): string {
  return raw.trim().replace(/[\s.;,!]+$/, "");
}

function formatPrice(price?: number): string | null {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** No WhatsApp o asterisco é negrito nativo. Nos demais tons não entra marcação. */
function emphasize(text: string, tone: CopyTone): string {
  return tone === "Grupo de WhatsApp" ? `*${text}*` : text;
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? vars[key] : match,
  );
}

/** Remove as sobras da montagem: espaços duplos, pontuação repetida, linhas vazias extras. */
function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([.!?:])\1+/g, "$1")
    .replace(/\s+([.!?,:])/g, "$1")
    .trim();
}

function build(input: CopyInput): string {
  const tone: CopyTone = TONES.includes(input.tone) ? input.tone : "Direto";
  const name = input.name.trim() || "esse produto";
  const description = cleanDescription(input.description);
  const context = inferProductContext(`${name} ${description}`);
  const priceText = formatPrice(input.price);

  const vars: Record<string, string> = {
    NOME: emphasize(name, tone),
    oque: lowerFirst(description),
    Oque: upperFirst(description),
    beneficio: context.benefit,
    Beneficio: upperFirst(context.benefit),
    publico: context.audience,
    Publico: upperFirst(context.audience),
    categoria: context.category,
    preco: priceText ? emphasize(priceText, tone) : "",
  };

  const openerPool = priceText
    ? [...OPENERS[tone], ...(PRICE_OPENERS[tone] ?? [])]
    : OPENERS[tone];

  const opener = fill(pick(openerPool), vars);
  const product = fill(pick(description ? PRODUCT_LINES[tone] : NAME_ONLY_LINES), vars);
  const benefit = fill(pick(BENEFITS[tone]), vars);
  const price = priceText ? fill(pick(PRICE_LINES[tone]), vars) : null;
  const urgency = tone === "Oferta urgente" ? pick(URGENCY_LINES) : null;
  const cta = fill(pick(CTAS[tone]), vars);

  // No Facebook produto e benefício viram um parágrafo só — frases mais longas e
  // corridas, que é como as pessoas realmente escrevem por lá.
  const blocks =
    tone === "Grupo do Facebook"
      ? [opener, `${product} ${benefit}`, price, urgency, cta]
      : [opener, product, benefit, price, urgency, cta];

  const separator = tone === "Grupo de WhatsApp" ? "\n\n" : "\n";
  const body = blocks.filter((b): b is string => !!b).join(separator);

  // O link é sempre o último elemento, sozinho na própria linha e sem formatação.
  return `${tidy(body)}${separator}${input.link.trim()}`;
}

/**
 * Gera um texto de divulgação. Cada chamada sorteia blocos novos, então o retorno
 * muda a cada clique — isso é intencional.
 *
 * @param avoid textos gerados recentemente pelo próprio usuário. Se o sorteio cair
 *              em algo já usado, refaz até encontrar um inédito.
 */
export function generateCopy(input: CopyInput, avoid: string[] = []): string {
  const used = new Set(avoid);
  let candidate = build(input);
  for (let attempt = 0; attempt < 40 && used.has(candidate); attempt++) {
    candidate = build(input);
  }
  return candidate;
}
