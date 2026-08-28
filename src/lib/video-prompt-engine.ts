/**
 * Gerador de prompt de vídeo — 100% offline, sem API, sem dependência e sem custo.
 *
 * Mesma arquitetura do src/lib/copy-engine.ts: nada de template fixo. Cada prompt é
 * montado a partir de blocos intercambiáveis (cena, pessoa, ação, câmera, luz, voz,
 * ritmo, acabamento) sorteados de forma independente. Clicar de novo produz outro
 * prompt, e é por isso que `avoid` existe.
 *
 * O NICHO vem do mesmo mapa de palavras-chave que a copy usa —
 * `inferProductContext` de copy-engine.ts. Não existe um segundo mapa aqui: uma
 * air fryer e um top de academia não podem cair na mesma cena, e as duas telas
 * precisam concordar sobre em que nicho um produto está.
 *
 * O texto gerado é em INGLÊS de propósito: ele é colado numa IA de vídeo. Só a
 * interface em volta é em português.
 */

import { deburr, inferProductContext } from "./copy-engine";

export type VideoPromptInput = {
  name: string;
  category: string;
  /** Opcional. Quando existe, ajusta só o acabamento de produção do vídeo. */
  price?: number;
};

// ─── Cenas por nicho ─────────────────────────────────────────────────────────

type SceneBlocks = {
  /** Como o produto é descrito em inglês para a IA, já que o nome vem em português. */
  noun: string;
  settings: string[];
  subjects: string[];
  actions: string[];
};

/**
 * As chaves são exatamente as `category` devolvidas por `inferProductContext`.
 * Mexer numa delas sem mexer no copy-engine derruba o nicho para o padrão.
 */
