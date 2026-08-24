-- ═══════════════════════════════════════════════════════════════════════════
-- /painel — banco do painel de demonstração + venda simulada pelo sininho
-- Migration: 20260823120000_painel_demo
-- ═══════════════════════════════════════════════════════════════════════════
--
-- O /painel é a dashboard usada AO VIVO em apresentação. Não é página de
-- usuário: é ADMIN-ONLY, sem acesso público e sem dado por usuário. Existe UM
-- conjunto global de números que o admin configura por data, e um sininho que
-- simula uma venda demo na tela.
--
-- Por isso NÃO há user_id em nenhuma das quatro tabelas. Não é "esqueceram" —
-- é o modelo: um dataset global, um dono. Se um dia o painel virar por-usuário,
-- isso é migration nova, não coluna solta aqui.
--
-- ESTES NÚMEROS NÃO SÃO DINHEIRO. Nenhuma linha aqui vira saldo, comissão de
-- verdade ou saque. É material de demonstração (Regra de Ouro §1 do CLAUDE.md:
-- todo fluxo financeiro do produto é visual). Estas tabelas são separadas de
-- sales_orders de propósito — sales_orders é a fonte única das vendas do
-- usuário e não pode ser contaminada por número de apresentação.
--
-- Ordem dentro do arquivo: tabelas → RLS/GRANTs → RPC. Tudo em UMA transação:
-- ou o painel inteiro existe, ou nada existe. Não dá para ficar com tabela sem
-- policy no meio do caminho.
--
-- Timestamp escolhido de propósito depois de 20260817140000
-- (user_affiliate_products), que é a última migration da série — assim um
-- `supabase db push` limpo aceita este arquivo sem reclamar de ordem.
--
-- Este arquivo é SÓ SQL. A rota /painel e o client ainda não chamam nada
-- disto; ver "PRÓXIMOS PASSOS" no fim.


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. public.panel_daily_records — as métricas dos cards, uma linha por data
-- ═══════════════════════════════════════════════════════════════════════════
-- record_date é a PRIMARY KEY inteira. Não existe (user_id, date) porque não
-- existe usuário aqui: uma data = uma linha = o que o painel mostra naquele
-- dia para quem quer que esteja olhando a tela projetada.
--
-- Os sete números aceitam ZERO — é requisito explícito (§3 dos requisitos:
-- "Cada valor deve aceitar zero"). O DEFAULT 0 em todos existe para que o
-- admin possa criar a data e preencher só o que interessa na demonstração.
--
-- O que NÃO pode é negativo. Comissão de -R$ 40 na tela em apresentação ao
-- vivo é pior do que o painel não abrir. O CHECK abaixo é a rede: um bug de
-- sinal no editor, ou um cenário de sininho mal configurado somando negativo,
-- estoura no banco antes de virar pixel.

CREATE TABLE IF NOT EXISTS public.panel_daily_records (
  record_date          date        NOT NULL,
  clicks               integer     NOT NULL DEFAULT 0,
  orders               integer     NOT NULL DEFAULT 0,
  estimated_commission numeric     NOT NULL DEFAULT 0,
  items_sold           integer     NOT NULL DEFAULT 0,
  order_value          numeric     NOT NULL DEFAULT 0,
  new_buyers           integer     NOT NULL DEFAULT 0,
  social_clicks        integer     NOT NULL DEFAULT 0,

  -- Porcentagens manuais dos cards. NULL = automático (calcular a variação a
  -- partir da data anterior, §4 dos requisitos). Um objeto {"clicks": -92.86}
  -- sobrescreve só o card citado; card ausente do objeto continua automático.
  -- Fica em jsonb e não em sete colunas pct_* porque "existe override?" é uma
  -- pergunta por card, e chave ausente responde isso melhor do que NULL em
  -- coluna dedicada — além de não exigir migration nova quando o painel ganhar
  -- um oitavo card.
  pct_overrides        jsonb,

  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT panel_daily_records_pkey PRIMARY KEY (record_date),

  -- Um CHECK só, nomeado, cobrindo os sete. Nomeado porque é ele que vai
  -- aparecer no erro do PostgREST quando alguém tentar salvar negativo — e
  -- "panel_daily_records_non_negative" diz o que aconteceu.
  CONSTRAINT panel_daily_records_non_negative CHECK (
    clicks               >= 0 AND
    orders               >= 0 AND
    estimated_commission >= 0 AND
    items_sold           >= 0 AND
    order_value          >= 0 AND
    new_buyers           >= 0 AND
    social_clicks        >= 0
  ),

  -- pct_overrides tem que ser objeto ou NULL. Um array ou um número solto ali
  -- passaria pelo tipo jsonb e só quebraria no client, na hora de ler a chave.
  CONSTRAINT panel_daily_records_pct_overrides_is_object CHECK (
    pct_overrides IS NULL OR jsonb_typeof(pct_overrides) = 'object'
  )
);

