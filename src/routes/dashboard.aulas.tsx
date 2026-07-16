import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../lib/state";
import { supabase } from "../integrations/supabase/client";
import { DashboardShell } from "../components/layout/DashboardShell";
import {
  Search, Play, Info, Clock, GraduationCap,
  BarChart3, ShoppingBag, MessageCircle, Bot,
  Clapperboard, Link2, Star, Sparkles, ChevronDown, X,
} from "lucide-react";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/aulas")({ component: AulasPage });

const COMING_SOON_TOAST = () => toast.info("Aulas em breve!", {
  description: "Os vídeos serão adicionados em breve. Fique ligado!",
});

/* ═══════════════════════════════════════════════════════════════════
   CSS Animations — all GPU-accelerated (transform + opacity only)
   ═══════════════════════════════════════════════════════════════════ */
const ANIM_CSS = `
@media (prefers-reduced-motion: no-preference) {
  /* 1. Float — smooth vertical oscillation */
  @keyframes a-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-8px); }
  }
  /* 2. Pulse scale — breathe in/out */
  @keyframes a-pulse {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50%      { transform: scale(1.15); opacity: 1; }
  }
  /* 3. Pulse dot — subtle beat */
  @keyframes a-dot {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50%      { transform: scale(1.6); opacity: 1; }
  }
  /* 4. Orbit — full rotation */
  @keyframes a-orbit {
    from { transform: rotate(0deg) translateX(28px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
  }
  /* 5. Ripple — concentric scale + fade */
  @keyframes a-ripple {
    0%   { transform: scale(0.4); opacity: 0.8; }
    100% { transform: scale(1.8); opacity: 0; }
  }
  /* 6. Typing dots — sequential opacity */
  @keyframes a-type {
    0%, 20%  { opacity: 0.3; transform: translateY(0); }
    50%      { opacity: 1; transform: translateY(-4px); }
    80%,100% { opacity: 0.3; transform: translateY(0); }
  }
  /* 7. Zoom pulse */
  @keyframes a-zoom {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.12); }
  }
  /* 8. Bar grow — staggered scaleY */
  @keyframes a-bar {
    0%, 100% { transform: scaleY(0.4); }
    50%      { transform: scaleY(1); }
  }
  /* 9. Fade in/out for connected dot */
  @keyframes a-fade {
    0%, 100% { opacity: 0.3; }
    50%      { opacity: 0.9; }
  }
}
`;

/* ═══════════════════════════════════════════════════════════════════
   Thumbnail gradients — one per module
   ═══════════════════════════════════════════════════════════════════ */
const THUMB_GRADIENTS = [
  "linear-gradient(135deg, #F4541E 0%, #FF7A45 50%, #1a1a20 100%)",
  "linear-gradient(160deg, #FF7A45 0%, #F4541E 40%, #2a1a30 100%)",
  "linear-gradient(145deg, #F4541E 0%, #FFB088 40%, #0a1a28 100%)",
  "linear-gradient(150deg, #FF7A45 0%, #F4541E 35%, #1a2a18 100%)",
  "linear-gradient(140deg, #F4541E 0%, #FF9A65 45%, #201a10 100%)",
  "linear-gradient(155deg, #FF7A45 0%, #F4541E 30%, #101a28 100%)",
  "linear-gradient(135deg, #F4541E 0%, #FFB088 50%, #1a1028 100%)",
];

/* ═══════════════════════════════════════════════════════════════════
   Per-module thumbnail icon + animation
   ═══════════════════════════════════════════════════════════════════ */
