import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import {
  Search, Play, Info, Clock, GraduationCap,
  BarChart3, ShoppingBag, MessageCircle, Bot,
  Clapperboard, Link2, Star, Sparkles, ChevronDown,
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
   Component
   ═══════════════════════════════════════════════════════════════════ */

function AulasPage() {
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

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
                onClick={COMING_SOON_TOAST}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-2)] transition-colors active:scale-[0.98]"
              >
                <Play className="h-4 w-4" fill="currentColor" /> Assistir
              </button>
              <button
                onClick={COMING_SOON_TOAST}
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
                          onClick={COMING_SOON_TOAST}
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
    </DashboardShell>
  );
}
