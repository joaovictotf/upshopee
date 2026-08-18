/**
 * Duas coisas que o afiliado precisa na tela de produto — ambas 100% offline,
 * sem API, sem dependência externa:
 *
 *   1. productSales()    — quanto O PRODUTO vende na Shopee (dado de mercado).
 *   2. generateContent() — hashtags + título + legenda para vídeo/post.
 *
 * As duas metades não conversam entre si de propósito: a primeira precisa ser
 * ESTÁVEL (mesmo número em todo device, o dia inteiro) e a segunda precisa ser
 * VARIÁVEL (dois cliques seguidos não podem dar o mesmo texto). Misturar as
 * duas lógicas é o jeito mais rápido de quebrar as duas.
 */

import { spWindowIndex } from "./timeWindow";
import { inferProductContext } from "./mock/divulgation-templates";

// ═══════════════════════════════════════════════════════════════════════════
// PARTE 1 — VENDAS DO PRODUTO NA SHOPEE
// ═══════════════════════════════════════════════════════════════════════════
//
// ATENÇÃO AO QUE ESTES NÚMEROS SÃO: quanto o PRODUTO vende na Shopee. É dado
// de mercado, para o afiliado julgar se vale a pena divulgar. NÃO são as
// vendas do usuário, não são comissão dele e não têm nenhuma relação com
// data.salesOrders (a fonte única de verdade das vendas do usuário, §10 do
// CLAUDE.md). Por isso são IGUAIS para todo mundo: dois afiliados olhando o
// mesmo produto no mesmo dia veem o mesmo número, como veriam na Shopee.
//
// Três garantias, todas por construção e não por sorte:
//
//   • trinta >= sete >= hoje SEMPRE. Não existe sorteio independente por
//     período: existe UMA série de 30 valores diários, e os períodos são
//     recortes dela. `sete` é a soma dos 7 últimos, `hoje` é o último. Soma de
//     inteiros não-negativos sobre um conjunto maior nunca dá menos.
//   • `hoje` vira uma vez por dia, à meia-noite de São Paulo, porque o índice
//     do dia vem de spWindowIndex(24h) — o mesmo relógio do resto do app.
//   • Zero Math.random(). O valor é uma função pura de (n, índice do dia), via
//     hash inteiro. Mesmo produto + mesmo dia = mesmo número em qualquer
//     navegador, em qualquer fuso, para qualquer usuário.

const DAY_MS = 86_400_000;

/** Salts para desacoplar os sorteios que compartilham as mesmas entradas. */
const SALT_VOLUME = 0x5eed_01;
const SALT_SHARE = 0x5eed_02;
const SALT_SHAPE = 0x5eed_03;

/**
 * CALIBRAÇÃO DO CATÁLOGO SEM NÚMERO REAL (250 dos 300 produtos).
 *
 * Estes três números são a régua da tela inteira, então ficam juntos e no topo:
 *
 *   MIN   — piso. Nenhum produto pode parecer abandonado. O número aparece ao
 *           lado do botão "Afiliar na Shopee"; abaixo de ~20 no mês o afiliado
 *           lê "produto morto" e vai embora, e aí o número trabalha contra a
 *           própria função que ele tem.
 *   MAX   — teto. Existe para haver campeão visível: sem um topo bem acima da
 *           mediana, a grade inteira vira o mesmo número e some a única
 *           informação que esse dado carrega — qual produto vale mais a pena.
 * A curva entre os dois é LOG-UNIFORME (multiplicativa), não uma potência de u.
 * A diferença importa na tela: com uma curva de potência a massa se acumula
 * encostada no piso — 48 dos 250 produtos caíam entre 24 e 30, uns 7 produtos
 * repetindo cada valor, e grade com número repetido é tão pouco convincente
 * quanto grade com número baixo. Log-uniforme espalha a mesma quantidade de
 * produtos por uma faixa larga: cada "dobra" de vendas (24→48→96→192) recebe o
 * mesmo número de produtos, que é como catálogo real se distribui.
 *
 * Distribuição medida no catálogo: p25 ≈ 43, mediana ≈ 77, p75 ≈ 137. Mexer
 * aqui muda a leitura de 250 cards de uma vez — é o único lugar que precisa ser
 * tocado para recalibrar.
 */