const SCENES: Record<string, SceneBlocks> = {
  "Energia Solar": {
    noun: "a solar energy product",
    settings: [
      "the flat rooftop of a modest house on a bright, cloudless day",
      "a back yard with the panel propped against a wall, strong midday sun overhead",
      "a small rural property, wires and an old meter box visible on the outside wall",
      "a service area at the back of the house, tools still on the floor from the install",
    ],
    subjects: [
      "a man in his forties in a worn work shirt, sunburned forearms",
      "a woman in her thirties checking the installation herself, phone in hand",
      "a young technician in a plain uniform, no branding on it",
      "a couple in their fifties looking at the electricity bill together",
    ],
    actions: [
      "connects the unit, watches the indicator come alive and explains what changed on the bill",
      "holds the old bill next to the running system and points at the difference",
      "positions the panel in the sun and shows the reading climbing on the small display",
      "walks the length of the installation, tapping the panel to show how solid it is",
    ],
  },

  "Colecionáveis": {
    noun: "a collectible item",
    settings: [
      "a bedroom desk covered in sleeves, sorted piles and a desk lamp pulled in close",
      "a living room table with the collection spread out on a dark cloth",
      "a shelf full of other pieces from the same collection, in soft focus behind",
      "a small room at night, only the desk lamp on, everything else dim",
    ],
    subjects: [
      "a teenager who clearly cares about this, careful with their hands",
      "a man in his thirties handling it slowly, almost reverent",
      "a young woman sitting cross-legged on the floor, item held up to the light",
      "a father and child looking at it together, the child reaching in",
    ],
    actions: [
      "opens the packaging carefully, reveals the piece and holds it up close to the lens",
      "places it into the collection, then pulls back to show where it fits",
      "turns it slowly in the light so every detail and finish reads on camera",
      "reacts genuinely to what is inside, then shows it to the camera without saying much",
    ],
  },

  "Futebol e Copa": {
    noun: "a football and World Cup fan product",
    settings: [
      "a living room decorated for match day, flag on the wall, TV glowing in the background",
      "a small back yard with a ball on the grass and the afternoon getting late",
      "a bedroom with a team scarf pinned above the bed",
      "a street corner on a match day, neighbours' decorations strung overhead",
    ],
    subjects: [
      "a man in his thirties already wearing the shirt, clearly in a good mood",
      "a woman in her twenties getting ready to watch the game",
      "a kid of about ten, too excited to stand still",
      "a group of friends, but only one of them speaks to the camera",
    ],
    actions: [
      "unfolds it, puts it on and turns once so the camera catches the whole thing",
      "hangs it up where everyone will see it, then steps back and looks at it",
      "shows it off to the camera, pointing at the details that matter to a fan",
      "hands it to someone off-camera and watches their reaction",
    ],
  },

  "Presentes": {
    noun: "a gift item",
    settings: [
      "a bedroom with wrapping paper and scissors still on the bed",
      "a kitchen table set up for a small celebration, a couple of balloons visible",
      "a doorway, the gift held behind the back, about to be handed over",
      "a living room in the evening, warm lamp light, the gift on the coffee table",
    ],
    subjects: [
      "a young man nervous about whether the gift is right",
      "a woman in her twenties preparing the surprise, smiling to herself",
      "someone receiving it, hands over their mouth for a second",
      "a daughter giving it to her mother, both of them a little emotional",
    ],
    actions: [
      "opens the box slowly on camera and reveals what is inside",
      "wraps it, then hands it over and the camera stays on the other person's face",
      "shows the gift from every angle before closing the box again",
      "sets it up as a surprise and steps out of frame as someone walks in",
    ],
  },

  "Bebê e Infantil": {
    noun: "a baby and toddler product",
    settings: [
      "a small nursery with soft daylight through a half-closed curtain",
      "a living room floor covered by a play mat, toys pushed to the side",
      "a bathroom set up for bath time, towel already laid out",
      "a bedroom at the end of a long day, everything a bit out of place",
    ],
    subjects: [
      "a mother in her late twenties, tired but gentle, hair tied up",
      "a father holding the baby against his chest with one arm",
      "a grandmother with practiced, unhurried hands",
      "a young couple figuring it out together for the first time",
    ],
    actions: [
      "uses the product with the baby, showing how quick and calm it makes the routine",
      "sets it up one-handed while holding the baby, proving how practical it is",
      "cleans it and puts it away, showing how simple that part is",
      "compares the old way with the new one in the same short routine",
    ],
  },

  "Pets": {
    noun: "a pet product",
    settings: [
      "a living room with the dog's bed in the corner and fur on the rug",
      "a small back yard, the dog already excited before anything starts",
      "a kitchen corner where the pet's bowls live",
      "a hallway by the front door, leash hanging on a hook",
    ],
    subjects: [
      "a woman in her thirties who clearly talks to her dog like a person",
      "a man sitting on the floor so he is at the animal's level",
      "a young woman with a cat that is only half interested",
      "a whole family with the pet in the middle of everything",
    ],
    actions: [
      "gives it to the animal and lets the camera catch the real, unscripted reaction",
      "puts it on the pet, adjusts it, and the pet immediately settles",
      "uses it during the normal routine — feeding, walking, brushing — nothing staged",
      "shows how it holds up after the pet has really used it",
    ],
  },

  "Saúde e Bem-estar": {
    noun: "a health and wellness product",
    settings: [
      "a bedroom at the end of the day, lamp on, bed unmade",
      "a home office with a chair that has clearly been sat in for too many hours",
      "a living room sofa, blanket pushed to one side",
      "a small bathroom, plain and real, morning light coming in",
    ],
    subjects: [
      "a man in his forties rubbing his own shoulder before he starts",
      "a woman in her thirties who has been on her feet all day",
      "an older person moving carefully and deliberately",
      "someone in comfortable clothes, no makeup, just got home",
    ],
    actions: [
      "uses the product on the sore spot and the tension visibly drops out of their shoulders",
      "goes through the full routine once, start to finish, in real time",
      "shows the discomfort first, then the relief, without exaggerating either",
      "explains how it fits into the end of the day while using it",
    ],
  },

  "Beleza": {
    noun: "a beauty and personal care product",
    settings: [
      "a bathroom mirror with real light, products crowded on the shelf",
      "a bedroom vanity by a window, natural daylight doing all the work",
      "a small bathroom in the morning, everything a bit rushed",
      "a bedroom at night with a single warm lamp, unhurried routine",
    ],
    subjects: [
      "a woman in her twenties with bare skin, no filter, no retouching",
      "a man in his thirties doing his routine without making a thing of it",
      "a woman in her forties, real skin texture and fine lines visible",
      "someone getting ready to go out, halfway through the process",
    ],
    actions: [
      "applies it on camera and shows the result up close, same lighting before and after",
      "goes through the whole routine in one take, product clearly in frame",
      "shows the texture on the back of the hand before applying it",
      "uses it, then turns to the mirror and reacts to what they see",
    ],
  },

  "Eletrônicos": {
    noun: "a consumer electronics product",
    settings: [
      "a desk with cables, a notebook and a half-finished coffee",
      "a bedroom used as a home office, bed visible in the corner of frame",
      "a living room sofa with the TV on in the background",
      "a bus stop or sidewalk, the product being used out in the real world",
    ],
    subjects: [
      "a young man who obviously already knows the specs",
      "a woman in her thirties setting it up for the first time",
      "a student trying to make it work between classes",
      "someone unboxing it right there on the desk, still in their jacket",
    ],
    actions: [
      "unboxes it, pairs it and uses it, all in one continuous take",
      "shows the ports, the buttons and the finish up close before turning it on",
      "uses it in a real task and shows what actually changed",
      "compares it side by side with the old one it is replacing",
    ],
  },

  "Automotivo": {
    noun: "a car accessory",
    settings: [
      "the inside of a real car, dashboard slightly dusty, sun through the windscreen",
      "a driveway with the car door open and the person half seated",
      "an underground parking garage, flat artificial light",
      "the boot of the car open on a street, bags still inside",
    ],
    subjects: [
      "a man in his forties who spends his whole day driving",
      "a woman in her thirties organising the car before a trip",
      "a rideshare driver between fares, phone mounted on the dash",
      "someone cleaning the car on a Saturday morning",
    ],
    actions: [
      "installs it in the car in real time and shows how firmly it holds",
      "uses it while seated in the driver's seat, exactly how it would be used daily",
      "shows the before-and-after on the same part of the car",
      "removes it and puts it back to show how quick that is",
    ],
  },

  "Ferramentas": {
    noun: "a hand tool and DIY product",
    settings: [
      "a garage workbench with sawdust and other tools scattered around",
      "a half-finished repair in a hallway, drill marks already on the wall",
      "a back yard with a plank across two stools as a work surface",
      "a small apartment where the repair is happening on the kitchen floor",
    ],
    subjects: [
      "a man in his fifties with worn hands who has done this a thousand times",
      "a woman in her thirties doing the repair herself, no help",
      "a young adult using the tool for the first time and getting it right",
      "someone in work clothes with dust on their sleeves",
    ],
    actions: [
      "uses the tool on a real job and finishes the task on camera",
      "shows the grip and the weight of it in the hand before starting",
      "does the same job with the old tool, then with this one, and the difference shows",
      "packs it back into the case, showing everything that comes with it",
    ],
  },

  "Papelaria": {
    noun: "a stationery product",
    settings: [
      "a study desk covered in notes, highlighters and a laptop pushed to the side",
      "a kitchen table turned into a workspace, late at night",
      "a library-quiet bedroom corner, everything neatly arranged",
      "a café table with a notebook open and coffee going cold",
    ],
    subjects: [
      "a student in their twenties in the middle of studying",
      "a woman in her thirties planning her week",
      "someone organising their notes at the end of a long day",
      "a person who clearly enjoys keeping things tidy",
    ],
    actions: [
      "writes with it on camera so the line and the finish are clearly visible",
      "organises the desk with it and pulls back to show the result",
      "flips through the pages slowly, close to the lens",
      "sets up the week in it, in real time, talking through what they are doing",
    ],
  },

  "Esportes": {
    noun: "a fitness and sports product",
    settings: [
      "a corner of the living room cleared out for training, mat on the floor",
      "an empty neighbourhood gym early in the morning",
      "a park path just after sunrise, nobody else around yet",
      "a small back yard set up for a quick workout",
    ],
    subjects: [
      "a woman in her twenties mid-workout, genuinely out of breath",
      "a man in his thirties starting again after a long break",
      "someone training at home before work, still half awake",
      "a person with a real, ordinary body — not a fitness model",
    ],
    actions: [
      "uses it through a full set and the effort shows on their face",
      "straps it on, adjusts it and starts moving without pausing the take",
      "shows how it holds up under real load, up close",
      "finishes the set, drops it and reacts honestly to how it felt",
    ],
  },

  "Brinquedos": {
    noun: "a children's toy",
    settings: [
      "a living room floor with other toys already spread around",
      "a bedroom with the toy box open and half emptied",
      "a back yard on a sunny afternoon, grass and noise",
      "a kitchen table where the child is playing while dinner is made",
    ],
    subjects: [
      "a child of about six, completely absorbed in it",
      "two siblings sharing it, one of them impatient",
      "a mother playing along on the floor with her child",
      "a child showing it to the camera without being asked to",
    ],
    actions: [
      "opens it and starts playing immediately, real reaction, nothing rehearsed",
      "plays with it for a while as the camera just watches",
      "shows the camera how it works, in their own words",
      "an adult sets it up, then hands it over and the child takes off with it",
    ],
  },

  "Moda": {
    noun: "a fashion item",
    settings: [
      "a bedroom with a full-length mirror and clothes on the bed",
      "a hallway by the front door, about to leave the house",
      "a street with real passers-by, ordinary daylight",
      "a bedroom corner with plain daylight and no styling at all",
    ],
    subjects: [
      "a woman in her twenties trying it on for the first time",
      "a man in his thirties with an everyday, unstyled look",
      "a person with a real, ordinary body, not a professional model",
      "someone putting together an outfit around the piece",
    ],
    actions: [
      "puts it on, turns once in front of the mirror and adjusts the fit",
      "shows the fabric and the stitching up close before wearing it",
      "walks a few steps so the movement and the fall of it are visible",
      "combines it with two different outfits in the same take",
    ],
  },

  "Casa": {
    noun: "a home and kitchen product",
    settings: [
      "a small apartment kitchen with a cluttered counter and afternoon light",
      "a modest kitchen at the end of the day, dishes still in the sink",
      "a living room corner of a rented apartment, everyday clutter visible",
      "a narrow laundry area at the back of the house, mid-morning light",
    ],
    subjects: [
      "a woman in her thirties in house clothes, hair tied back",
      "a man in his forties doing chores without making a show of it",
      "a young woman who just got home from work, still in uniform",
      "a mother moving quickly around the kitchen while something cooks",
    ],
    actions: [
      "uses it once on a real task and reacts to how much easier it just got",
      "struggles with the old way for a beat, then uses this and the problem is gone",
      "sets it up on the counter and demonstrates it slowly, hands in frame throughout",
      "uses it while talking to the camera, showing the result up close at the end",
    ],
  },

  Achadinhos: {
    noun: "an everyday practical product",
    settings: [
      "an ordinary home interior with real clutter and natural daylight",
      "a small apartment where everything is a little bit lived-in",
      "a table by a window, plain background, nothing styled",
      "the corner of a room where this product would actually be used",
    ],
    subjects: [
      "an ordinary person in their thirties, comfortable clothes, no makeup",
      "someone who just found this product and wants to show it off",
      "a person using it for the first time and reacting honestly",
      "a real customer filming themselves, not a professional presenter",
    ],
    actions: [
      "opens it, uses it once and shows the result plainly",
      "demonstrates it slowly with the hands in frame the whole time",
      "shows the problem first, then solves it with the product on camera",
      "handles it up close so the size, weight and finish are obvious",
    ],
  },
};