COMMENT ON TABLE public.panel_daily_records IS
  'Métricas demo do /painel, uma linha por data, GLOBAL (sem user_id). Não é registro financeiro — nenhum valor daqui vira saldo ou saque.';
COMMENT ON COLUMN public.panel_daily_records.estimated_commission IS
  'Comissão estimada do dia em reais. numeric sem escala fixa de propósito: a soma do sininho é exata em numeric, ao contrário de float.';
COMMENT ON COLUMN public.panel_daily_records.pct_overrides IS
  'Porcentagens manuais por card, ex.: {"clicks": -92.86}. NULL (ou chave ausente) = calcular automaticamente a partir da data anterior. panel_apply_demo_sale NUNCA escreve aqui.';
COMMENT ON COLUMN public.panel_daily_records.updated_by IS
  'Admin que gravou por último. ON DELETE SET NULL porque o registro é do painel, não da pessoa: apagar o admin não pode apagar a data da apresentação.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. public.panel_product_stats — o Top 5 de cada data
-- ═══════════════════════════════════════════════════════════════════════════
-- Guardo `product_n` (integer) e MAIS NADA sobre o produto. Nome, imagem,
-- preço e URL vivem em src/lib/mock/affiliate-products.ts e não podem ser
-- duplicados aqui (§6 e §10 dos requisitos). Duplicar significaria dois nomes
-- para o mesmo produto no dia em que o catálogo for regerado — e o painel
-- mostraria o nome velho na tela, ao vivo. O client resolve n → produto.
-- Mesma decisão, mesmo motivo, de user_affiliate_products.
--
-- A comissão estimada do produto é `items_sold × commission_per_sale`,
-- CALCULADA NA LEITURA. Não existe coluna para ela: coluna somada seria um
-- terceiro número podendo divergir dos dois que a geraram, e divergência entre
-- card e linha é exatamente o que §11 dos requisitos proíbe.
--
-- Sobre FK para panel_daily_records: NÃO existe, de propósito. O editor do
-- admin precisa poder mexer nos produtos de uma data antes de a linha diária
-- existir, e §5 dos requisitos manda a tela abrir zerada em data sem registro
-- em vez de quebrar. panel_apply_demo_sale grava a linha diária ANTES da linha
-- de produto, então pelo caminho do sininho as duas sempre nascem juntas.

CREATE TABLE IF NOT EXISTS public.panel_product_stats (
  record_date         date    NOT NULL,
  product_n           integer NOT NULL,
  items_sold          integer NOT NULL DEFAULT 0,
  commission_per_sale numeric NOT NULL DEFAULT 0,

  CONSTRAINT panel_product_stats_pkey PRIMARY KEY (record_date, product_n),

  CONSTRAINT panel_product_stats_non_negative CHECK (
    items_sold >= 0 AND commission_per_sale >= 0
  ),

  -- O catálogo tem 250 produtos hoje e vai crescer, então o teto é folgado de
  -- propósito: 1000 não é "o tamanho do catálogo", é a linha onde um valor
  -- deixa de ser produto novo e passa a ser bug (n negativo, 0, índice de
  -- array vazando, parse errado no client). Mesmo intervalo de
  -- user_affiliate_products, para os dois lugares falharem igual.
  CONSTRAINT panel_product_stats_product_n_range
    CHECK (product_n BETWEEN 1 AND 1000)
);

-- ── Sobre o índice de record_date ──────────────────────────────────────────
-- A PRIMARY KEY já cria o btree em (record_date, product_n). Como record_date
-- é a PRIMEIRA coluna, ele sozinho já atende a única consulta que o painel faz:
--     SELECT ... FROM panel_product_stats WHERE record_date = $1
-- Um CREATE INDEX (record_date) separado seria um segundo btree no mesmo
-- prefixo: custo em toda escrita, nenhum plano novo em troca. Mesma decisão de
-- user_affiliate_products e class_bookings.

COMMENT ON TABLE public.panel_product_stats IS
  'Estatísticas demo por produto e data, alimentam o Top 5 do /painel. Sem user_id — o dataset é global.';
COMMENT ON COLUMN public.panel_product_stats.product_n IS
  'O campo `n` de AffiliateProduct em src/lib/mock/affiliate-products.ts. Identificador do catálogo, não FK — o catálogo vive no bundle, não no banco. Nome/imagem/URL NÃO são copiados para cá.';
COMMENT ON COLUMN public.panel_product_stats.commission_per_sale IS
  'Comissão demo POR UNIDADE. A comissão estimada total é items_sold × commission_per_sale, calculada na leitura — não existe coluna para ela.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. public.panel_sale_scenarios — o que cada clique no sininho faz