const SYNTHETIC_MIN_MONTHLY = 24;
const SYNTHETIC_MAX_MONTHLY = 245;

/**
 * splitmix32 — hash inteiro de 32 bits. Só Math.imul, xor e shift, então o
 * resultado é bit a bit idêntico em qualquer engine JS. É isso que garante o
 * "mesmo número em todo device".
 */
function mix32(seed: number): number {
  let z = (seed + 0x9e3779b9) | 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  return (z ^ (z >>> 15)) >>> 0;
}

/** Número em [0, 1) determinístico a partir das entradas inteiras. */
function rand01(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const part of parts) h = mix32(h ^ (part | 0));
  return mix32(h) / 4_294_967_296;
}

/**
 * Peso por dia da semana. Fim de semana e segunda vendem mais; meio de semana
 * menos. A soma é exatamente 7.00 de propósito: assim o formato semanal muda a
 * silhueta da curva sem inflar o total do mês.
 * Índice 0 = domingo.
 */
const WEEKDAY_FACTOR = [1.15, 1.05, 0.95, 0.9, 0.95, 1.0, 1.0];

/** 1970-01-01 caiu numa quinta-feira, então o dia 0 do índice é quinta (4). */
function weekdayOf(dayIndex: number): number {
  return (((dayIndex + 4) % 7) + 7) % 7;
}

/**
 * Vendas do produto nos últimos 30 dias — o número do qual os outros dois são
 * recorte.
 *
 * DOIS CAMINHOS QUE NÃO PODEM SE MISTURAR:
 *
 * 1. ANCORADO (50 produtos, o catálogo traz o número real da Shopee, 0–286).
 *    O mês é uma FRAÇÃO do total (12% a 45%), nunca um número solto: total 5 →
 *    mês 1 ou 2; total 286 → mês entre 34 e 128. É isto que mantém "produto com
 *    5 vendas não mostra 40 no mês", e o Math.min garante que o mês nunca passa
 *    do total. Produto que vende pouco de verdade CONTINUA mostrando pouco —
 *    inclusive zero. Esses 50 números vieram da Shopee e mentir neles seria
 *    mentir sobre mercado real, não sobre demonstração.
 *
 * 2. SINTÉTICO (250 produtos, sem número real). Não existe total para ancorar,
 *    então o mês é sorteado DIRETO na faixa calibrada acima, sem passar por
 *    total nem por fração. A calibração antiga derivava o mês de um total
 *    fictício e o resultado ficava ilegível na tela: mediana 17 no mês e 88 dos
 *    250 produtos abaixo de 10 vendas — um terço da grade parecendo produto
 *    morto ao lado do botão de afiliar.
 *
 * O sorteio continua sendo função pura de (n, salt): mesmo produto, mesmo
 * número, em qualquer device e para qualquer usuário.
 */
function monthlySales(key: number, realTotalSales?: number): number {
  if (
    typeof realTotalSales === "number" &&
    Number.isFinite(realTotalSales) &&
    realTotalSales >= 0
  ) {
    const total = Math.floor(realTotalSales);
    if (total <= 0) return 0;
    const share = 0.12 + rand01(key, SALT_SHARE) * 0.33; // 0.12..0.45
    return Math.min(total, Math.round(total * share));
  }

  const u = rand01(key, SALT_VOLUME);
  const ratio = SYNTHETIC_MAX_MONTHLY / SYNTHETIC_MIN_MONTHLY;
  return Math.round(SYNTHETIC_MIN_MONTHLY * ratio ** u);
}

/**
 * Distribui EXATAMENTE `monthly` vendas ao longo de `days` dias terminando em
 * `endDay`, com peso por dia da semana e uma variação diária determinística.
 *
 * Método do maior resto: cada dia leva o piso da sua fatia e as sobras vão
 * para os dias de maior fração. Duas consequências que interessam:
 *   • a soma da série é o `monthly` cravado — sem arredondamento sobrando;
 *   • produto de venda baixa (λ < 1) fica com a maioria dos dias em 0 e alguns
 *     em 1, que é exatamente como um produto de 2 vendas/mês se comporta.
 *     "Hoje: 0" nesses casos é o número certo, não um bug.
 */
