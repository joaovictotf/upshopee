-- ═══════════════════════════════════════════════════════════════════════════
-- Grupos de Divulgação — o portão do add-on pago
-- Migration: 20260914120000_grupos_access
-- ═══════════════════════════════════════════════════════════════════════════
--
-- POR QUE ISTO EXISTE
-- ───────────────────
-- src/routes/dashboard.grupos.tsx é grátis para todo mundo hoje. Ele vira
-- add-on de R$ 49,90/mês. A página continua alcançável por qualquer usuário —
-- quem não tem acesso vê UM grupo de demonstração e um passo a passo guiado no
-- lugar da lista inteira. Não existe redirect, não existe 403 na cara.
--
-- NÃO EXISTE WEBHOOK. A provedora de pagamento não avisa ninguém quando alguém
-- paga. O acesso é liberado NA MÃO por um admin, depois do pagamento. Este
-- arquivo foi construído para essa realidade: não há endpoint esperando
-- callback, não há segredo compartilhado, não há fila de eventos. Há uma
-- tabela, uma função de leitura e duas funções de admin. Quem inventar um
-- webhook depois vai estar inventando um consumidor que nunca é chamado.
--
-- O QUE ESTE ARQUIVO REALMENTE PROTEGE
-- ────────────────────────────────────
-- É a mesma armadilha de uptube_progress (20260903120000), e aqui ela custa
-- dinheiro de verdade: se `authenticated` tiver INSERT em grupos_access,
-- qualquer pessoa com o DevTools aberto faz
--     POST /rest/v1/grupos_access  { "user_id": "<o próprio id>" }
-- e destrava um recurso pago sem pagar. A RLS NÃO AJUDA EM NADA nesse caso: a
-- policy "sou eu mesmo" está satisfeita, porque a linha É dela. RLS responde
-- "de quem é a linha", nunca "essa linha foi comprada".
--
-- Então a escrita não existe para o client, em nível de PRIVILÉGIO:
--   • GRANT decide se o papel tem o verbo (erro duro: "permission denied").
--   • POLICY decide quais linhas ele enxerga (0 linhas, silencioso).
-- Onde ninguém legítimo precisa do verbo, o GRANT sai. Assim uma policy larga
-- demais criada por engano numa migration futura não abre nada sozinha — foi o
-- argumento de 20260823140000 e vale igual aqui.
--
-- O PAPEL DE ADMIN VEM DE public.user_roles, NUNCA DE E-MAIL
-- ─────────────────────────────────────────────────────────
-- O §11 item 1 do CLAUDE.md é um bug CRÍTICO em aberto exatamente por isso:
-- hoje `isAdmin` é resolvido no client por isAdminEmail() (state.tsx:849), sem
-- consultar user_roles, e a senha de admin está no bundle publicado. Nada
-- neste arquivo estende esse erro. As duas funções de admin chamam
-- public.has_role(auth.uid(), 'admin'), que lê user_roles — e não aceitam
-- nenhum parâmetro dizendo quem é o chamador. Quem chama é auth.uid(), e
-- auth.uid() vem do JWT assinado pelo Supabase, não de algo que o client
-- digita.
--
-- Conferido contra produção em 14/09/2026, ANTES de escrever este arquivo:
-- user_roles tem 698 linhas, 2 delas 'admin' (victor@shopesync.com e
-- rikelme@shopsync.com). A conta do dono que está em uso — victor@shopesync.com,
-- último login em 14/09/2026 — TEM a linha de admin. As duas funções abaixo
-- não trancam o dono para fora.
--
-- ORDEM DENTRO DO ARQUIVO IMPORTA:
--   1. grupos_access — a tabela.
--   2. RLS + GRANTs — a trava de escrita, que é o ponto principal do arquivo.
--   3. RPC grupos_has_access — a leitura que a página vai usar.
--   4. RPCs de admin — conceder e retirar.
--   5. Asserção de privilégio: o arquivo confere a si mesmo e aborta se as
--      travas da seção 2 não estiverem valendo.
-- Tudo aplica em uma transação só (o `supabase db push` embrulha o arquivo).
--
-- Este arquivo é SÓ SQL. Nenhum .tsx foi alterado — dashboard.grupos.tsx
-- continua aberto para todo mundo até a próxima tarefa.


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. public.grupos_access — A LINHA É O ACESSO
-- ═══════════════════════════════════════════════════════════════════════════
-- Ter linha = ter acesso. NÃO existe coluna booleana `active`: duas formas de
-- dizer a mesma coisa divergem com o tempo (a linha some mas o boolean fica
-- true, ou o contrário) e aí ninguém sabe qual das duas manda. Tirar acesso é
-- apagar a linha.
--
-- expires_at NULL = nunca vence (permanente). Uma data = vence naquele
-- instante. As duas coisas cabem numa coluna só, e grupos_has_access() lê as
-- duas com o mesmo OR.
--
-- user_id é a PK, não uma coluna comum com índice: uma pessoa tem no máximo um
-- acesso, e é a PK que garante isso. É também o alvo do ON CONFLICT da RPC de
-- concessão e o índice de leitura (`WHERE user_id = auth.uid()`). Não crio
-- índice extra em expires_at — com centenas de linhas seria só custo de
-- escrita; se um dia houver relatório de "quem vence essa semana", cria lá.

