/* ═══════════════════════════════════════════════════════════════════
   Grupos de Divulgação — a página de quem AINDA NÃO tem o add-on
   ═══════════════════════════════════════════════════════════════════

   Montada por `GruposRoute` (src/routes/dashboard.grupos.tsx) quando
   grupos_has_access() devolve false. A página paga (`GruposPaid`) nem é
   criada nesse caso, então nada dela chega ao DOM.

   ⚠️ A REGRA QUE DEFINE ESTE ARQUIVO: daqui só pode sair UM grupo — o de
   demonstração. Os outros 11 não podem aparecer nem escondidos.

   Não basta esconder com CSS. `display:none`, blur, `overflow:hidden`,
   altura zero — em todos esses casos o nome e a URL continuam no HTML, e
   qualquer pessoa lê no inspetor com dois cliques. O que é vendido aqui é
   justamente a LISTA; entregá-la no DOM é entregar o produto.

   Por isso o filtro é de DADO, não de estilo: `DEMO_GROUP` é um `find` por
   id sobre `groups`, e nenhum outro item do array é referenciado em lugar
   nenhum deste arquivo. Se um dia alguém precisar mostrar mais alguma coisa
   aqui, o caminho é escolher o dado antes do render — nunca renderizar tudo
   e apagar depois.

   POR QUE O fb2 E NÃO OUTRO: é o único do catálogo criado explicitamente
   para afiliados postarem link ("divulge seu link", na própria descrição).
   Uma demonstração que termina com o post apagado por um moderador é um
   argumento CONTRA o produto — o grupo da demo precisa ser aquele onde
   postar é o comportamento esperado. */

import { ExternalLink, Clock, ShieldCheck, Users, MessageCircle } from "lucide-react";
import { DashboardShell } from "../layout/DashboardShell";
import { groups, type Group } from "../../lib/mock/groups";

/* O id, e SÓ o id, é literal aqui. Nome e URL são lidos de groups.ts —
   duplicá-los criaria uma segunda fonte de verdade que envelhece sozinha:
   trocar a URL do grupo lá não corrigiria a demonstração, e a pessoa cairia
   num link morto no meio do passo a passo. */
const DEMO_GROUP_ID = "fb2";

/** O único grupo que a versão trancada pode mostrar.
 *  `undefined` se o id sumir de groups.ts — a UI trata, não quebra. */
export const DEMO_GROUP: Group | undefined = groups.find((g) => g.id === DEMO_GROUP_ID);

/* Cartão do grupo de demonstração. Vive fora do componente de página porque
   o passo a passo o reaproveita na etapa "Selecione o grupo". */
export function DemoGroupCard({
  group,
  onOpen,
}: {
  group: Group;
  /** Chamado junto com a abertura da aba — quem usa decide o que fazer. */
  onOpen?: () => void;
}) {
  const PlatformIcon = group.platform === "WhatsApp" ? MessageCircle : Users;

  return (
    <div
      className="flex flex-col rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
              <PlatformIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
            </div>
            <h4 className="text-sm font-bold leading-tight text-[var(--text)]">{group.name}</h4>
          </div>
          <div className="ml-9 mt-1 text-[10px] text-[var(--muted)]">{group.platform}</div>
        </div>
        <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
          {group.category}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <div className="inline-flex items-center gap-1 rounded-full bg-[var(--muted-bg)] px-2 py-0.5 text-[var(--muted)]">
          <ShieldCheck className="h-3 w-3" />
          <span>{group.status}</span>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-[var(--muted-bg)] px-2 py-0.5">
          <Clock className="h-3 w-3 text-[var(--muted)]" />
          <span className="text-[var(--muted)]">
            Melhor: <span className="font-medium text-[var(--text)]">{group.bestTime}</span>
          </span>
        </div>
      </div>

      {group.description && (
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">{group.description}</p>
      )}

      {/* target="_blank" + rel="noopener noreferrer": sem o rel, a aba aberta
          recebe window.opener e pode navegar esta aqui para outro lugar. */}
      <a
        href={group.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onOpen}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Abrir grupo
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

export function GruposLocked() {
  return (
    <DashboardShell title="Grupos de Divulgação">
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-2">
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <h2 className="text-lg font-bold text-[var(--text)] sm:text-xl">
            Vamos te demonstrar como funciona os grupos de divulgação
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Você escolhe um grupo, escolhe um produto, a gente gera a divulgação e você publica.
          </p>
        </div>

        {DEMO_GROUP && (
          <div className="mt-4">
            <DemoGroupCard group={DEMO_GROUP} />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