// ─── Blocos genéricos (valem para qualquer nicho) ────────────────────────────

const CAMERA = [
  "handheld phone camera at chest height, slight natural shake",
  "locked-off tripod shot, the subject stepping into frame",
  "slow push-in toward the product while it is being used",
  "over-the-shoulder on the hands, then a quick cut to the face",
  "low angle looking slightly up, phone held in one hand",
  "close-up on the hands and the product, then pulling back to reveal the whole scene",
  "arm's length selfie framing, the subject moving with the product",
  "static wide shot cutting hard to a tight macro of the product's texture",
];

const LIGHTING = [
  "natural daylight from a nearby window, soft shadows, nothing studio-lit",
  "warm late-afternoon sun at a low angle, dust visible in the beam",
  "plain indoor ceiling light, slightly uneven, the way a real home is lit",
  "bright overcast daylight, flat and clean, colours true to life",
  "early morning light, cool and quiet, the room still waking up",
  "window light mixed with a lamp switched on nearby, cosy and lived-in",
];

const VOICE = [
  "relaxed and conversational, like talking to a friend",
  "casual and unscripted, short sentences, no announcer energy",
  "calm and direct, speaking over the action rather than to the lens",
  "speaking while using the product, pausing naturally, breathing audible",
  "enthusiastic but believable, a slightly faster pace, never shouting",
  "quiet and confidential, as if letting the viewer in on something",
];