function dailySeries(key: number, monthly: number, endDay: number, days: number): number[] {
  const out = new Array<number>(days).fill(0);
  if (monthly <= 0) return out;

  const weights = new Array<number>(days);
  let totalWeight = 0;
  for (let i = 0; i < days; i++) {
    const day = endDay - (days - 1 - i);
    // Variação diária com média 1.0 — não desloca o total, só o formato.
    const jitter = 0.45 + rand01(key, day, SALT_SHAPE) * 1.1;
    const w = WEEKDAY_FACTOR[weekdayOf(day)] * jitter;
    weights[i] = w;
    totalWeight += w;
  }

  const remainders: Array<{ index: number; frac: number }> = [];
  let assigned = 0;
  for (let i = 0; i < days; i++) {
    const exact = (monthly * weights[i]) / totalWeight;
    const whole = Math.floor(exact);
    out[i] = whole;
    assigned += whole;
    remainders.push({ index: i, frac: exact - whole });
  }

  // Empate resolvido pelo índice do dia: nada de ordenação instável.
  remainders.sort((a, b) => b.frac - a.frac || a.index - b.index);
  for (let k = 0; assigned < monthly && k < days; k++, assigned++) {
    out[remainders[k].index] += 1;
  }
  return out;
}

/**
 * Vendas do PRODUTO na Shopee nos últimos períodos. Dado de mercado, igual
 * para todos os usuários, estável dentro do dia de São Paulo.
 *
 * @param n              o `n` do produto (AffiliateProduct.n, 1..300).
 * @param realTotalSales total real de vendas na Shopee (AffiliateProduct.sales),
 *                       quando o catálogo tem. Com ele, o mês é ancorado nesse
 *                       total e nunca o ultrapassa. Sem ele, o mês vem da faixa
 *                       calibrada (SYNTHETIC_MIN/MAX_MONTHLY).
 */
