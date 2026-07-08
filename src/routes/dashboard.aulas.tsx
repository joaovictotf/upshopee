import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { Search, Play, Info, Clock, GraduationCap } from "lucide-react";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/aulas")({ component: AulasPage });

const COMING_SOON_TOAST = () => toast.info("Aulas em breve!", {
  description: "Os vídeos serão adicionados em breve. Fique ligado!",
});

// ═══════════════════════════════════════════════════════════════════
// Thumbnail gradients — one per module, accent-based variations
// ═══════════════════════════════════════════════════════════════════
const THUMB_GRADIENTS = [
  "linear-gradient(135deg, #F4541E 0%, #FF7A45 50%, #1a1a20 100%)",
  "linear-gradient(160deg, #FF7A45 0%, #F4541E 40%, #2a1a30 100%)",
  "linear-gradient(145deg, #F4541E 0%, #FFB088 40%, #0a1a28 100%)",
  "linear-gradient(150deg, #FF7A45 0%, #F4541E 35%, #1a2a18 100%)",
  "linear-gradient(140deg, #F4541E 0%, #FF9A65 45%, #201a10 100%)",
  "linear-gradient(155deg, #FF7A45 0%, #F4541E 30%, #101a28 100%)",
  "linear-gradient(135deg, #F4541E 0%, #FFB088 50%, #1a1028 100%)",
];

// ═══════════════════════════════════════════════════════════════════
// Modules & Lessons
// ═══════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

function AulasPage() {
  const [q, setQ] = useState("");

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
      <div className="page-enter">
        {/* ═══ HERO — Featured Module ═══ */}
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(244,84,30,0.18) 0%, rgba(244,84,30,0.04) 50%, rgba(10,10,14,0.6) 100%)",
            border: "1px solid var(--accent-soft, rgba(244,84,30,0.15))",
          }}>
          {/* Decorative glow */}
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
          <div className="space-y-10">
            {filtered.map((mod, mi) => {
              const origIdx = MODULES.indexOf(
                MODULES.find((m) => m.name === mod.name)!
              );
              const gradient = THUMB_GRADIENTS[origIdx] ?? THUMB_GRADIENTS[0];

              return (
                <section key={mod.name}>
                  {/* Module header */}
                  <div className="flex items-baseline justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--text)]">
                      {mod.name}
                    </h3>
                    <span className="text-xs text-[var(--muted)] shrink-0 ml-3">
                      {mod.lessonCount} {mod.lessonCount === 1 ? "aula" : "aulas"}
                    </span>
                  </div>

                  {/* Lessons — horizontal scroll on mobile, wrap on desktop */}
                  <div className="flex gap-3 overflow-x-auto pb-2 md:flex-wrap scrollbar-none">
                    {mod.lessons.map((lesson, li) => (
                      <button
                        key={`${mod.name}-${li}`}
                        onClick={COMING_SOON_TOAST}
                        className="group shrink-0 w-[220px] sm:w-[240px] text-left rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-lg"
                      >
                        {/* Thumbnail */}
                        <div
                          className="relative h-32 flex items-center justify-center"
                          style={{ background: gradient }}
                        >
                          <Play
                            className="h-8 w-8 text-white/60 group-hover:text-white/90 transition-colors"
                            fill="currentColor"
                          />
                          {/* Duration badge */}
                          <span className="absolute bottom-2 right-2 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                            <Clock className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                            {lesson.duration}
                          </span>
                        </div>

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
                </section>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
