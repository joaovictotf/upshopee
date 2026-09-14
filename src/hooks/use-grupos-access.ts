/* ═══════════════════════════════════════════════════════════════════
   Grupos de Divulgação — o portão do add-on pago
   ═══════════════════════════════════════════════════════════════════

   UMA RPC, e só ela:
     • grupos_has_access() — true se o usuário tem acesso vigente

   A tabela `grupos_access` é SELECT-only para o client (migration
   20260914120000): não existe policy de INSERT, e o GRANT de escrita foi
   revogado de `authenticated`. Um
   `supabase.from("grupos_access").insert({ user_id: meuId })` daqui volta
   403 "permission denied for table grupos_access" — de propósito, e está
   verificado contra produção. Quem libera acesso é
   admin_grant_grupos_access, chamada por um admin, depois do pagamento.
   Não há webhook.

   DUAS REGRAS QUE NÃO PODEM SER QUEBRADAS AQUI:

   1. NÃO EXISTE ATALHO DE ADMIN. grupos_has_access() lê a tabela e mais
      nada — ela não dá passe livre para admin, e este arquivo também não.
      Resolver privilégio por e-mail no client é o bug crítico do §11 item 1
      do CLAUDE.md (isAdminEmail em state.tsx:849); não vai se espalhar para
      cá. Admin que precisa da página inteira ganha uma linha de verdade,
      como todo mundo.

   2. FALHA FECHA. Erro de rede, RPC fora do ar, sessão expirando: a
      resposta é "não tem acesso". `hasAccess` só é true quando o servidor
      respondeu, literalmente, true. Um blip de rede não pode destravar
      recurso pago — e o caminho contrário (abrir na dúvida) é exatamente
      como um gate vira enfeite. */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useApp } from "../lib/state";

const accessKey = (userId: string | null | undefined) =>
  ["grupos-access", userId ?? "anon"] as const;

async function fetchHasAccess(): Promise<boolean> {
  const { data, error } = await supabase.rpc("grupos_has_access");
  if (error) throw new Error(error.message);
  /* Comparação estrita de propósito: qualquer coisa que não seja o booleano
     true do servidor (null, undefined, string "false") vira "sem acesso". */
  return data === true;
}

export interface GruposAccess {
  /** true SOMENTE quando o servidor respondeu true. Falso enquanto carrega e
   *  falso em qualquer erro. */
  hasAccess: boolean;
  /** Enquanto for true, a página não pode renderizar NENHUM dos dois lados. */
  isLoading: boolean;
}

export function useGruposAccess(): GruposAccess {
  const { currentUserId, user, authReady } = useApp();
  const key = useMemo(() => accessKey(currentUserId), [currentUserId]);

  const query = useQuery({
    queryKey: key,
    queryFn: fetchHasAccess,
    // Sem sessão a RPC nem é chamável (anon não tem EXECUTE). Melhor não
    // chamar do que gerar um 401 no console de quem está deslogando.
    enabled: Boolean(currentUserId),
    staleTime: 30_000,
    // Duas tentativas antes de desistir. Como a falha FECHA o portão, uma
    // oscilação curta de rede não pode trancar quem pagou — e o refetch
    // padrão ao voltar o foco da aba termina de recuperar sozinho.
    retry: 2,
  });

  /* A sessão ainda está se resolvendo? Então a resposta ainda não existe.
     O gate pai (/dashboard) já garante authReady + user antes de montar esta
     rota, então `user && !currentUserId` é um estado transitório de um tick —
     mas tratá-lo como "carregando" é o que impede o piscar do lado errado. */
  const waitingForSession = !authReady || (Boolean(user) && !currentUserId);
  const isLoading = waitingForSession || (Boolean(currentUserId) && query.isPending);

  return {
    // Fecha na dúvida: só o true do servidor abre.
    hasAccess: !isLoading && query.data === true,
    isLoading,
  };
}