export function productSales(
  n: number,
  realTotalSales?: number,
): { hoje: number; sete: number; trinta: number } {
  const key = Number.isFinite(n) ? Math.trunc(Math.abs(n)) : 0;
  const today = spWindowIndex(DAY_MS);

  const monthly = monthlySales(key, realTotalSales);
  const series = dailySeries(key, monthly, today, 30);

  // Os três números saem da MESMA série. É o que torna a monotonia estrutural
  // em vez de coincidência — não dá para "consertar" isso sorteando por
  // período depois.
  const hoje = series[series.length - 1];
  let sete = 0;
  for (let i = series.length - 7; i < series.length; i++) sete += series[i];
  const trinta = series.reduce((acc, v) => acc + v, 0);

  return { hoje, sete, trinta };
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTE 2 — GERADOR DE CONTEÚDO (hashtags + título + legenda)
// ═══════════════════════════════════════════════════════════════════════════
//
// Uma chamada devolve as três peças montadas JUNTAS, a partir de um mesmo
// "ângulo" sorteado (descoberta / resolve / preço / público). É isso que faz o
// pacote parecer uma peça só: se o título é de preço, a legenda abre falando
// de preço e a hashtag de ângulo é #precinho. Gerar as três separadamente daria
// três textos que não se olham.
//
// Aqui o Math.random() é CORRETO — ao contrário da Parte 1. Texto de divulgação
// repetido é o que cai em filtro de spam; cada clique tem que sair diferente.
//
// Benefício e público vêm de inferProductContext (src/lib/mock/
// divulgation-templates.ts) — o mapa palavra-chave → contexto que já existe no
// projeto. Nenhum segundo mapa é definido neste arquivo.
//
// ┌─ REGRA DE GRAMÁTICA QUE NÃO PODE SER QUEBRADA ─────────────────────────┐
// │ 1. NUNCA colocar artigo antes de {NOME}. O nome vem do catálogo e pode  │
// │    ter qualquer gênero — "esse Camisa" e "essa Açucareiro" quebram. Só  │
// │    posições sem artigo: início de frase, depois de dois-pontos, travessão│
// │    ou "Produto:". Mesma regra do copy-engine.                           │
// │ 2. {beneficio} só entra DEPOIS de dois-pontos ou como frase inteira. Os │
// │    valores do mapa misturam infinitivo ("Economizar até 90% na conta de │
// │    luz") com sintagma nominal ("Estilo e conforto por preço justo") —   │
// │    "Entrega economizar até 90%" não existe em português.                │
// │ 3. {publico} só em posição preposicionada ("pra {publico}", "com        │
// │    {publico}"). Como sujeito quebra a concordância: "Crianças e família │
// │    vai amar".                                                            │
// └─────────────────────────────────────────────────────────────────────────┘

const ANGLES = ["descoberta", "resolve", "preco", "publico"] as const;
type Angle = (typeof ANGLES)[number];

/** Títulos: gancho falado para Shopee Video, Reels e TikTok — não nome de produto. */
const TITLES: Record<Angle, string[]> = {
  descoberta: [
    "Eu não sabia que isso existia",
    "{NOME} — e eu achando que não precisava",
    "Olha o achadinho de {categoria} que eu encontrei",
    "Apareceu no meu feed e eu comprei na hora",
    "{NOME}: o achadinho que eu não esperava",
    "Passei anos sem saber que isso existia",
    "Achei isso na Shopee e não consegui deixar passar",
  ],
  resolve: [
    "{NOME} resolveu um problema que eu tinha há anos",
    "Testei por semanas e não largo mais",
    "Isso aqui resolveu um perrengue que eu tinha todo dia",
    "{NOME} — testei antes pra você não errar",
    "Comprei sem esperar nada e me surpreendeu",
    "{NOME}: usei todo dia por um mês",
    "Achei que era exagero da internet. Não era",
  ],
  preco: [
    "Paguei {preco} e valeu cada centavo",
    "{NOME} por {preco} — como assim?",
    "Quanto você acha que custa? Tá {preco}",
    "Gastei {preco} e resolvi de vez",
    "{preco} nisso aqui e eu faria de novo",
    "Achei por {preco} e quase não acreditei",
    "{NOME} tá {preco} — corre ver",
  ],
  publico: [
    "Isso aqui é pra {publico}",
    "Marca aqui alguém que precisa disso",
    "{NOME} é pra {publico}",
    "Separei um achadinho de {categoria} pra {publico}",
    "Se isso aqui é a sua praia, presta atenção",
    "Tem nome e endereço: é pra {publico}",
    "O tipo de coisa que faz diferença pra {publico}",
  ],
};

/** Fecho do título. A string vazia é uma opção real — nem todo gancho pede emoji. */
const TITLE_TAILS = ["", " 👀", " 🔥", " 😳", " ✨"];

/** Primeira linha da legenda — é ela que amarra a legenda ao ângulo do título. */
const CAPTION_OPENERS: Record<Angle, string[]> = {
  descoberta: [
    "Eu não sabia que isso existia até essa semana.",
    "Tava rolando o feed e apareceu isso aqui 👀",
    "Achadinho novo e já virou favorito.",
    "Achei isso na Shopee e vim correndo mostrar.",
    "Não era nem isso que eu tava procurando, mas olha no que deu.",
  ],
  resolve: [
    "Comprei sem esperar muita coisa e me surpreendi.",
    "Usei por umas semanas antes de vir indicar.",
    "Isso aqui resolveu um perrengue que eu tinha há tempos.",
    "Testei de verdade pra poder falar com propriedade.",
    "Vim contar como foi depois de usar bastante.",
  ],
  preco: [
    "O preço disso aqui me pegou de surpresa.",
    "Paguei bem menos do que eu imaginava.",
    "O custo-benefício desse aqui tá difícil de bater.",
    "Não é porque é barato — é porque vale o que custa.",
    "Preço bom eu não guardo só pra mim.",
  ],
  publico: [
    "Esse aqui eu separei com uma pessoa específica na cabeça.",
    "Se isso aqui é a sua praia, senta que lá vem indicação.",
    "Marca alguém que ia gostar disso.",
    "Tem gente que precisa ver isso hoje.",
    "Já sei exatamente quem vai gostar desse aqui.",
  ],
};

/** Nenhuma variante usa artigo antes de {NOME} — ver regra 1 no cabeçalho. */
const PRODUCT_LINES = [
  "{NOME}.",
  "Produto: {NOME}.",
  "Se chama {NOME}.",
  "{NOME} — direto da Shopee.",
  "Nome pra procurar lá: {NOME}.",
];

/** {beneficio} sempre depois de dois-pontos ou como frase inteira — regra 2. */
const BENEFIT_LINES = [
  "O ponto forte: {beneficio}.",
  "{Beneficio}.",
  "Na prática, o que você leva é isso: {beneficio}.",
  "O que pesa a favor: {beneficio}.",
  "Vale pelo que entrega: {beneficio}.",
  "Resumo honesto: {beneficio}.",
];

/** {publico} sempre preposicionado — regra 3. */
const AUDIENCE_LINES = [
  "Perfeito pra {publico}.",
  "Se é pra {publico}, pode ir tranquilo.",
  "Indico de olho fechado pra {publico}.",
  "Feito pra {publico}.",
  "Combina demais com {publico}.",
];

const PRICE_LINES = [
  "Tá {preco} no momento.",
  "Preço de hoje: {preco}.",
  "Saindo por {preco}.",
  "{preco} — e o preço muda direto, então confere.",
  "Paguei {preco}.",
];

/** Sem link como parâmetro, o CTA é o do formato vídeo: bio, comentário, direct. */
const CTAS = [
  "Link na bio 👇",
  "Deixei o link fixado no perfil.",
  "Link no primeiro comentário.",
  'Comenta "quero" que eu te mando o link.',
  "Salva esse aqui pra não perder depois.",
  "Chama no direct que eu mando o link.",
  "Tá tudo no link da bio, corre lá.",
];

/** Tags largas — alcance. Entram sempre duas, distintas. */
const BROAD_TAGS = [
  "#achadinhos",
  "#achadinhosdashopee",
  "#shopee",
  "#shopeebrasil",
  "#achadosdashopee",
  "#ofertadodia",
  "#comprinhas",
  "#valeapena",
  "#linknabio",
  "#compreiegostei",
  "#shopeeachadinhos",
  "#dicadodia",
];

/** Uma tag que carrega o ângulo do pacote — é o que costura hashtags e texto. */
const ANGLE_TAGS: Record<Angle, string[]> = {
  descoberta: ["#achadinho", "#achadodasemana"],
  resolve: ["#testadoeaprovado", "#recomendo"],
  preco: ["#precinho", "#promocao"],
  publico: ["#dicadecompra", "#indicacao"],
};

/**
 * Padrões de tag de categoria. Todos usam "de + substantivo" ou justaposição —
 * formas que funcionam com qualquer categoria, sem risco de concordância de
 * gênero ("#casabarato" vs "#casabarata" seria o tipo de erro que denuncia
 * texto gerado). Categoria começada em vogal come o "de": #achadinhoseletronicos.
 */
const CATEGORY_TAG_PATTERNS: Array<(slug: string) => string> = [
  (c) => `#${c}`,
  (c) => `#achadinhos${withDe(c)}`,
  (c) => `#${c}shopee`,
  (c) => `#shopee${c}`,
  (c) => `#comprinhas${withDe(c)}`,
  (c) => `#dicas${withDe(c)}`,
];

/** Palavras que não viram hashtag: enchimento de título de anúncio da Shopee. */
const TAG_STOPWORDS = new Set([
  "para", "pra", "com", "sem", "dos", "das", "nos", "nas", "novo", "nova",
  "kit", "unidade", "unidades", "pecas", "peca", "tamanho", "cores", "cor",
  "alta", "super", "ultra", "mega", "promocao", "frete", "gratis", "envio",
  "rapido", "brasil", "shopee", "modelo", "tipo", "grande", "pequeno",
  "capacidade", "qualidade", "premium", "resistente", "portatil", "casa",
]);

// ─── Utilitários ─────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Dois itens DISTINTOS do array, em ordem aleatória. Exige length >= 2. */
function pickTwo<T>(arr: readonly T[]): [T, T] {
  const i = Math.floor(Math.random() * arr.length);
  let j = Math.floor(Math.random() * (arr.length - 1));
  if (j >= i) j += 1;
  return [arr[i], arr[j]];
}

const deburr = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const withDe = (slug: string) => (/^[aeiou]/.test(slug) ? slug : `de${slug}`);

function slugify(s: string): string {
  return deburr(s).replace(/[^a-z0-9]/g, "");
}

function upperFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Minúscula inicial para encaixar no meio da frase, preservando siglas ("LED"). */
function lowerFirst(s: string): string {
  if (!s) return s;
  const first = s.split(/\s/)[0];
  if (first.length > 1 && first === first.toUpperCase()) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function formatPrice(price?: number): string | null {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TRAILING_CONNECTOR = /\s+(de|da|do|das|dos|com|sem|em|no|na|nos|nas|e|ou|para|pra|por|a|o)$/i;

/**
 * Nome de anúncio da Shopee tem 90+ caracteres e não cabe em título de vídeo.
 * Corta no primeiro separador forte e depois por tamanho, sem terminar em
 * preposição solta ("Açucareiro de aço inoxidável dourado com" fica feio).
 */
function shortName(raw: string): string {
  // O "1 " da frente é quantidade de kit ("1 Shampoo 1 Condicionador..."), não
  // faz parte do nome do produto.
  const head = raw.trim().split(/[,;:–—]| - /)[0].replace(/^\d+\s+/, "").trim();
  if (!head) return "esse produto";

  let out = "";
  let words = 0;
  for (const word of head.split(/\s+/)) {
    // Número solto no meio do nome é o começo do próximo item do kit — daí em
    // diante o nome vira lista, e lista não cabe em título de vídeo.
    if (words >= 2 && /^\d+$/.test(word)) break;
    const next = out ? `${out} ${word}` : word;
    if (out && next.length > 34) break;
    out = next;
    words++;
    if (words >= 5) break;
  }

  let trimmed = out || head;
  while (TRAILING_CONNECTOR.test(trimmed)) trimmed = trimmed.replace(TRAILING_CONNECTOR, "");
  return trimmed || "esse produto";
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, keyName: string) =>
    keyName in vars ? vars[keyName] : match,
  );
}

/** Limpa sobras da montagem: espaço duplo, pontuação repetida, linha vazia extra. */
function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([.!?:])\1+/g, "$1")
    .replace(/\s+([.!?,:])/g, "$1")
    .trim();
}