CREATE TABLE IF NOT EXISTS public.grupos_access (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),

  -- ON DELETE SET NULL é um desvio deliberado do enunciado, que pedia só
  -- `REFERENCES auth.users(id)`. Sem cláusula, o padrão é NO ACTION: apagar a
  -- conta de um admin passaria a ser BLOQUEADO enquanto existisse uma única
  -- concessão feita por ele — um erro de FK confuso, meses depois, longe da
  -- causa. SET NULL preserva a linha de acesso do usuário (que é o que vale
  -- dinheiro) e perde só a autoria. A coluna já era anulável, então nada mais
  -- muda de forma.
  granted_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  expires_at timestamptz,
  note       text
);

COMMENT ON TABLE public.grupos_access IS
  'Acesso ao add-on pago Grupos de Divulgacao. A EXISTENCIA da linha e o acesso. Escrita SO via admin_grant_grupos_access / admin_revoke_grupos_access — authenticated e anon nao tem INSERT/UPDATE/DELETE aqui. Nao ha webhook: a liberacao e manual, feita por um admin depois do pagamento.';
COMMENT ON COLUMN public.grupos_access.user_id IS
  'Dono do acesso. PK: uma pessoa, no maximo um acesso. Alvo do ON CONFLICT da RPC de concessao.';
COMMENT ON COLUMN public.grupos_access.granted_at IS
  'Momento da ultima concessao ou renovacao. Historico, nao regra — quem decide acesso e expires_at.';
COMMENT ON COLUMN public.grupos_access.granted_by IS
  'Admin que liberou (auth.uid() no momento da chamada). Nunca vem do client. Vira NULL se a conta do admin for apagada.';
COMMENT ON COLUMN public.grupos_access.expires_at IS
  'NULL = permanente, nunca vence. Data = vence nela. Nao existe coluna booleana de ativo: a linha e o acesso e expires_at e o prazo.';
COMMENT ON COLUMN public.grupos_access.note IS
  'Anotacao livre do admin (ex.: id do pagamento, cortesia, trocou de e-mail). So operacional — nenhuma regra le isto.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RLS + GRANTs — A TRAVA DE ESCRITA
-- ═══════════════════════════════════════════════════════════════════════════
-- Esta é a seção que, se falhar em silêncio, não quebra nada visível: a página
-- continua funcionando e o add-on fica de graça para quem sabe abrir o
-- DevTools. Por isso a seção 5 confere tudo de novo, na mesma transação.
--
-- Um detalhe do Supabase que torna o REVOKE OBRIGATÓRIO, não zeloso: a default
-- ACL deste projeto (pg_default_acl, conferida em 14/09/2026) dá `arwdDxtm` —
-- ou seja, TUDO — a `authenticated` em toda tabela nova criada por `postgres`,
-- que é justamente o dono que o `supabase db push` usa. Sem as duas linhas de
-- REVOKE abaixo, esta tabela nasceria gravável pelo client e o portão nasceria
-- aberto.
--
-- REVOKE ALL (em vez da lista INSERT/UPDATE/DELETE/TRUNCATE do enunciado)
-- cobre também REFERENCES, TRIGGER e MAINTAIN, que o mesmo `GRANT ALL` da
-- default ACL entrega. O GRANT SELECT logo em seguida devolve a única coisa
-- que o client precisa. Um POST/PATCH/DELETE vindo do PostgREST morre em
-- "permission denied for table grupos_access" — falha barulhenta, não
-- "0 rows" silencioso.