const STRUCTURE = [
  "12 to 15 seconds: hook in the first second, one clear demonstration, quick payoff",
  "15 to 20 seconds: two seconds of problem, eight of product, the rest on the result",
  "around 15 seconds, one continuous take with no cuts at all",
  "18 to 22 seconds in three tight beats — before, during, after",
  "10 to 12 seconds, fast: straight into the product, one benefit, done",
];

/** Só o acabamento muda com o preço. Sem preço, cai no conjunto neutro. */
const FINISH = {
  budget: [
    "the look of an inexpensive everyday find — casual and unpretentious",
    "filmed at home on a phone, no production value pretended",
    "simple and quick, the way a real person shares a cheap find",
  ],
  mid: [
    "everyday production quality — nothing that reads as a big-budget commercial",
    "shot like a real customer filmed it, not like an agency made it",
    "natural and unpolished, real imperfections left in",
  ],
  premium: [
    "slightly more careful framing and cleaner surfaces, but still handheld and real",
    "a more considered look that never becomes a studio commercial",
    "calm and deliberate, letting the build quality carry the shot",
  ],
};

/**
 * Regras que TODO prompt carrega, sempre, palavra por palavra. É bloco fixo de
 * propósito: são requisitos do produto, não variação criativa. Sortear a
 * redação delas só criaria chance de uma sair ambígua.
 */