/**
 * Duas tags tiradas do próprio nome do produto — é o que dá especificidade ao
 * conjunto. A primeira palavra do anúncio quase sempre é o substantivo do
 * produto ("Açucareiro..."); a segunda é a mais longa entre as seguintes, que
 * na prática cai no material ou no diferencial.
 */
function nameTags(name: string): string[] {
  const tokens = deburr(name)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !/^\d+$/.test(t) && !TAG_STOPWORDS.has(t));
  if (tokens.length === 0) return [];

  const first = tokens[0];
  const rest = tokens.slice(1, 6).filter((t) => t !== first);
  rest.sort((a, b) => b.length - a.length);
  return rest.length > 0 ? [`#${first}`, `#${rest[0]}`] : [`#${first}`];
}

// ─── Montagem ────────────────────────────────────────────────────────────────

type ContentInput = {
  name: string;
  category: string;
  price?: number;
};

type GeneratedContent = {
  hashtags: string;
  titulo: string;
  descricao: string;
};

/**
 * Referência do contexto padrão do mapa. inferProductContext devolve SEMPRE o
 * mesmo objeto quando nada casa, então comparar por referência é o jeito de
 * saber "não achou" sem depender do texto do padrão.
 */
const NO_MATCH = inferProductContext("");

/**
 * A CATEGORIA DO CATÁLOGO TEM PRIORIDADE sobre o nome. O mapa procura
 * palavra-chave no texto, e nome de anúncio engana: "Shampoo ... Cães e Gatos"
 * casa em "shampoo" (Beleza) antes de casar em "gato" (Pets), e o afiliado
 * receberia "autoestima e cuidado pessoal" para um shampoo de cachorro. A
 * categoria vem do catálogo, já classificada por gente — quando ela casa no
 * mapa, ela manda. Só quando não casa (o mapa não tem entrada para "Casa",
 * "Papelaria" etc.) o nome entra como segunda tentativa.
 */
