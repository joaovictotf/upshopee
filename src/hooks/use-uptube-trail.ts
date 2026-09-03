/* ═══════════════════════════════════════════════════════════════════
   Trilha Uptube — camada de dados
   ═══════════════════════════════════════════════════════════════════

   Duas RPCs, e SÓ elas:
     • uptube_my_trail()      — lê os 5 vídeos com o progresso do usuário
     • uptube_save_progress() — a ÚNICA porta de escrita

   As tabelas `uptube_videos` e `uptube_progress` são SELECT-only para o
   client (migration 20260903120000): não existe policy de INSERT nem de
   UPDATE, e o GRANT de escrita foi revogado de `authenticated`. Um
   `supabase.from("uptube_progress").insert(...)` daqui volta 403
   "permission denied" — de propósito. A regra anti-pulo mora na RPC, no
   servidor; escrever direto seria contorná-la.

   REGRA QUE NÃO PODE SER QUEBRADA AQUI: `unlocked` e `trail_complete`
   vêm PRONTOS do servidor e são usados como vêm. Nunca recalcular o
   portão em TypeScript — duas fontes de verdade para a mesma regra é
   exatamente como elas divergem. O único jeito de esses dois campos
   mudarem é um refetch. */

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useApp } from "../lib/state";

/* Uma linha de uptube_my_trail().

   Por que este tipo existe em vez de derivar de Database["public"]["Functions"]:
   o gerador de tipos do Supabase não sabe a nulidade das colunas de um
   RETURNS TABLE e marca TUDO como não-nulo. Mas `duration_sec` é NULL até o
   primeiro player informar a duração, e `completed_at` é NULL até a conclusão
   — os dois estados mais comuns numa conta nova. Confiar no tipo gerado daria
   `string` onde chega `null` e quebraria na primeira formatação de data. */
export interface UptubeTrailRow {
  video_id: string;
  position: number;
  youtube_id: string;
  title: string;
  /** NULL até o primeiro player reportar a duração (congelada no servidor). */
  duration_sec: number | null;
  furthest_sec: number;
  last_sec: number;
  /** ISO timestamp, ou NULL se ainda não concluiu. */
  completed_at: string | null;
  /** CALCULADO NO SERVIDOR. Não recalcular aqui. */
  unlocked: boolean;
  /** CALCULADO NO SERVIDOR: as 5 aulas concluídas. Repete em todas as linhas. */
  trail_complete: boolean;
}

/** O que uptube_save_progress() devolve: o estado REALMENTE GRAVADO. */
export interface UptubeSaveResult {
  video_id: string;
  duration_sec: number | null;
  furthest_sec: number;
  last_sec: number;
  completed_at: string | null;
}

export interface UptubeSaveInput {
  videoId: string;
  currentSec: number;
  /** getDuration() do player. Só tem efeito na PRIMEIRA vez que o servidor vê
   *  este vídeo — depois disso ele congela o valor e ignora este parâmetro.
   *  Por isso o player só pode mandar depois de onReady: um número errado na
   *  primeira chamada é permanente. */
  durationSec?: number | null;
}

const trailKey = (userId: string | null | undefined) => ["uptube-trail", userId ?? "anon"] as const;

async function fetchTrail(): Promise<UptubeTrailRow[]> {
  const { data, error } = await supabase.rpc("uptube_my_trail");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as UptubeTrailRow[];

  /* A RPC já devolve ORDER BY position. Reordenar aqui é cinto e suspensório
     barato contra o PostgREST reembaralhar a resposta — e é só ORDEM, não o
     portão: nenhum `unlocked` é decidido neste arquivo. */
  return [...rows].sort((a, b) => a.position - b.position);
}

export function useUptubeTrail() {
  const { currentUserId } = useApp();
  const queryClient = useQueryClient();
  const key = useMemo(() => trailKey(currentUserId), [currentUserId]);

  const query = useQuery({
    queryKey: key,
    queryFn: fetchTrail,
    // Sem sessão a RPC levanta 'Não autorizado' (ela exige auth.uid()).
    // Melhor não chamar do que mostrar erro para quem está deslogando.
    enabled: Boolean(currentUserId),
    staleTime: 15_000,
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ videoId, currentSec, durationSec }: UptubeSaveInput): Promise<UptubeSaveResult> => {
      const { data, error } = await supabase.rpc("uptube_save_progress", {
        p_video_id: videoId,
        // O servidor já faz GREATEST(coalesce(...,0), 0), mas mandar um
        // fracionário ou negativo daqui só geraria ruído: p_current_sec é int.
        p_current_sec: Math.max(0, Math.floor(currentSec)),
        // undefined some do corpo JSON e o parâmetro cai no DEFAULT NULL da
        // função. Mandar null explícito daria no mesmo, mas undefined deixa
        // claro que é "não tenho essa informação ainda".
        p_duration_sec:
          durationSec == null || !Number.isFinite(durationSec) ? undefined : Math.round(durationSec),
      });
      if (error) throw new Error(error.message);

      // RETURNS TABLE → o supabase-js entrega array de uma linha.
      const row = (Array.isArray(data) ? data[0] : data) as UptubeSaveResult | undefined;
      if (!row) throw new Error("uptube_save_progress não devolveu linha.");
      return row;
    },

    onSuccess: (saved) => {
      const previous = queryClient.getQueryData<UptubeTrailRow[]>(key);
      const before = previous?.find((r) => r.video_id === saved.video_id);

      /* Concluiu AGORA? Só o servidor decide isso — aqui é só a comparação
         entre o que estava em cache e o que a RPC devolveu. */
      const newlyCompleted = Boolean(saved.completed_at) && !before?.completed_at;

      /* Espelha no cache os quatro campos que a própria RPC acabou de
         devolver. Todos são valor do servidor, nenhum é calculado aqui.
         Serve para o caso de fechar e reabrir o player sem recarregar a
         página: sem isto, `last_sec` continuaria o da última leitura e a
         pessoa voltaria para o começo em vez de onde parou.

         `unlocked` e `trail_complete` NÃO são tocados — eles só mudam por
         refetch, que é a linha logo abaixo. */
      queryClient.setQueryData<UptubeTrailRow[]>(key, (rows) =>
        rows?.map((r) =>
          r.video_id === saved.video_id
            ? {
                ...r,
                duration_sec: saved.duration_sec,
                furthest_sec: saved.furthest_sec,
                last_sec: saved.last_sec,
                completed_at: saved.completed_at,
              }
            : r,
        ),
      );

      /* Concluiu → busca a trilha de novo, porque o cadeado do PRÓXIMO vídeo
         (e o `trail_complete` que libera o certificado) são recalculados no
         servidor. É o refetch que abre o próximo, não o client. */
      if (newlyCompleted) void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  /* Estável entre renders: o player guarda esta função em ref e a chama de
     dentro de timers e de listeners de visibilitychange. */
  const { mutateAsync } = saveMutation;
  const save = useCallback(
    (input: UptubeSaveInput) => mutateAsync(input),
    [mutateAsync],
  );

  const rows = query.data ?? [];

  return {
    rows,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    save,
    /** Do servidor. Falso enquanto a trilha não carregou. */
    trailComplete: rows.length > 0 && rows.every((r) => r.trail_complete),
    completedCount: rows.filter((r) => r.completed_at).length,
    total: rows.length,
  };
}