const HARD_RULES = [
  "Hard requirements (all mandatory):",
  "- Vertical 9:16 video, framed to be posted as a story or a reel.",
  "- Photorealistic. Real footage: real skin texture, real fabric, real reflections, natural imperfections. Not animated, not 3D, not illustrated, not stylised.",
  "- A real human being on camera, physically handling and using the product.",
  "- The single voice speaks Brazilian Portuguese.",
  "- NO on-screen text of any kind: no captions, no subtitles, no titles, no logos, no watermarks, no price tags, no graphics.",
  "- NO background music, no soundtrack, no jingle, no sound effects.",
  "- ONE human voice only: a single speaker, no second voice, no dialogue between two people, no choir, no layered or overlapping voices.",
].join("\n");

// ─── Montagem ────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Faixa de acabamento pelo preço. Sem preço válido, usa o conjunto do meio. */
function finishPool(price?: number): string[] {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return FINISH.mid;
  if (price <= 60) return FINISH.budget;
  if (price >= 200) return FINISH.premium;
  return FINISH.mid;
}

/**
 * Resolve o nicho pelo mapa de palavras-chave do copy-engine. Se o nome não
 * disser nada (produto cadastrado à mão com nome genérico), tenta a categoria
 * informada pelo catálogo antes de desistir para o padrão.
 */
function resolveScene(name: string, category: string): SceneBlocks {
  const inferred = inferProductContext(`${name} ${category}`).category;
  if (inferred !== "Achadinhos" && SCENES[inferred]) return SCENES[inferred];

  const byCategory = Object.keys(SCENES).find(
    (key) => deburr(key) === deburr(category.trim()),
  );
  return SCENES[byCategory ?? "Achadinhos"];
}

function build(input: VideoPromptInput): string {
  const name = input.name.trim() || "the product";
  const scene = resolveScene(name, input.category ?? "");

  return [
    "Vertical short-form product video, photorealistic.",
    "",
    `Product: "${name}" — ${scene.noun}.`,
    `Duration and structure: ${pick(STRUCTURE)}.`,
    "",
    `Scene: ${pick(scene.settings)}.`,
    `Person: ${pick(scene.subjects)}.`,
    `Action: the person ${pick(scene.actions)}.`,
    `Camera: ${pick(CAMERA)}.`,
    `Lighting: ${pick(LIGHTING)}.`,
    `Voice: one single human voice, ${pick(VOICE)}.`,
    `Production feel: ${pick(finishPool(input.price))}.`,
    "",
    HARD_RULES,
  ].join("\n");
}

/**
 * Gera um prompt de vídeo em inglês, nichado no produto. Cada chamada sorteia
 * blocos novos, então clicar de novo devolve outro prompt — isso é intencional.
 *
 * @param avoid prompts gerados recentemente. Se o sorteio cair num deles, refaz
 *              até achar um inédito.
 */
export function generateVideoPrompt(input: VideoPromptInput, avoid: string[] = []): string {
  const used = new Set(avoid);
  let candidate = build(input);
  for (let attempt = 0; attempt < 40 && used.has(candidate); attempt++) {
    candidate = build(input);
  }
  return candidate;
}