ALTER TABLE public.grupos_access ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.grupos_access FROM anon;
REVOKE ALL ON TABLE public.grupos_access FROM authenticated;
GRANT  SELECT ON TABLE public.grupos_access TO authenticated;
GRANT  ALL    ON TABLE public.grupos_access TO service_role;

-- UMA policy, de SELECT, do dono da linha. Nenhuma de INSERT, UPDATE ou
-- DELETE — a ausência é a decisão, não um esquecimento, e a seção 5 falha o
-- push se alguém adicionar uma.
--
-- O admin NÃO ganha policy de leitura ampla aqui de propósito: ele não lê esta
-- tabela pelo PostgREST, ele age pelas duas RPCs da seção 4, que são
-- SECURITY DEFINER e enxergam tudo. Menos superfície, mesma capacidade.
DROP POLICY IF EXISTS "Users read own grupos access" ON public.grupos_access;
CREATE POLICY "Users read own grupos access"
  ON public.grupos_access FOR SELECT TO authenticated
  USING (auth.uid() = grupos_access.user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RPC grupos_has_access() — A LEITURA QUE A PÁGINA VAI USAR
-- ═══════════════════════════════════════════════════════════════════════════
-- Responde uma pergunta só: "eu, o chamador, tenho acesso agora?".
--
-- NUNCA levanta erro para quem não tem linha. É EXISTS, não SELECT INTO
-- STRICT: conta recém-criada recebe `false`, que é a resposta certa, e não uma
-- exceção que a página teria que tratar como se fosse falha de rede. Esse é o
-- caminho de 100% dos usuários hoje, então é o caminho que não pode ter
-- surpresa.
--
-- Sem parâmetro de usuário, de propósito. Se recebesse `p_user_id`, o client
-- poderia perguntar pelo acesso de outra pessoa — e, pior, a próxima pessoa a
-- mexer acabaria usando o parâmetro como se fosse a identidade. Quem chama é
-- auth.uid(), ponto. (Se um dia o admin precisar consultar o acesso de
-- terceiro, isso é uma RPC nova, com has_role dentro.)
--
-- SECURITY DEFINER porque a função precisa enxergar a linha sem depender da
-- RLS de quem chamou — e o filtro `user_id = auth.uid()` dentro dela é o que
-- mantém a resposta restrita ao próprio chamador.

CREATE OR REPLACE FUNCTION public.grupos_has_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.grupos_access ga
     WHERE ga.user_id = auth.uid()
       AND (ga.expires_at IS NULL OR ga.expires_at > now())
  );
$$;

COMMENT ON FUNCTION public.grupos_has_access() IS
  'true quando o chamador tem acesso vigente aos Grupos de Divulgacao (linha em grupos_access com expires_at NULL ou no futuro). Nunca levanta erro: sem linha devolve false.';

-- auth.uid() é NULL sem JWT, e `ga.user_id = NULL` não casa com nada, então a
-- função devolveria false mesmo sem o REVOKE. O REVOKE é para anon nem
-- conseguir chamar: a existência da rota já é informação.
REVOKE EXECUTE ON FUNCTION public.grupos_has_access() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.grupos_has_access() TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RPCs DE ADMIN — CONCEDER E RETIRAR
-- ═══════════════════════════════════════════════════════════════════════════
-- São a ÚNICA porta de escrita de grupos_access que existe para quem entra
-- pelo PostgREST (a seção 2 tirou os verbos de todo mundo).
--
-- A CHECAGEM DE ADMIN LÊ public.user_roles, via public.has_role(). Não lê
-- lista de e-mail, não aceita "sou admin" vindo do client, não confia em
-- nenhum parâmetro. `has_role` é SECURITY DEFINER e STABLE desde
-- 20260521044257 e é a mesma fonte que as policies de admin do resto do banco
-- usam. Repetir aqui a lista de e-mails do state.tsx seria estender para
-- dentro do banco o bug crítico que o CLAUDE.md §11 item 1 já registra.
--
-- `presentation_admin` NÃO passa. O enum app_role tem os três valores
-- ('admin', 'user', 'presentation_admin') e a checagem exige exatamente
-- 'admin': o modo de apresentação existe para demonstrar o produto, não para
-- distribuir um add-on pago.