-- ═══════════════════════════════════════════════════════════════════════════
-- Cada linha é uma venda demo pré-configurada. O sininho não inventa nada em
-- tempo de clique: ele executa um cenário que o admin escreveu antes.
--
-- `position` dá a ordem da rotação (§11: "percorrê-los de maneira
-- determinística... não usar aleatoriedade"). NÃO é UNIQUE de propósito:
-- reordenar cenários com posição única exige a dança de valores temporários
-- para não colidir no meio do UPDATE, e isso quebraria a tela de edição por um
-- ganho nenhum. O desempate é o `id`, e a RPC ordena sempre por
-- (position, id) — determinístico mesmo com posições repetidas.
--
-- Todos os incrementos aceitam zero e nenhum aceita negativo. O motivo é o
-- CHECK da tabela diária: um clicks_add = -50 passaria daqui e só estouraria
-- lá, no meio da apresentação, abortando a venda inteira. Melhor recusar o
-- cenário na hora em que o admin o salva, com a tela de edição aberta.

CREATE TABLE IF NOT EXISTS public.panel_sale_scenarios (
  id                  bigserial   NOT NULL,
  position            integer     NOT NULL,
  product_n           integer     NOT NULL,
  clicks_add          integer     NOT NULL DEFAULT 0,
  quantity            integer     NOT NULL DEFAULT 1,
  commission_per_unit numeric     NOT NULL DEFAULT 0,
  new_buyers_add      integer     NOT NULL DEFAULT 0,
  social_clicks_add   integer     NOT NULL DEFAULT 0,
  unit_order_value    numeric     NOT NULL DEFAULT 0,
  active              boolean     NOT NULL DEFAULT true,

  CONSTRAINT panel_sale_scenarios_pkey PRIMARY KEY (id),

  CONSTRAINT panel_sale_scenarios_non_negative CHECK (
    position            >= 0 AND
    clicks_add          >= 0 AND
    quantity            >= 0 AND
    commission_per_unit >= 0 AND
    new_buyers_add      >= 0 AND
    social_clicks_add   >= 0 AND
    unit_order_value    >= 0
  ),

  CONSTRAINT panel_sale_scenarios_product_n_range
    CHECK (product_n BETWEEN 1 AND 1000)
);

-- A RPC lê só os ativos e ordena por (position, id) — este índice parcial é
-- exatamente essa consulta. Parcial porque cenário desativado nunca entra na
-- rotação e não precisa ocupar o índice.
CREATE INDEX IF NOT EXISTS panel_sale_scenarios_rotation_idx
  ON public.panel_sale_scenarios (position, id)
  WHERE active;

COMMENT ON TABLE public.panel_sale_scenarios IS
  'Cenários de venda demo do sininho do /painel. Um clique autorizado executa UM cenário; a rotação por (position, id) é determinística, nunca aleatória.';
COMMENT ON COLUMN public.panel_sale_scenarios.position IS
  'Ordem da rotação. Não é UNIQUE de propósito — reordenar ficaria trabalhoso sem ganho; o desempate é o id e a RPC ordena por (position, id).';
COMMENT ON COLUMN public.panel_sale_scenarios.active IS
  'Cenário desativado sai da rotação sem perder a configuração. Zero cenários ativos NÃO é erro: o sininho apenas orienta a configurar.';
COMMENT ON COLUMN public.panel_sale_scenarios.unit_order_value IS
  'Valor unitário do pedido em reais. O valor somado ao dia é quantity × unit_order_value.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. public.panel_sale_events — trava de idempotência E cursor da rotação
-- ═══════════════════════════════════════════════════════════════════════════
-- Esta tabela faz duas coisas ao mesmo tempo, e as duas importam:
--
--   (a) IDEMPOTÊNCIA. idempotency_key é a PRIMARY KEY. Clique duplo, retry de
--       rede, dedo nervoso na apresentação — a mesma chave nunca aplica duas
--       vendas. A unicidade é imposta pelo índice da PK, não por lógica no
--       client, porque o client é justamente quem pode disparar duas vezes.
--
--   (b) CURSOR DA ROTAÇÃO. A quantidade de eventos da data É a posição atual
--       do rodízio. Não existe coluna "próximo cenário" em lugar nenhum —
--       estado separado do log daria para dessincronizar; contagem derivada do
--       próprio log, não.
--
-- Consequência prática, e ela é séria: APAGAR LINHA DAQUI ANDA O RODÍZIO PARA
-- TRÁS e libera a chave apagada para aplicar de novo. Limpar a data em vez de
-- zerar os números é o jeito de reiniciar a demonstração — mas é uma escolha,
-- não faxina.
--
-- scenario_id NÃO tem FK para panel_sale_scenarios de propósito: apagar um
-- cenário não pode reescrever histórico. Com ON DELETE CASCADE a contagem da
-- data mudaria sozinha e o rodízio pularia; com RESTRICT o admin ficaria preso
-- a cenários velhos. O log guarda qual cenário rodou, mesmo que ele não exista
-- mais.

CREATE TABLE IF NOT EXISTS public.panel_sale_events (
  idempotency_key uuid        NOT NULL,
  record_date     date        NOT NULL,
  scenario_id     bigint      NOT NULL,
  applied_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT panel_sale_events_pkey PRIMARY KEY (idempotency_key)
);

-- Este índice, ao contrário dos outros, é NECESSÁRIO: a PK é por
-- idempotency_key, e a consulta mais quente da RPC é
--     SELECT count(*) FROM panel_sale_events WHERE record_date = $1
-- que é o cursor da rotação, avaliado em todo clique do sininho.
CREATE INDEX IF NOT EXISTS panel_sale_events_record_date_idx
  ON public.panel_sale_events (record_date);

COMMENT ON TABLE public.panel_sale_events IS
  'Log de vendas demo aplicadas pelo sininho. É a trava de idempotência E o cursor da rotação: count(*) da data define o próximo cenário. Apagar linha daqui anda o rodízio para trás.';
COMMENT ON COLUMN public.panel_sale_events.idempotency_key IS
  'Chave gerada pelo client, uma por clique autorizado. PRIMARY KEY: a segunda chamada com a mesma chave devolve o estado atual sem aplicar nada.';
COMMENT ON COLUMN public.panel_sale_events.scenario_id IS
  'Qual cenário rodou. Sem FK de propósito — apagar um cenário não pode reescrever o histórico nem mover o cursor da rotação.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RLS + GRANTs — ADMIN E SÓ ADMIN, nas quatro tabelas
-- ═══════════════════════════════════════════════════════════════════════════
-- Duas camadas, como no resto do projeto:
--   • GRANT decide se o papel tem o privilégio (erro duro de permissão);
--   • POLICY decide quais linhas ele enxerga (0 linhas, sem erro).
--
-- Aqui as duas apontam para o mesmo lugar: ninguém além de admin. O /painel
-- não é rota de usuário — não existe "visitante vê os números e o admin vê os
-- controles". Usuário comum autenticado não lê UMA linha destas tabelas.
--
-- A verificação é public.has_role(auth.uid(), 'admin'), que consulta
-- user_roles — a fonte CORRETA de papel. NÃO é a lista de e-mails do client
-- (isAdminEmail em state.tsx:849), que é problema aberto no §6/§11 do
-- CLAUDE.md e não vale como permissão de banco.

ALTER TABLE public.panel_daily_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_product_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_sale_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_sale_events    ENABLE ROW LEVEL SECURITY;

-- REVOKE ALL, e o `authenticated` está nesta lista DE PROPÓSITO — não é
-- excesso de zelo, é a correção de um buraco real:
--
--   • anon não pode ter absolutamente nada. Esta é a trava contra leitura
--     anônima: mesmo que uma policy larga demais apareça um dia, sem GRANT o
--     PostgREST responde "permission denied", não linhas.
--
--   • authenticated PRECISA ser zerado antes porque o Supabase roda
--     `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO
--     anon, authenticated, service_role`. Toda tabela nova no schema public
--     JÁ NASCE com ALL para authenticated — e ALL inclui TRUNCATE, que NÃO
--     passa por RLS. Sem este REVOKE, um usuário comum logado (nenhuma linha
--     em user_roles, zero linhas visíveis nas quatro tabelas) ainda assim
--     conseguiria `TRUNCATE public.panel_daily_records` e apagar os dados da
--     apresentação. Verificado: sem o REVOKE o TRUNCATE passa; com ele, não.
--     Some junto o TRIGGER, que deixaria pendurar trigger em tabela alheia.
--
-- O GRANT logo abaixo devolve exatamente as quatro operações que as policies
-- filtram, e nada além delas.
REVOKE ALL ON TABLE public.panel_daily_records  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.panel_product_stats  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.panel_sale_scenarios FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.panel_sale_events    FROM PUBLIC, anon, authenticated;

-- authenticated recebe o privilégio no nível de GRANT; quem filtra por papel
-- são as policies abaixo. Um usuário comum logado chega até a policy e leva
-- zero linha — que é o comportamento certo para leitura.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.panel_daily_records  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.panel_product_stats  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.panel_sale_scenarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.panel_sale_events    TO authenticated;

GRANT ALL ON TABLE public.panel_daily_records  TO service_role;
GRANT ALL ON TABLE public.panel_product_stats  TO service_role;
GRANT ALL ON TABLE public.panel_sale_scenarios TO service_role;
GRANT ALL ON TABLE public.panel_sale_events    TO service_role;

-- panel_sale_scenarios.id é bigserial, ou seja, DEFAULT nextval() numa
-- sequence. GRANT INSERT na tabela NÃO dá direito de usar a sequence — sem
-- isto o INSERT do admin morre com "permission denied for sequence". O REVOKE
-- vem antes pelo mesmo motivo das tabelas: o ALTER DEFAULT PRIVILEGES do
-- Supabase também cobre SEQUENCES, então anon e authenticated já nascem com
-- ALL aqui (inclusive UPDATE, que é setval — dá para reposicionar a sequence).
REVOKE ALL ON SEQUENCE public.panel_sale_scenarios_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.panel_sale_scenarios_id_seq TO authenticated;
GRANT ALL   ON SEQUENCE public.panel_sale_scenarios_id_seq TO service_role;

-- ── Policies ───────────────────────────────────────────────────────────────
-- Uma por operação, por tabela, todas com a mesma condição. Escritas separadas
-- em vez de um FOR ALL porque é isto que vai ser auditado depois: dá para ler
-- a lista de policies e ver as quatro operações nomeadas, sem precisar lembrar
-- o que FOR ALL cobre.
--
-- Policies permissivas se somam com OR. NÃO existe nenhuma outra policy nestas
-- tabelas — nenhuma "usuário lê o próprio", nenhuma USING (true). Se alguém
-- adicionar uma depois, ela AMPLIA o acesso; não é ajuste cosmético.

DROP POLICY IF EXISTS "Admins read panel daily records"   ON public.panel_daily_records;
DROP POLICY IF EXISTS "Admins insert panel daily records" ON public.panel_daily_records;
DROP POLICY IF EXISTS "Admins update panel daily records" ON public.panel_daily_records;
DROP POLICY IF EXISTS "Admins delete panel daily records" ON public.panel_daily_records;

CREATE POLICY "Admins read panel daily records"
  ON public.panel_daily_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert panel daily records"
  ON public.panel_daily_records FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update panel daily records"
  ON public.panel_daily_records FOR UPDATE TO authenticated
  USING      (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete panel daily records"
  ON public.panel_daily_records FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));