const THUMB_ICONS: Array<{
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  extras: (i: number) => React.ReactNode;
}> = [
  /* 0 — Introdução: GraduationCap floating */
  {
    Icon: GraduationCap,
    extras: () => (
      <>
        <div className="absolute top-3 right-4 h-2.5 w-2.5 rounded-full bg-white/25" style={{ animation: "a-dot 2s ease-in-out infinite" }} />
        <div className="absolute bottom-5 left-4 h-2 w-2 rounded-full bg-white/20" style={{ animation: "a-dot 2.4s ease-in-out infinite 0.6s" }} />
      </>
    ),
  },
  /* 1 — Dashboard: BarChart3 with pulsing bars */
  {
    Icon: BarChart3,
    extras: () => (
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-1.5 rounded-t-sm bg-white/30 origin-bottom"
            style={{ height: `${14 + i * 5}px`, animation: `a-bar ${1.6 + i * 0.15}s ease-in-out infinite ${i * 0.12}s` }} />
        ))}
      </div>
    ),
  },
  /* 2 — Produtos: ShoppingBag with orbiting star */
  {
    Icon: ShoppingBag,
    extras: () => (
      <Star className="absolute h-3.5 w-3.5 text-white/70"
        style={{
          animation: "a-orbit 3s linear infinite",
          top: "50%", left: "50%", marginTop: -7, marginLeft: -7,
        }} />
    ),
  },
  /* 3 — Grupos: MessageCircle with ripple rings */
  {
    Icon: MessageCircle,
    extras: () => (
      <>
        {[0, 1, 2].map((i) => (
          <div key={i} className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-12 w-12 rounded-full border border-white/20"
              style={{ animation: `a-ripple ${2.2 + i * 0.3}s ease-out infinite ${i * 0.7}s` }} />
          </div>
        ))}
      </>
    ),
  },
  /* 4 — IA Divulgadora: Bot with typing dots */
  {
    Icon: Bot,
    extras: () => (
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-2 w-2 rounded-full bg-white/60"
            style={{ animation: `a-type 1.4s ease-in-out infinite ${i * 0.2}s` }} />
        ))}
      </div>
    ),
  },
  /* 5 — Vídeo IA: Clapperboard with zoom pulse */
  {
    Icon: Clapperboard,
    extras: () => (
      <>
        <div className="absolute top-2 right-3 h-2.5 w-2.5 rounded-full bg-white/25" style={{ animation: "a-dot 1.8s ease-in-out infinite" }} />
        <Sparkles className="absolute top-1 right-7 h-3 w-3 text-white/50" style={{ animation: "a-pulse 2.6s ease-in-out infinite 0.4s" }} />
      </>
    ),
  },
  /* 6 — Integrações: Link2 with connected dots */
  {
    Icon: Link2,
    extras: () => (
      <>
        <div className="absolute top-5 left-8 h-2 w-2 rounded-full bg-white/30" style={{ animation: "a-fade 2s ease-in-out infinite" }} />
        <div className="absolute top-5 right-8 h-2 w-2 rounded-full bg-white/60" style={{ animation: "a-fade 2s ease-in-out infinite 1s" }} />
        <div className="absolute top-5 left-1/2 h-px w-8 -translate-x-1/2 bg-white/15" />
      </>
    ),
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Thumbnail Component
   ═══════════════════════════════════════════════════════════════════ */

function AnimatedThumbnail({ mi }: { mi: number }) {
  const { Icon, extras } = THUMB_ICONS[mi] ?? THUMB_ICONS[0];
  const gradient = THUMB_GRADIENTS[mi] ?? THUMB_GRADIENTS[0];

  return (
    <div className="relative h-32 overflow-hidden rounded-t-2xl" style={{ background: gradient }}>
      {/* Decorative bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }} />
      {/* Central icon — floating */}
      <div className="absolute inset-0 flex items-center justify-center"
        style={{ animation: mi === 5 ? "a-zoom 2.8s ease-in-out infinite" : mi !== 1 && mi !== 3 ? "a-float 3s ease-in-out infinite" : undefined }}>
        <Icon className="h-12 w-12 text-white/80" />
      </div>
      {/* Module-specific extras */}
      {extras(mi)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Modules & Lessons
   ═══════════════════════════════════════════════════════════════════ */
interface Lesson {
  title: string;
  duration: string;
}

interface Module {
  name: string;
  lessonCount: number;
  lessons: Lesson[];
}

const MODULES: Module[] = [
  {
    name: "Introdução à UpShopee",
    lessonCount: 3,
    lessons: [
      { title: "Boas-vindas e visão geral da plataforma", duration: "8 min" },
      { title: "Como navegar no painel principal", duration: "12 min" },
      { title: "Seu primeiro acesso: configurando o perfil", duration: "6 min" },
    ],
  },
  {
    name: "Dashboard e Métricas",
    lessonCount: 4,
    lessons: [
      { title: "Entendendo as métricas do painel", duration: "10 min" },
      { title: "Comissões: como calcular seus ganhos", duration: "14 min" },
      { title: "Acompanhando vendas em tempo real", duration: "9 min" },
      { title: "Relatórios e histórico de performance", duration: "11 min" },
    ],
  },
  {
    name: "Produtos e Catálogo",
    lessonCount: 5,
    lessons: [
      { title: "Explorando o catálogo de produtos", duration: "7 min" },
      { title: "Como escolher produtos com alta margem", duration: "15 min" },
      { title: "Gerando anúncios com a IA da UpShopee", duration: "18 min" },
      { title: "Precificação inteligente: definindo seu lucro", duration: "12 min" },
      { title: "Fornecedores: escolhendo o melhor custo-benefício", duration: "10 min" },
    ],
  },
  {
    name: "Grupos de Divulgação",
    lessonCount: 3,
    lessons: [
      { title: "O que são grupos de divulgação", duration: "5 min" },
      { title: "Criando e gerenciando seus grupos", duration: "9 min" },
      { title: "Estratégias para divulgar em grupos", duration: "13 min" },
    ],
  },
  {
    name: "IA Divulgadora",
    lessonCount: 4,
    lessons: [
      { title: "Apresentando o Robô Divulgador", duration: "8 min" },
      { title: "Configurando divulgação automática", duration: "16 min" },
      { title: "Melhores horários para divulgar", duration: "7 min" },
      { title: "Analisando resultados das divulgações", duration: "11 min" },
    ],
  },
  {
    name: "Vídeo IA",
    lessonCount: 5,
    lessons: [
      { title: "Introdução ao Vídeo IA", duration: "6 min" },
      { title: "Criando seu primeiro vídeo com IA", duration: "20 min" },
      { title: "Templates e edição rápida", duration: "14 min" },
      { title: "Dicas para vídeos que convertem", duration: "17 min" },
      { title: "Publicando no Shopee Video", duration: "9 min" },
    ],
  },
  {
    name: "Integrações e Afiliados",
    lessonCount: 3,
    lessons: [
      { title: "Conectando sua conta Shopee", duration: "5 min" },
      { title: "Programa de afiliados: como funciona", duration: "10 min" },
      { title: "Maximizando ganhos como afiliado", duration: "15 min" },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
   Store Setup Wizard — types, IA templates, localStorage helpers
   ═══════════════════════════════════════════════════════════════════ */

interface StoreFormData {
  storeName: string;
  description: string;
  category: string;
  pixKey: string;
  pixKeyType: string;
  holderName: string;
  whatsapp: string;
}

const STORE_SETUP_KEY = (userId: string) => `upshopee-store-setup.${userId}`;

function loadStoreData(userId: string): StoreFormData | null {
  try {
    const raw = localStorage.getItem(STORE_SETUP_KEY(userId));
    return raw ? (JSON.parse(raw) as StoreFormData) : null;
  } catch {
    return null;
  }
}

function saveStoreData(userId: string, data: StoreFormData) {
  localStorage.setItem(STORE_SETUP_KEY(userId), JSON.stringify(data));
}

async function upsertStoreToProfiles(userId: string, data: StoreFormData) {
  try {
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, store_data: data }, { onConflict: "id" });
    if (error) console.warn("[StoreWizard] Supabase upsert error:", error);
  } catch (err) {
    console.warn("[StoreWizard] Supabase upsert failed:", err);
  }
}

const CATEGORIES = [
  "Moda",
  "Eletrônicos",
  "Casa",
  "Beleza",
  "Acessórios",
  "Esportes",
  "Colecionáveis",
  "Outro",
] as const;

const PIX_KEY_TYPES = ["CPF", "Email", "Celular", "Aleatória"] as const;

/* ═══════════════════════════════════════════════════════════════════
   IA Description Templates (no API — pure template logic)
   ═══════════════════════════════════════════════════════════════════ */

type CategoryTemplateMap = Record<string, string[]>;

const IA_TEMPLATES: CategoryTemplateMap = {
  Moda: [
    "Sua loja de moda com as melhores tendências. Roupas, acessórios e calçados com preços incríveis direto da Shopee. Entrega rápida e atendimento personalizado.",
    "Descubra as últimas tendências da moda com curadoria especial. Peças exclusivas, streetwear, moda feminina e masculina — tudo com frete grátis e descontos imperdíveis.",
    "Moda com estilo e economia. Enviamos para todo o Brasil com segurança e agilidade. Novidades toda semana para você arrasar no look sem gastar muito.",
    "Sua loja de moda na Shopee: roupas, calçados, bolsas e acessórios selecionados com carinho. Preços justos, qualidade garantida e entrega expressa.",
  ],
  Eletrônicos: [
    "Tecnologia de ponta com os melhores preços. Fones, smartwatches, acessórios e gadgets para facilitar seu dia a dia. Tudo com garantia e entrega rápida.",
    "Eletrônicos e gadgets com o melhor custo-benefício da Shopee. Produtos originais, garantia de fábrica e suporte dedicado para você comprar com confiança.",
    "Sua loja tech: smartphones, acessórios, áudio, iluminação LED e muito mais. Preços que cabem no bolso com a qualidade que você merece.",
    "Inovação ao seu alcance. Selecionamos os melhores eletrônicos e gadgets para facilitar sua vida. Tecnologia, praticidade e economia em um só lugar.",
  ],
  Casa: [
    "Transforme sua casa com nossos produtos selecionados. Decoração, utilidades domésticas, organização e muito mais — tudo com preço de fábrica.",
    "Casa dos sonhos começa aqui. Itens de decoração, cozinha, banheiro e jardim. Qualidade e bom gosto para todos os ambientes.",
    "Sua casa mais bonita e funcional. Tapetes, cortinas, organizadores, iluminação e utensílios práticos para o dia a dia.",
    "Decoração e utilidades com design e economia. Enviamos para todo o Brasil com carinho e agilidade. Sua casa merece o melhor.",
  ],
  Beleza: [
    "Sua loja de beleza com produtos selecionados. Maquiagem, skincare, perfumaria e cuidados capilares. As melhores marcas com os melhores preços.",
    "Beleza que transforma. Cosméticos, dermocosméticos, maquiagem profissional e cuidados diários — tudo que você precisa para se sentir incrível.",
    "Realce sua beleza natural. Linha completa de maquiagem, cuidados com a pele e cabelos. Produtos testados e aprovados com entrega rápida.",
    "Mundo beauty na palma da sua mão. Lançamentos, kits exclusivos e os produtos mais desejados do momento com preços imperdíveis.",
  ],
  Acessórios: [
    "Acessórios que fazem a diferença. Relógios, óculos, bijuterias, carteiras e muito mais. Estilo e qualidade por preços que você não acredita.",
    "O acessório certo muda tudo. Coleção completa de semi-joias, relógios estilosos, bolsas e carteiras. Perfeito para presentear ou se presentear.",
    "Acessórios para todos os estilos. Do clássico ao moderno, do básico ao statement piece. Qualidade, design e preço justo.",
    "Complete seu look com os melhores acessórios da Shopee. Bijuterias finas, óculos de sol, carteiras e muito mais. Frete grátis em todo o Brasil.",
  ],
  Esportes: [
    "Sua loja de esportes com equipamentos e acessórios para todos os níveis. Fitness, corrida, musculação, yoga e esportes ao ar livre.",
    "Desempenho máximo com os melhores equipamentos esportivos. Tênis, roupas fitness, acessórios de treino e suplementação com preços campeões.",
    "Vida ativa começa aqui. Equipamentos para academia em casa, corrida, ciclismo, yoga e muito mais. Qualidade profissional para todos os bolsos.",
    "Esporte e lazer com economia. Bicicletas, patins, equipamentos de camping e pesca. Tudo para você se movimentar e se divertir.",
  ],
  Colecionáveis: [
    "Para colecionadores apaixonados. Action figures, cards, miniaturas, itens raros e edições limitadas. Curadoria especial para sua coleção.",
    "Mundo geek e colecionável. Funko Pop, Pokémon TCG, Marvel, DC, Star Wars e muito mais. Itens originais e lacrados com envio seguro.",
    "Sua coleção merece o melhor. Figuras de ação, carrinhos em miniatura, cards colecionáveis e itens de cultura pop. Novidades toda semana.",
    "Colecionáveis que contam histórias. Edições limitadas, imports e achados raros do mundo geek. Embalagem reforçada e entrega garantida.",
  ],
  Outro: [
    "Sua loja na Shopee com os melhores produtos selecionados a dedo. Variedade, qualidade e preços incríveis com entrega rápida para todo o Brasil.",
    "Produtos de qualidade com preços que cabem no seu bolso. Atendimento nota 10 e envio expresso. Sua satisfação é nossa prioridade.",
    "O melhor da Shopee reunido em um só lugar. Produtos variados, todos com garantia e frete grátis. Confira nossas ofertas!",
    "Qualidade, variedade e economia. Trabalhamos com os melhores fornecedores para oferecer produtos incríveis com preços justos.",
  ],
};

function generateDescription(storeName: string, category: string): string {
  const pool = IA_TEMPLATES[category] ?? IA_TEMPLATES["Outro"];
  // Deterministic selection so same inputs always produce same output
  const idx = ((storeName.length * 7 + category.length * 13) % pool.length);
  return pool[idx];
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

function AulasPage() {
  const { isAdmin, currentUserId, user } = useApp();
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  /* ═══ Store Setup Wizard state ═══ */
  const [wizardPhase, setWizardPhase] = useState<"phase1" | "phase2" | null>(null);
  const [formData, setFormData] = useState<StoreFormData>({
    storeName: "",
    description: "",
    category: "",
    pixKey: "",
    pixKeyType: "",
    holderName: "",
    whatsapp: "",
  });
  const [storeSetupDone, setStoreSetupDone] = useState(false);

  // On mount, check if user already saved store data
  useEffect(() => {
    if (!currentUserId || isAdmin) return;
    const saved = loadStoreData(currentUserId);
    if (saved) {
      setStoreSetupDone(true);
      setFormData(saved);
    }
  }, [currentUserId, isAdmin]);

  const userId = currentUserId ?? user?.id ?? "";

  const handleLessonClick = useCallback(() => {
    if (isAdmin) {
      COMING_SOON_TOAST();
      return;
    }
    if (!currentUserId) {
      COMING_SOON_TOAST();
      return;
    }
    if (storeSetupDone) {
      toast.success("Sua loja está em criação.", {
        description: "Prazo estimado: 3 dias úteis. Você receberá um aviso por email.",
      });
      return;
    }
    setWizardPhase("phase1");
  }, [isAdmin, currentUserId, storeSetupDone]);

  const closeWizard = useCallback(() => {
    setWizardPhase(null);
    toast.info("Você pode personalizar depois clicando em qualquer aula.", {
      description: "Estamos aguardando seus dados para criar sua loja.",
    });
  }, []);

  const openPhase2 = useCallback(() => {
    setWizardPhase("phase2");
  }, []);

  const handleFormChange = useCallback(
    (field: keyof StoreFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleGenerateIA = useCallback(() => {
    if (!formData.storeName.trim()) {
      toast.error("Digite o nome da loja primeiro.");
      return;
    }
    const desc = generateDescription(
      formData.storeName.trim(),
      formData.category || "Outro",
    );
    setFormData((prev) => ({ ...prev, description: desc }));
  }, [formData.storeName, formData.category]);

  const handleSaveStore = useCallback(async () => {
    if (!formData.storeName.trim() || !formData.description.trim()) {
      toast.error("Preencha o nome e a descrição da loja.");
      return;
    }
    if (!formData.pixKey.trim()) {
      toast.error("Preencha a chave Pix.");
      return;
    }
    if (!formData.holderName.trim()) {
      toast.error("Preencha o nome do titular da chave.");
      return;
    }

    saveStoreData(userId, formData);
    await upsertStoreToProfiles(userId, formData);
    setStoreSetupDone(true);
    setWizardPhase(null);

    toast.success("✅ Loja em criação!", {
      description:
        "Em até 3 dias úteis sua loja estará pronta. Você receberá um aviso por email.",
    });
  }, [formData, userId]);

  const toggleModule = useCallback((idx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    if (!q) return MODULES;
    const lower = q.toLowerCase();
    return MODULES
      .map((m) => ({
        ...m,
        lessons: m.lessons.filter(
          (l) =>
            l.title.toLowerCase().includes(lower) ||
            m.name.toLowerCase().includes(lower)
        ),
      }))
      .filter((m) => m.lessons.length > 0);
  }, [q]);

  return (
    <DashboardShell
      title="Aulas"
      subtitle="Domine a plataforma com cursos gratuitos"
    >
      <style>{ANIM_CSS}</style>
      <div className="page-enter">
        {/* ═══ HERO — Featured Module ═══ */}
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(244,84,30,0.18) 0%, rgba(244,84,30,0.04) 50%, rgba(10,10,14,0.6) 100%)",
            border: "1px solid var(--accent-soft, rgba(244,84,30,0.15))",
          }}>
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--accent, #F4541E), transparent 70%)" }} />

          <div className="relative">
            <span className="inline-block rounded-full bg-[var(--accent)]/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)] mb-4">
              Comece por aqui
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text)] mb-2">
              Introdução à UpShopee
            </h2>
            <p className="text-sm text-[var(--muted)] mb-6">
              3 aulas · Conheça a plataforma e dê os primeiros passos
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleLessonClick}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-2)] transition-colors active:scale-[0.98]"
              >
                <Play className="h-4 w-4" fill="currentColor" /> Assistir
              </button>
              <button
                onClick={handleLessonClick}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-medium text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors"
              >
                <Info className="h-4 w-4" /> Saiba mais
              </button>
            </div>
          </div>
        </div>

        {/* ═══ SEARCH ═══ */}
        <div className="mb-8">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar aulas..."
              className="h-11 rounded-full border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 text-sm text-[var(--text)] transition-all focus-visible:ring-[var(--accent)]/30 placeholder:text-[var(--muted)]"
            />
          </div>
        </div>

        {/* ═══ MODULE ROWS ═══ */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[var(--muted-bg)]">
              <GraduationCap className="h-8 w-8 text-[var(--muted)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text)]">Nenhuma aula encontrada</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Tente ajustar sua busca ou limpar os filtros.
            </p>
            <button
              onClick={() => setQ("")}
              className="mt-4 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors"
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((mod) => {
              const origIdx = MODULES.findIndex((m) => m.name === mod.name);
              const isCollapsed = collapsed.has(origIdx);

              return (
                <section key={mod.name}>
                  {/* Module header — collapsible toggle */}
                  <button
                    onClick={() => toggleModule(origIdx)}
                    className="flex w-full items-center justify-between gap-3 px-1 py-2 text-left hover:text-[var(--accent)] transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-lg font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                        {mod.name}
                      </h3>
                      <span className="shrink-0 rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
                        {mod.lessonCount} {mod.lessonCount === 1 ? "aula" : "aulas"}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[var(--muted)] group-hover:text-[var(--accent)] transition-transform duration-300 ${isCollapsed ? "" : "rotate-180"}`}
                    />
                  </button>

                  {/* Lessons row — collapsible via max-height */}
                  <div
                    className={`overflow-hidden transition-[max-height] duration-400 ease-out ${isCollapsed ? "max-h-0" : "max-h-[600px]"}`}
                  >
                    <div className="flex gap-3 overflow-x-auto pb-2 pt-1 md:flex-wrap scrollbar-none">
                      {mod.lessons.map((lesson, li) => (
                        <button
                          key={`${mod.name}-${li}`}
                          onClick={handleLessonClick}
                          className="group shrink-0 w-[220px] sm:w-[240px] text-left rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-lg"
                        >
                          {/* Animated thumbnail */}
                          <AnimatedThumbnail mi={origIdx} />

                          {/* Duration badge */}
                          <span className="absolute bottom-[76px] right-2 z-10 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm pointer-events-none">
                            <Clock className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                            {lesson.duration}
                          </span>

                          {/* Info */}
                          <div className="p-3">
                            <span className="inline-block rounded-md bg-[var(--muted-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)] mb-1.5">
                              Aula {li + 1}
                            </span>
                            <p className="text-sm font-medium text-[var(--text)] line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
                              {lesson.title}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
         STORE SETUP WIZARD — Overlay + Modals
         ═══════════════════════════════════════════════════════ */}
      {wizardPhase && !isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dark backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeWizard} />

          {/* PHASE 1 — Popup */}
          {wizardPhase === "phase1" && (
            <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1a1a20]">
                <h3 className="text-lg font-bold text-[#1a1a20] dark:text-white mb-3">
                  🏗️ Estamos criando sua loja
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Sua loja na Shopee está sendo configurada. Prazo estimado: 3 dias úteis.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                  Quer personalizar os dados da sua loja enquanto isso?
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={openPhase2}
                    className="w-full rounded-xl bg-gradient-to-r from-[#F4541E] to-[#FF7A45] px-5 py-3 text-sm font-semibold text-white hover:from-[#E04410] hover:to-[#F06030] transition-all active:scale-[0.98]"
                  >
                    Personalizar minha loja →
                  </button>
                  <button
                    onClick={closeWizard}
                    className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:bg-[#222] dark:text-gray-400 dark:hover:bg-[#2a2a2a]"
                  >
                    Fechar — quero esperar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PHASE 2 — Store Form */}
          {wizardPhase === "phase2" && (
            <div className="relative z-10 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
              <div className="rounded-2xl bg-white shadow-2xl dark:bg-[#1a1a20] max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-[#1a1a20] dark:text-white">
                    Personalizar sua loja
                  </h3>
                  <button
                    onClick={() => setWizardPhase("phase1")}
                    className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:hover:bg-[#2a2a2a] dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Form */}
                <div className="px-6 py-5 space-y-4">
                  {/* Store name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Nome da loja <span className="text-[#F4541E]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.storeName}
                      onChange={(e) => handleFormChange("storeName", e.target.value)}
                      placeholder="Ex: Vitrine Moda Brasil"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#F4541E]/40 focus:ring-2 focus:ring-[#F4541E]/10 dark:border-gray-700 dark:bg-[#111] dark:text-white"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Descrição da loja <span className="text-[#F4541E]">*</span>
                      </label>
                      <button
                        onClick={handleGenerateIA}
                        className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#F4541E]/10 to-[#FF7A45]/10 px-3 py-1.5 text-[11px] font-semibold text-[#F4541E] hover:from-[#F4541E]/20 hover:to-[#FF7A45]/20 transition-colors"
                      >
                        <Sparkles className="h-3 w-3" /> Gerar com IA
                      </button>
                    </div>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleFormChange("description", e.target.value)}
                      placeholder="Descreva sua loja..."
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all resize-none focus:border-[#F4541E]/40 focus:ring-2 focus:ring-[#F4541E]/10 dark:border-gray-700 dark:bg-[#111] dark:text-white"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Categoria principal
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleFormChange("category", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#F4541E]/40 focus:ring-2 focus:ring-[#F4541E]/10 dark:border-gray-700 dark:bg-[#111] dark:text-white"
                    >
                      <option value="">Selecione uma categoria</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pix section */}
                  <fieldset className="rounded-xl border border-gray-100 p-4 dark:border-gray-800 space-y-3">
                    <legend className="px-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Dados do Pix
                    </legend>

                    {/* Pix key */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Chave Pix <span className="text-[#F4541E]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.pixKey}
                        onChange={(e) => handleFormChange("pixKey", e.target.value)}
                        placeholder="Sua chave Pix"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#F4541E]/40 focus:ring-2 focus:ring-[#F4541E]/10 dark:border-gray-700 dark:bg-[#111] dark:text-white"
                      />
                    </div>

                    {/* Pix key type */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Tipo de chave
                      </label>
                      <select
                        value={formData.pixKeyType}
                        onChange={(e) => handleFormChange("pixKeyType", e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#F4541E]/40 focus:ring-2 focus:ring-[#F4541E]/10 dark:border-gray-700 dark:bg-[#111] dark:text-white"
                      >
                        <option value="">Selecione o tipo</option>
                        {PIX_KEY_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Holder name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        Nome do titular da chave <span className="text-[#F4541E]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.holderName}
                        onChange={(e) => handleFormChange("holderName", e.target.value)}
                        placeholder="Nome completo do titular"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#F4541E]/40 focus:ring-2 focus:ring-[#F4541E]/10 dark:border-gray-700 dark:bg-[#111] dark:text-white"
                      />
                    </div>
                  </fieldset>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      WhatsApp para contato <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.whatsapp}
                      onChange={(e) => handleFormChange("whatsapp", e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#F4541E]/40 focus:ring-2 focus:ring-[#F4541E]/10 dark:border-gray-700 dark:bg-[#111] dark:text-white"
                    />
                  </div>

                  {/* Save button */}
                  <button
                    onClick={handleSaveStore}
                    className="w-full rounded-xl bg-gradient-to-r from-[#F4541E] to-[#FF7A45] px-5 py-3.5 text-sm font-bold text-white hover:from-[#E04410] hover:to-[#F06030] transition-all active:scale-[0.98] shadow-lg shadow-[#F4541E]/20"
                  >
                    Salvar loja
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