CREATE OR REPLACE FUNCTION public.admin_grant_grupos_access(
  p_user_id uuid,
  p_days    int  DEFAULT 30,
  p_note    text DEFAULT NULL
)
RETURNS public.grupos_access
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- Convenção obrigatória ao mexer aqui: variável local com prefixo `_`,
-- parâmetro com prefixo `p_`. Nenhuma coluna do schema usa esses prefixos, e é
-- isso que mantém o alvo de `ON CONFLICT (user_id)` — que é lido como
-- expressão de índice e NÃO aceita qualificação — livre de ambiguidade.
DECLARE
  _admin       uuid;
  _cur_expires timestamptz;
  _had_row     boolean;
  _permanente  boolean;
  _new_expires timestamptz;
  _row         public.grupos_access;
BEGIN
  -- ── Passo 1: quem está chamando, e é admin de verdade? ──────────────────
  _admin := auth.uid();
  IF _admin IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF NOT public.has_role(_admin, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  -- Mensagem propositalmente igual nos dois casos: quem não é admin não
  -- precisa saber se falhou por não estar logado ou por não ter o papel.

  -- ── Passo 2: o alvo e o prazo fazem sentido? ────────────────────────────
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não informado';
  END IF;

  PERFORM 1 FROM auth.users u WHERE u.id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário inexistente: %', p_user_id;
  END IF;
  -- Sem esta verificação a FK barraria do mesmo jeito, mas com uma mensagem de
  -- constraint que não diz nada para quem está na tela do admin.

  IF p_days IS NOT NULL AND p_days <= 0 THEN
    RAISE EXCEPTION 'p_days precisa ser positivo, ou NULL para acesso permanente. Para tirar acesso, use admin_revoke_grupos_access.';
  END IF;

  -- 3650 dias = 10 anos. Não é regra de negócio, é rede contra dedo gordo:
  -- quem quer permanente passa NULL, que é explícito. Um "30000" digitado por
  -- engano viraria acesso vitalício disfarçado de prazo.
  IF p_days IS NOT NULL AND p_days > 3650 THEN
    RAISE EXCEPTION 'p_days acima de 3650 (10 anos). Para acesso permanente, passe NULL.';
  END IF;

  -- ── Passo 3: serializa ANTES de ler ─────────────────────────────────────
  -- Sem o lock, duas abas do admin leem o mesmo expires_at antigo, as duas
  -- calculam a mesma data nova e uma sobrescreve a outra — o cliente pagaria
  -- dois meses e receberia um. O ON CONFLICT resolveria o conflito de chave,
  -- não a perda de prazo. O lock é por usuário alvo: conceder para duas
  -- pessoas diferentes não espera.
  PERFORM pg_advisory_xact_lock(hashtext('grupos_access:' || p_user_id::text));

  -- ── Passo 4: a data nova ────────────────────────────────────────────────
  SELECT ga.expires_at INTO _cur_expires
    FROM public.grupos_access ga
   WHERE ga.user_id = p_user_id;
  _had_row    := FOUND;
  _permanente := _had_row AND _cur_expires IS NULL;

  IF p_days IS NULL OR _permanente THEN
    -- p_days NULL: o admin pediu permanente.
    -- _permanente: quem JÁ é permanente continua permanente. Acesso permanente
    -- é "vence no infinito", e a regra deste passo é estender a partir do MAIOR
    -- entre agora e o vencimento atual — o maior entre agora e o infinito é o
    -- infinito. Renovar por engano quem é permanente não pode REBAIXAR ninguém
    -- para 30 dias sem o admin pedir.
    --   ⚠️ Para transformar permanente em prazo: revogar e conceder de novo.
    _new_expires := NULL;
  ELSE
    -- Estende a partir do MAIOR entre agora e o vencimento atual. É isso que
    -- faz pagar adiantado não custar dias: quem renova faltando 12 dias termina
    -- com 42, não com 30. Vencimento já no passado (ou primeira concessão) cai
    -- em now(), então ninguém ganha crédito retroativo por ter ficado meses sem
    -- pagar.
    _new_expires := GREATEST(now(), COALESCE(_cur_expires, now()))
                    + make_interval(days => p_days);
  END IF;

  -- ── Passo 5: grava ──────────────────────────────────────────────────────
  -- note = COALESCE(EXCLUDED.note, ga.note): renovar sem passar nota PRESERVA
  -- a nota que já estava lá, em vez de apagá-la silenciosamente. Para limpar de
  -- propósito, passe string vazia.
  INSERT INTO public.grupos_access AS ga (user_id, granted_at, granted_by, expires_at, note)
  VALUES (p_user_id, now(), _admin, _new_expires, p_note)
  ON CONFLICT (user_id) DO UPDATE
     SET granted_at = now(),
         granted_by = _admin,
         expires_at = _new_expires,
         note       = COALESCE(EXCLUDED.note, ga.note)
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

COMMENT ON FUNCTION public.admin_grant_grupos_access(uuid, int, text) IS
  'Libera os Grupos de Divulgacao para p_user_id por p_days dias (NULL = permanente). So para quem tem papel admin em user_roles. Renovacao estende a partir do MAIOR entre agora e o vencimento atual — pagar adiantado nao custa dias. Quem ja e permanente continua permanente.';

REVOKE EXECUTE ON FUNCTION public.admin_grant_grupos_access(uuid, int, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_grant_grupos_access(uuid, int, text) TO authenticated;
-- authenticated recebe EXECUTE porque o admin TAMBÉM é `authenticated` — o
-- papel vem de uma linha em user_roles, não de um role do Postgres. Quem não é
-- admin consegue CHAMAR e leva 'Não autorizado' na primeira verificação do
-- corpo. A trava é o has_role de dentro, não o GRANT de fora.


CREATE OR REPLACE FUNCTION public.admin_revoke_grupos_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin   uuid;
  _deleted int;
BEGIN
  -- Mesma checagem, palavra por palavra, da função de conceder. Não é
  -- duplicação por descuido: tirar acesso é tão sensível quanto dar, e uma
  -- função "auxiliar" de checagem seria mais um lugar para alguém afrouxar sem
  -- perceber.
  _admin := auth.uid();
  IF _admin IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF NOT public.has_role(_admin, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não informado';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('grupos_access:' || p_user_id::text));

  DELETE FROM public.grupos_access ga WHERE ga.user_id = p_user_id;
  GET DIAGNOSTICS _deleted = ROW_COUNT;

  -- Apagar a linha É retirar o acesso — não existe UPDATE marcando inativo,
  -- porque não existe coluna de ativo (ver seção 1).
  --
  -- Devolve false, e não erro, quando não havia linha: revogar quem já não
  -- tinha acesso é um no-op, não uma falha. Clicar duas vezes no botão do admin
  -- não pode mostrar erro vermelho.
  RETURN _deleted > 0;
END;
$$;

COMMENT ON FUNCTION public.admin_revoke_grupos_access(uuid) IS
  'Retira o acesso aos Grupos de Divulgacao apagando a linha de grupos_access. So para quem tem papel admin em user_roles. Devolve true se havia acesso, false se nao havia (no-op, nao erro).';

REVOKE EXECUTE ON FUNCTION public.admin_revoke_grupos_access(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_revoke_grupos_access(uuid) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ASSERÇÃO — o arquivo confere as próprias travas
-- ═══════════════════════════════════════════════════════════════════════════
-- A seção 2 é a parte deste arquivo que falha em silêncio: se ela não valer, a
-- página continua funcionando e o add-on pago fica de graça. Um
-- `GRANT ALL ... TO authenticated` numa migration futura, ou uma default ACL
-- que volte a ser frouxa, passariam sem ninguém notar.
--
-- Então o arquivo verifica a si mesmo antes de commitar. Roda na MESMA
-- transação do resto: se uma asserção falhar, o `db push` aborta e NADA é
-- criado — melhor não ter o portão do que ter o portão aberto.

DO $$
DECLARE
  _priv   text;
  _admins int;
BEGIN
  -- anon: nada, em nenhum verbo.
  FOREACH _priv IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']
  LOOP
    IF has_table_privilege('anon', 'public.grupos_access', _priv) THEN
      RAISE EXCEPTION 'FALHA DE TRAVA: anon ainda tem % em grupos_access', _priv;
    END IF;
  END LOOP;

  -- authenticated: SELECT...
  IF NOT has_table_privilege('authenticated', 'public.grupos_access', 'SELECT') THEN
    RAISE EXCEPTION 'FALHA DE TRAVA: authenticated perdeu SELECT em grupos_access — a página não consegue saber se tem acesso';
  END IF;

  -- ...e mais nada. Este é o laço que impede o add-on de virar de graça.
  FOREACH _priv IN ARRAY ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']
  LOOP
    IF has_table_privilege('authenticated', 'public.grupos_access', _priv) THEN
      RAISE EXCEPTION
        'FALHA DE TRAVA: authenticated tem % em grupos_access — qualquer usuário libera o add-on pago com um POST direto no PostgREST', _priv;
    END IF;
  END LOOP;

  -- RLS ligada.
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
     WHERE c.oid = 'public.grupos_access'::regclass
       AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'FALHA DE TRAVA: RLS desligada em grupos_access';
  END IF;

  -- Nenhuma policy de escrita. A ausência é a proteção; se alguém adicionar
  -- uma, é aqui que aparece.
  IF EXISTS (
    SELECT 1 FROM pg_policies pol
     WHERE pol.schemaname = 'public'
       AND pol.tablename  = 'grupos_access'
       AND pol.cmd <> 'SELECT'
  ) THEN
    RAISE EXCEPTION 'FALHA DE TRAVA: grupos_access ganhou policy de escrita — toda escrita tem que passar pelas RPCs de admin';
  END IF;

  -- anon não executa nenhuma das três RPCs (o REVOKE ... FROM PUBLIC é o que
  -- garante isto, porque anon é membro de PUBLIC).
  IF has_function_privilege('anon', 'public.grupos_has_access()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.admin_grant_grupos_access(uuid,int,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.admin_revoke_grupos_access(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FALHA DE TRAVA: anon executa RPC dos grupos';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.grupos_has_access()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FALHA DE TRAVA: authenticated não executa grupos_has_access — a página não carrega';
  END IF;

  -- As três precisam ser SECURITY DEFINER com search_path fixo. Sem
  -- SECURITY DEFINER as funções de admin não conseguiriam escrever (a seção 2
  -- tirou os verbos de authenticated) e o portão simplesmente não funcionaria;
  -- sem search_path fixo, ficariam sujeitas a um schema plantado no caminho de
  -- busca de quem chama.
  IF EXISTS (
    SELECT 1 FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('grupos_has_access','admin_grant_grupos_access','admin_revoke_grupos_access')
      AND (NOT p.prosecdef
           OR p.proconfig IS NULL
           OR NOT ('search_path=public' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'FALHA DE TRAVA: alguma RPC dos grupos não é SECURITY DEFINER com search_path=public';
  END IF;

  -- Informativo, NÃO é asserção: sem admin em user_roles ninguém consegue
  -- liberar o add-on para ninguém. Não aborto o push por isso — é estado de
  -- dado, não trava de segurança, e abortar aqui criaria um modo de falha novo
  -- num arquivo que só deveria falhar por privilégio.
  SELECT count(*) INTO _admins FROM public.user_roles WHERE role = 'admin';
  IF _admins = 0 THEN
    RAISE WARNING 'ATENÇÃO: public.user_roles não tem NENHUMA linha admin — admin_grant_grupos_access vai recusar todo mundo e o add-on fica impossível de liberar.';
  ELSE
    RAISE NOTICE 'Grupos de Divulgação: % admin(s) em user_roles podem liberar acesso.', _admins;
  END IF;

  RAISE NOTICE 'Grupos de Divulgação: travas conferidas — anon sem nada, authenticated só SELECT, escrita só via RPC de admin.';
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- PRÓXIMOS PASSOS — o que fica pendente depois deste arquivo
-- ═══════════════════════════════════════════════════════════════════════════
--
-- • src/routes/dashboard.grupos.tsx continua liberado para todo mundo. Nada
--   nesta migration é lido por ninguém ainda. A página precisa chamar
--   grupos_has_access() e, quando vier false, mostrar UM grupo de demonstração
--   mais o passo a passo guiado — sem redirect e sem bloquear a rota.
--
-- • src/integrations/supabase/types.ts NÃO foi regenerado — a tabela e as três
--   RPCs ainda não existem para o TypeScript. Regenerar à mão antes de escrever
--   a página.
--
-- • Não existe tela de admin para conceder. Hoje a liberação é
--   `select admin_grant_grupos_access('<uuid>', 30, 'pagamento X');` rodado
--   como admin. Uma tela em /dashboard/validar-cadastros seria o lugar natural,
--   e ela deve chamar a RPC — nunca escrever na tabela.
--
-- • NÃO há webhook, e não deve haver: a provedora não chama ninguém. Se um dia
--   passar a chamar, o consumidor novo tem que usar a mesma RPC (ou a service
--   key), nunca abrir INSERT para authenticated — isso desfaria a seção 2.
--
-- • O acesso vencido NÃO apaga a linha sozinho: grupos_has_access() já devolve
--   false por causa do expires_at, e manter a linha preserva o histórico de
--   quem já foi cliente. Se um dia incomodar, é uma limpeza agendada, não uma
--   regra dentro da leitura.