function contextFor(name: string, category: string) {
  if (category) {
    const byCategory = inferProductContext(category);
    if (byCategory !== NO_MATCH) return byCategory;
  }
  return inferProductContext(name);
}

function build(input: ContentInput): GeneratedContent {
  const rawName = input.name.trim();
  const rawCategory = (input.category || "").trim();
  const context = contextFor(rawName, rawCategory);
  // Sem categoria no input, a do mapa serve de rótulo para tag e para {categoria}.
  const categoryLabel = rawCategory || context.category;
  const priceText = formatPrice(input.price);

  // Sem preço não existe ângulo de preço: metade dos ganchos ficaria com um
  // buraco no lugar do valor.
  const angle: Angle = priceText
    ? pick(ANGLES)
    : pick(ANGLES.filter((a): a is Angle => a !== "preco"));

  const vars: Record<string, string> = {
    NOME: shortName(rawName),
    categoria: lowerFirst(categoryLabel),
    beneficio: lowerFirst(context.benefit),
    Beneficio: upperFirst(context.benefit),
    publico: lowerFirst(context.audience),
    preco: priceText ?? "",
  };

  // ── título ──
  const titulo = tidy(upperFirst(fill(pick(TITLES[angle]), vars)) + pick(TITLE_TAILS));

  // ── legenda ──
  // A linha de público entra em metade dos casos: legenda de tamanho sempre
  // igual entrega que é montada por template.
  const audience = Math.random() < 0.5 ? fill(pick(AUDIENCE_LINES), vars) : null;
  const price = priceText ? fill(pick(PRICE_LINES), vars) : null;
  const blocks = [
    fill(pick(CAPTION_OPENERS[angle]), vars),
    fill(pick(PRODUCT_LINES), vars),
    fill(pick(BENEFIT_LINES), vars),
    audience,
    price,
    pick(CTAS),
  ];
  const descricao = tidy(blocks.filter((b): b is string => !!b).join("\n"));

  // ── hashtags ──
  const catSlug = slugify(categoryLabel) || slugify(context.category);
  const [broadA, broadB] = pickTwo(BROAD_TAGS);
  const [patternA, patternB] = pickTwo(CATEGORY_TAG_PATTERNS);
  const tags = [
    broadA,
    broadB,
    patternA(catSlug),
    patternB(catSlug),
    ...nameTags(rawName),
    pick(ANGLE_TAGS[angle]),
  ];
  // Dedup preservando a ordem: a tag de categoria pode coincidir com uma tag do
  // nome (produto "Kit casa" em categoria "Casa"), e tag repetida na mesma
  // linha é sinal de texto automático.
  const hashtags = Array.from(new Set(tags)).slice(0, 8).join(" ");

  return { hashtags, titulo, descricao };
}