DROP POLICY IF EXISTS "Admins read panel product stats"   ON public.panel_product_stats;
DROP POLICY IF EXISTS "Admins insert panel product stats" ON public.panel_product_stats;
DROP POLICY IF EXISTS "Admins update panel product stats" ON public.panel_product_stats;
DROP POLICY IF EXISTS "Admins delete panel product stats" ON public.panel_product_stats;

CREATE POLICY "Admins read panel product stats"
  ON public.panel_product_stats FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert panel product stats"
  ON public.panel_product_stats FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update panel product stats"
  ON public.panel_product_stats FOR UPDATE TO authenticated
  USING      (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete panel product stats"
  ON public.panel_product_stats FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));


DROP POLICY IF EXISTS "Admins read panel sale scenarios"   ON public.panel_sale_scenarios;
DROP POLICY IF EXISTS "Admins insert panel sale scenarios" ON public.panel_sale_scenarios;
DROP POLICY IF EXISTS "Admins update panel sale scenarios" ON public.panel_sale_scenarios;
DROP POLICY IF EXISTS "Admins delete panel sale scenarios" ON public.panel_sale_scenarios;

CREATE POLICY "Admins read panel sale scenarios"
  ON public.panel_sale_scenarios FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert panel sale scenarios"
  ON public.panel_sale_scenarios FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update panel sale scenarios"
  ON public.panel_sale_scenarios FOR UPDATE TO authenticated
  USING      (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete panel sale scenarios"
  ON public.panel_sale_scenarios FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));


DROP POLICY IF EXISTS "Admins read panel sale events"   ON public.panel_sale_events;
DROP POLICY IF EXISTS "Admins insert panel sale events" ON public.panel_sale_events;
DROP POLICY IF EXISTS "Admins update panel sale events" ON public.panel_sale_events;
DROP POLICY IF EXISTS "Admins delete panel sale events" ON public.panel_sale_events;

CREATE POLICY "Admins read panel sale events"
  ON public.panel_sale_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert panel sale events"
  ON public.panel_sale_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update panel sale events"
  ON public.panel_sale_events FOR UPDATE TO authenticated
  USING      (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete panel sale events"
  ON public.panel_sale_events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. RPC panel_apply_demo_sale — o clique no sininho
-- ═══════════════════════════════════════════════════════════════════════════
-- ESTA É A PEÇA CRÍTICA. Ela existe por um motivo só: as dez atualizações têm
-- que cair JUNTAS. Uma apresentação em que o número de pedidos sobe e a
-- comissão não sobe é pior do que não ter o sininho.
--
-- É por isso que isto é UMA função e não sete chamadas do client. Toda função
-- plpgsql roda dentro de uma transação: ou os três INSERTs commitam, ou nenhum
-- commita. Não existe estado intermediário visível. Se o client fizesse
-- "atualiza o dia" + "atualiza o produto" em duas requisições, a segunda podia
-- falhar sozinha e a tela ficaria mentindo até o próximo refresh.
--
-- SECURITY DEFINER: roda como dona das tabelas e NÃO passa pela RLS. Logo a
-- RLS não protege nada aqui dentro — a checagem de admin logo no início é a
-- proteção INTEIRA. Não remover, não afrouxar, não trocar por e-mail.
--
-- A venda afeta SOMENTE _record_date. Não existe now()::date, não existe
-- CURRENT_DATE, não existe fallback para hoje em lugar nenhum desta função:
-- o admin apresenta uma data selecionada na tela, e é nela que a venda entra.
-- (O fuso America/Sao_Paulo é problema de quem escolhe a data no client; o
-- banco recebe a data já resolvida e não a reinterpreta.)
--
-- Retorno: jsonb, sempre com a mesma forma, nos três desfechos.
--   status = 'applied'         → aplicou agora
--   status = 'already_applied' → chave repetida, nada foi aplicado
--   status = 'no_scenarios'    → não há cenário ativo, nada foi aplicado
-- A UI repinta a partir desta resposta, sem refetch (§11 dos requisitos:
-- "atualizar a tela imediatamente"). Por isso vem o dia inteiro E o Top 5
-- inteiro já ordenado — o Top 5 REORDENA quando um produto passa o outro,
-- então devolver só o produto afetado não bastaria para repintar a tabela.

CREATE OR REPLACE FUNCTION public.panel_apply_demo_sale(
  _record_date     date,
  _idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid           uuid;
  _status        text;
  _scenario_id   bigint  := NULL;
  _product_n     integer := NULL;
  _quantity      integer := NULL;
  _active_count  integer;
  _applied_count integer;
  _scenario      public.panel_sale_scenarios%rowtype;
  _daily         public.panel_daily_records%rowtype;
  _existing      public.panel_sale_events%rowtype;
  _products      jsonb;
BEGIN
  -- ── Autorização ─────────────────────────────────────────────────────────
  _uid := auth.uid();
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF _record_date IS NULL THEN
    RAISE EXCEPTION 'Data não informada';
  END IF;

  -- Sem chave não há idempotência, e sem idempotência o clique duplo vende
  -- duas vezes. Recusar é melhor do que aplicar uma venda insegura.
  IF _idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Chave de idempotência não informada';
  END IF;

  -- ── Lock ANTES de qualquer leitura ──────────────────────────────────────
  -- Serializa por DATA. Duas abas clicando no sininho ao mesmo tempo não podem
  -- ler os mesmos totais antigos e as duas escreverem por cima — uma venda
  -- sumiria. O lock é de transação: some sozinho no commit ou no rollback, não
  -- há caminho que o deixe preso.
  --
  -- Forma de dois inteiros para ter NAMESPACE próprio: hashtext('panel_demo_sale')
  -- ocupa a primeira metade do espaço de lock, então isto nunca colide com o
  -- pg_advisory_xact_lock(hashtext(user_id)) de release_automatic_demo_sales.
  PERFORM pg_advisory_xact_lock(hashtext('panel_demo_sale'), hashtext(_record_date::text));

  -- ── 1) IDEMPOTÊNCIA PRIMEIRO ────────────────────────────────────────────
  -- Antes de olhar cenário, antes de somar qualquer coisa. Clique duplo, retry
  -- de rede ou dedo nervoso na apresentação devolvem o estado atual e não
  -- vendem de novo. Note que isto roda DEPOIS do lock: se a chamada gêmea
  -- ainda estiver no meio da transação, esta espera e enxerga o evento já
  -- commitado, em vez de passar direto pela verificação.
  SELECT * INTO _existing
    FROM public.panel_sale_events
   WHERE idempotency_key = _idempotency_key;

  IF FOUND THEN
    _status      := 'already_applied';
    _scenario_id := _existing.scenario_id;

  ELSE
    -- ── 2) Há cenário ativo? ──────────────────────────────────────────────
    SELECT count(*) INTO _active_count
      FROM public.panel_sale_scenarios
     WHERE active;

    IF _active_count = 0 THEN
      -- ── 3) Nenhum cenário: NÃO é erro ───────────────────────────────────
      -- Não levanta exceção de propósito. RAISE viraria toast vermelho de
      -- falha no meio da apresentação; o certo é o painel dizer "configure um
      -- cenário". Nada é alterado, nem o log de eventos — então o rodízio não
      -- anda e a chave continua livre para uso depois que houver cenário.
      _status := 'no_scenarios';

    ELSE
      -- ── Rodízio DETERMINÍSTICO ──────────────────────────────────────────
      -- A contagem de eventos da data é o cursor: 0 eventos → primeiro
      -- cenário, 1 evento → segundo, e assim por diante, voltando ao começo.
      -- Nada de random(): §11 dos requisitos exige que cliques repetidos
      -- percorram os produtos de forma previsível, e uma demonstração ao vivo
      -- não pode sortear qual produto aparece no Top 5.
      SELECT count(*) INTO _applied_count
        FROM public.panel_sale_events
       WHERE record_date = _record_date;

      -- ORDER BY (position, id): `position` dá a ordem que o admin quis, `id`
      -- desempata posições repetidas. Sem o `id` duas linhas com a mesma
      -- posição sairiam em ordem indefinida e o rodízio deixaria de ser
      -- determinístico. OFFSET/LIMIT em vez de row_number() para o resultado
      -- casar exatamente com o %rowtype.
      SELECT * INTO _scenario
        FROM public.panel_sale_scenarios
       WHERE active
       ORDER BY position, id
      OFFSET (_applied_count % _active_count)
       LIMIT 1;

      _scenario_id := _scenario.id;
      _product_n   := _scenario.product_n;
      _quantity    := _scenario.quantity;

      -- ── 5) A linha do dia ────────────────────────────────────────────────
      -- Upsert somando: a data pode não existir ainda (primeira venda de uma
      -- data nova) ou já ter números que o admin configurou à mão. Os dois
      -- casos são o mesmo INSERT ... ON CONFLICT.
      --
      -- pct_overrides NÃO aparece aqui, nem no INSERT nem no DO UPDATE, e isso
      -- é deliberado: porcentagem manual que o admin escreveu tem que
      -- sobreviver ao sininho. Card em modo automático (chave ausente)
      -- recalcula sozinho na leitura, porque os números que ele compara
      -- acabaram de mudar.
      INSERT INTO public.panel_daily_records AS d (
        record_date,
        clicks,
        orders,
        estimated_commission,
        items_sold,
        order_value,
        new_buyers,
        social_clicks,
        updated_at,
        updated_by
      ) VALUES (
        _record_date,
        _scenario.clicks_add,
        1,
        _scenario.quantity * _scenario.commission_per_unit,
        _scenario.quantity,
        _scenario.quantity * _scenario.unit_order_value,
        _scenario.new_buyers_add,
        _scenario.social_clicks_add,
        now(),
        _uid
      )
      ON CONFLICT (record_date) DO UPDATE SET
        clicks               = d.clicks               + EXCLUDED.clicks,
        orders               = d.orders               + EXCLUDED.orders,
        estimated_commission = d.estimated_commission + EXCLUDED.estimated_commission,
        items_sold           = d.items_sold           + EXCLUDED.items_sold,
        order_value          = d.order_value          + EXCLUDED.order_value,
        new_buyers           = d.new_buyers           + EXCLUDED.new_buyers,
        social_clicks        = d.social_clicks        + EXCLUDED.social_clicks,
        updated_at           = now(),
        updated_by           = EXCLUDED.updated_by
      RETURNING * INTO _daily;

      -- ── 6) A linha do produto ────────────────────────────────────────────
      -- MESMA quantidade que foi para items_sold do dia. É esta igualdade que
      -- impede o caso proibido por §11: "não pode acontecer de aumentar o
      -- pedido sem aumentar o produto". As duas escritas estão na mesma
      -- transação, então ou as duas valem ou nenhuma vale.
      --
      -- items_sold SOMA; commission_per_sale é ATRIBUÍDA, não somada — é
      -- comissão POR UNIDADE, não acumulada. Somar transformaria a segunda
      -- venda do mesmo produto em comissão dobrada por item.
      INSERT INTO public.panel_product_stats AS p (
        record_date,
        product_n,
        items_sold,
        commission_per_sale
      ) VALUES (
        _record_date,
        _scenario.product_n,
        _scenario.quantity,
        _scenario.commission_per_unit
      )
      ON CONFLICT (record_date, product_n) DO UPDATE SET
        items_sold          = p.items_sold + EXCLUDED.items_sold,
        commission_per_sale = EXCLUDED.commission_per_sale;

      -- ── 7) O evento ──────────────────────────────────────────────────────
      -- Por último: fecha a idempotência e anda o cursor do rodízio, os dois
      -- de uma vez.
      --
      -- A PK aqui é a rede para UM caso específico: a busca lá em cima é por
      -- chave, SEM filtrar data — então uma chave repetida em outra data já
      -- volta como 'already_applied' sem aplicar nada, e não chega neste
      -- INSERT. O que pode chegar é a corrida: o advisory lock é por DATA, logo
      -- duas chamadas com a mesma chave em datas DIFERENTES rodam em paralelo,
      -- as duas não acham o evento e as duas tentam inserir. A segunda estoura
      -- na PK e a transação inteira volta atrás — nada aplicado, nada pela
      -- metade. Contrato do client: uma chave nova por clique.
      INSERT INTO public.panel_sale_events (idempotency_key, record_date, scenario_id)
      VALUES (_idempotency_key, _record_date, _scenario.id);

      _status := 'applied';
    END IF;
  END IF;

  -- ── 8) Resposta ─────────────────────────────────────────────────────────
  -- Nos desfechos que não aplicaram nada, _daily continua vazio: lê a linha
  -- atual para a UI receber sempre a mesma forma de resposta.
  IF _daily.record_date IS NULL THEN
    SELECT * INTO _daily
      FROM public.panel_daily_records
     WHERE record_date = _record_date;
  END IF;

  -- Top 5 já ordenado pela regra de §6: mais itens primeiro, empate desempata
  -- pela maior comissão estimada, e product_n como terceiro critério para a
  -- ordem nunca depender da ordem física das linhas. Vem a data inteira, não
  -- só cinco — quem corta em cinco e completa com '--' é a tela.
  SELECT coalesce(
           jsonb_agg(
             jsonb_build_object(
               'product_n',            s.product_n,
               'items_sold',           s.items_sold,
               'commission_per_sale',  s.commission_per_sale,
               'estimated_commission', s.items_sold * s.commission_per_sale
             )
             ORDER BY s.items_sold DESC,
                      (s.items_sold * s.commission_per_sale) DESC,
                      s.product_n
           ),
           '[]'::jsonb
         )
    INTO _products
    FROM public.panel_product_stats s
   WHERE s.record_date = _record_date;

  RETURN jsonb_build_object(
    'status',      _status,
    'applied',     _status = 'applied',
    'record_date', _record_date,
    'scenario_id', _scenario_id,
    'product_n',   _product_n,
    'quantity',    _quantity,
    'message',
      CASE _status
        WHEN 'no_scenarios'
          THEN 'Configure um cenário de venda antes de usar o sininho.'
        WHEN 'already_applied'
          THEN 'Esta venda já havia sido aplicada.'
        ELSE NULL
      END,
    -- coalesce em todo número: data sem registro devolve zeros, e a tela abre
    -- zerada em vez de quebrar (§5 dos requisitos). Nunca null, nunca NaN.
    'daily', jsonb_build_object(
      'record_date',          _record_date,
      'clicks',               coalesce(_daily.clicks, 0),
      'orders',               coalesce(_daily.orders, 0),
      'estimated_commission', coalesce(_daily.estimated_commission, 0),
      'items_sold',           coalesce(_daily.items_sold, 0),
      'order_value',          coalesce(_daily.order_value, 0),
      'new_buyers',           coalesce(_daily.new_buyers, 0),
      'social_clicks',        coalesce(_daily.social_clicks, 0),
      -- pct_overrides fica NULL mesmo: null aqui SIGNIFICA "todos os cards em
      -- automático". Trocar por '{}' perderia essa distinção.
      'pct_overrides',        _daily.pct_overrides,
      'updated_at',           _daily.updated_at
    ),
    'products', _products
  );