function alreadyUsed(candidate: GeneratedContent, used: Set<string>): boolean {
  return (
    used.has(candidate.titulo) ||
    used.has(candidate.descricao) ||
    used.has(candidate.hashtags) ||
    used.has(packageKey(candidate))
  );
}

/** Forma canônica do pacote, para o chamador guardar em `avoid` de uma vez só. */
function packageKey(c: GeneratedContent): string {
  return `${c.titulo}\n${c.descricao}\n${c.hashtags}`;
}

/**
 * Gera hashtags + título + legenda de uma vez, montados a partir do mesmo
 * ângulo para o pacote parecer uma peça só. Cada chamada sorteia blocos novos —
 * isso é intencional (ver cabeçalho da Parte 2).
 *
 * @param avoid saídas anteriores do próprio usuário. Aceita qualquer uma das
 *              três peças isoladas (título, legenda ou linha de hashtags) ou a
 *              forma canônica "título\nlegenda\nhashtags"; se o sorteio cair em
 *              algo já usado, refaz — até 40 tentativas, como em generateCopy.
 */
export function generateContent(
  input: ContentInput,
  avoid: string[] = [],
): GeneratedContent {
  const used = new Set(avoid);
  let candidate = build(input);
  for (let attempt = 0; attempt < 40 && alreadyUsed(candidate, used); attempt++) {
    candidate = build(input);
  }
  return candidate;
}