END;
$$;

COMMENT ON FUNCTION public.panel_apply_demo_sale(date, uuid) IS
  'Aplica UMA venda demo do sininho do /painel, atomicamente, na data informada. Admin-only. Idempotente por _idempotency_key; rodízio determinístico por (position, id); sem cenário ativo devolve status no_scenarios sem alterar nada nem levantar erro.';

-- authenticated pode CHAMAR; quem não é admin leva 'Não autorizado' na
-- primeira linha do corpo. anon não chega nem a chamar.
REVOKE EXECUTE ON FUNCTION public.panel_apply_demo_sale(date, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.panel_apply_demo_sale(date, uuid) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- PRÓXIMOS PASSOS (fora deste arquivo)
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Criar a rota /painel. Ela é ADMIN-ONLY — o gate tem que ser o mesmo papel
--    de user_roles que as policies usam, não a lista de e-mails do client.
-- 2. Sininho → supabase.rpc('panel_apply_demo_sale', {
--       _record_date: '2026-08-22', _idempotency_key: crypto.randomUUID() }).
--    Gerar a chave UMA vez por clique e reusá-la no retry: chave nova em retry
--    aplica uma segunda venda, que é exatamente o que a idempotência evita.
--    Desabilitar o sininho enquanto a chamada estiver em voo (§11).
-- 3. Repintar a tela com o `daily` e o `products` da resposta, sem refetch.
--    Se status vier 'no_scenarios', mostrar `message` e NÃO mexer em número
--    nenhum. Se vier 'already_applied', repintar sem animação de contagem.
-- 4. Editor do admin escreve direto nas tabelas (a RLS já cobre). Ao gravar
--    panel_daily_records à mão, setar updated_at = now() e updated_by =
--    auth.uid() — não há trigger fazendo isso, de propósito: nada além do
--    editor e da RPC escreve nessa tabela.
-- 5. Porcentagens: chave ausente em pct_overrides = automático (comparar com a
--    data anterior). Ao calcular, tratar divisão por zero antes de renderizar —
--    §4 proíbe Infinity e NaN na tela.
-- 6. Top 5: cortar em cinco linhas e completar com '--'; coluna Ação continua
--    '--'. Resolver product_n → produto por src/lib/mock/affiliate-products.ts
--    (um Map por `n` evita varredura por item com 250 produtos).
-- 7. Regenerar src/integrations/supabase/types.ts depois do push.
