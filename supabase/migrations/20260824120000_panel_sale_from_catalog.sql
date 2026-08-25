-- ═══════════════════════════════════════════════════════════════════════════
-- /painel — o sininho passa a aplicar uma venda CALCULADA NO CLIENT
-- Migration: 20260824120000_panel_sale_from_catalog
-- ═══════════════════════════════════════════════════════════════════════════
--
-- POR QUE ISTO EXISTE
-- ───────────────────
-- O sininho agora escolhe o produto sozinho, do catálogo REAL
-- (src/lib/mock/affiliate-products.ts), com o preço e a comissão de verdade
-- daquele produto. Esse catálogo é TypeScript: vive no bundle, não no banco.
-- O Postgres não tem como lê-lo — nem deve, porque duplicar nome/preço/
-- comissão em tabela é exatamente o que 20260823120000 recusou a fazer (dois
-- nomes para o mesmo produto no dia em que o CSV for regerado, e o errado
-- aparecendo na tela projetada).
--
-- Então a divisão de trabalho muda: o CLIENT decide e calcula, o BANCO valida
-- e aplica atomicamente. A RPC deixa de consultar panel_sale_scenarios e passa
-- a receber os números prontos.
--
-- O QUE **NÃO** MUDA — e é por isso que a versão anterior foi escrita com
-- cuidado:
--   • SECURITY DEFINER + admin-only por public.has_role(auth.uid(),'admin');
--   • IDEMPOTÊNCIA PRIMEIRO: chave repetida devolve o estado e não aplica nada;
--   • pg_advisory_xact_lock na data ANTES de qualquer leitura;
--   • atomicidade: dia e produto sobem juntos ou nenhum sobe;
--   • a venda entra SOMENTE em _record_date, nunca em "hoje" implícito;
--   • a resposta traz o dia inteiro + o Top 5 inteiro, para a UI repintar de
--     uma resposta só.
--
-- O QUE MUDA
--   • sem cenário, sem rodízio — quem escolhe o produto é o client;
--   • validação de entrada dura: nada negativo, quantidade >= 1, product_n
--     dentro da faixa da tabela. Entrada ruim levanta erro em vez de gravar
--     bobagem;
--   • commission_per_sale vira MÉDIA PONDERADA acumulada (ver §3), para o
--     Top 5 continuar batendo com o card de comissão do dia mesmo quando o
--     mesmo produto vende mais de uma vez.
--
-- ESTES NÚMEROS CONTINUAM NÃO SENDO DINHEIRO (Regra de Ouro §1 do CLAUDE.md).


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. public.panel_sale_events — adapta a coluna que perdeu o dono
-- ═══════════════════════════════════════════════════════════════════════════
-- A tabela mantém o papel principal: LOG DE IDEMPOTÊNCIA. idempotency_key
-- continua sendo a PRIMARY KEY, e é ela que impede o clique duplo de vender
-- duas vezes.
--
-- O que a tabela DEIXA de ser é o cursor da rotação. Não há mais rotação:
-- count(*) da data não decide mais nada, é só quantas vendas o sininho aplicou
-- naquele dia. (O índice por record_date fica — a contagem continua útil, e
-- apagar índice de tabela em produção por estética não paga.)
--
-- ESCOLHA SOBRE scenario_id — a alternativa era DROP COLUMN, e não fiz:
-- apagar a coluna apagaria o histórico das vendas que JÁ rodaram por cenário
-- em produção, e migration que destrói dado não tem volta barata. Então:
--
--   • scenario_id fica, agora NULLABLE. Linha antiga preserva qual cenário
--     rodou; linha nova nasce NULL, porque cenário nenhum rodou;
--   • product_n NOVO, nullable pelo mesmo motivo — as linhas antigas não têm
--     como saber o produto sem consultar o cenário, e forçar NOT NULL exigiria
--     inventar valor para elas;
--   • um CHECK garante que toda linha identifica ALGUMA coisa: cenário (o
--     passado) ou produto (o presente). Nulo nos dois é linha sem sentido.
--
-- Nenhuma linha existente falha nesses CHECKs: todas têm scenario_id NOT NULL.

ALTER TABLE public.panel_sale_events
  ALTER COLUMN scenario_id DROP NOT NULL;

ALTER TABLE public.panel_sale_events
  ADD COLUMN IF NOT EXISTS product_n integer;

-- Mesma faixa da CHECK de panel_product_stats, e pelo mesmo motivo: 1000 não
-- é "o tamanho do catálogo", é a linha onde um valor deixa de ser produto novo
-- e vira bug (n negativo, zero, índice de array vazando, parse errado).
ALTER TABLE public.panel_sale_events
  DROP CONSTRAINT IF EXISTS panel_sale_events_product_n_range;
ALTER TABLE public.panel_sale_events
  ADD  CONSTRAINT panel_sale_events_product_n_range
  CHECK (product_n IS NULL OR product_n BETWEEN 1 AND 1000);

ALTER TABLE public.panel_sale_events
  DROP CONSTRAINT IF EXISTS panel_sale_events_identifies_sale;
ALTER TABLE public.panel_sale_events
  ADD  CONSTRAINT panel_sale_events_identifies_sale
  CHECK (scenario_id IS NOT NULL OR product_n IS NOT NULL);

COMMENT ON TABLE public.panel_sale_events IS
  'Log de vendas demo aplicadas pelo sininho do /painel. Papel único hoje: TRAVA DE IDEMPOTÊNCIA (idempotency_key é a PK). Não é mais cursor de rotação — o client escolhe o produto no catálogo. Apagar linha daqui libera a chave para aplicar de novo.';
COMMENT ON COLUMN public.panel_sale_events.scenario_id IS
  'DORMENTE. Qual cenário de panel_sale_scenarios rodou, nas vendas aplicadas antes de 20260824120000. Linha nova nasce NULL. Mantida em vez de removida para não apagar histórico; sem FK, de propósito — apagar um cenário não pode reescrever o log.';
COMMENT ON COLUMN public.panel_sale_events.product_n IS
  'O campo `n` de AffiliateProduct em src/lib/mock/affiliate-products.ts — qual produto o client vendeu neste clique. Nullable só por causa das linhas antigas (as por cenário); toda venda nova preenche.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. public.panel_sale_scenarios — DORMENTE, e fica de pé
-- ═══════════════════════════════════════════════════════════════════════════
-- Nada mais lê esta tabela. Não é motivo para DROP: mesmo tratamento que o
-- projeto dá ao Impulsionar (CLAUDE.md §1) — código morto e REVERSÍVEL. Se a
-- decisão de deixar o client escolher o produto for revertida, o rodízio volta
-- com os cenários que o admin já configurou, sem precisar reconstruir tabela,
-- índice, policy nem sequence.
--
-- As policies, os GRANTs e o índice parcial de rotação continuam como estão.
-- Uma tabela dormente com RLS admin-only não expõe nada.

COMMENT ON TABLE public.panel_sale_scenarios IS
  'DORMENTE desde 20260824120000. Cenários pré-configurados do sininho. Nenhuma RPC lê esta tabela hoje: o sininho escolhe o produto no catálogo do bundle (src/lib/mock/affiliate-products.ts) e manda os valores já calculados. Mantida de propósito — morta mas reversível, mesmo tratamento do Impulsionar.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RPC panel_apply_demo_sale — nova assinatura
-- ═══════════════════════════════════════════════════════════════════════════
-- A versão antiga tinha 2 argumentos (date, uuid). CREATE OR REPLACE com 9
-- argumentos NÃO a substituiria — criaria uma SOBRECARGA, e a de 2 argumentos
-- continuaria de pé, executável por qualquer authenticated, ainda lendo
-- cenário. Duas portas para a mesma coisa é como a tela passa a mentir. Então
-- o DROP é explícito e vem antes.
DROP FUNCTION IF EXISTS public.panel_apply_demo_sale(date, uuid);

-- ── A ARITMÉTICA DA COMISSÃO POR PRODUTO ───────────────────────────────────
-- panel_product_stats guarda comissão POR UNIDADE, e o total do produto é
-- `items_sold * commission_per_sale`, CALCULADO NA LEITURA (não há coluna de
-- total — coluna somada poderia divergir dos dois números que a geraram, que é
-- o que §11 dos requisitos proíbe).
--
-- A versão antiga ATRIBUÍA commission_per_sale (= a do cenário). Funcionava
-- porque o cenário sempre trazia a mesma taxa. Agora a taxa vem do catálogo e
-- pode mudar entre dois cliques do mesmo produto (catálogo regerado, preço
-- promocional). Atribuir a nova taxa reescreveria retroativamente a comissão
-- das vendas anteriores daquele produto — o Top 5 pularia de valor sozinho e
-- deixaria de bater com o card do dia.
--
-- Então commission_per_sale vira MÉDIA PONDERADA:
--
--     acumulado_antigo = itens_antigos * por_unidade_antigo
--     itens_novos      = itens_antigos + _quantity
--     por_unidade_novo = (acumulado_antigo + _commission) / itens_novos
--
-- A divisão nunca divide por zero: _quantity >= 1 é exigido, então
-- itens_novos >= 1 sempre.
--
-- trim_scale() só remove zeros à direita do resultado da divisão (5.04/3 sai
-- como 1.68000000000000000000). Não muda valor, deixa a tabela legível.
--
-- ── E O CARD DO DIA ────────────────────────────────────────────────────────
-- O dia NÃO soma `_commission` cru: soma o DELTA REALIZADO,
--
--     delta = (itens_novos * por_unidade_novo) - acumulado_antigo
--
-- Isto não é firula. `numeric` divide com precisão finita: se o acumulado do
-- produto não for divisível pela quantidade acumulada, `itens * por_unidade`
-- volta com resíduo (10.00/3*3 = 9.9999999999999999). Somando `_commission`
-- cru, o card do dia e a soma do Top 5 divergiriam nesse resíduo — e a regra
-- que essas duas tabelas existem para cumprir é justamente card == soma das
-- linhas. Somando o delta realizado, os dois são IGUAIS POR CONSTRUÇÃO,
-- sempre, sem depender de os números serem "redondos".
--
-- No caminho real a distinção nem aparece: o client manda
-- _commission = _quantity * commissionBRL do produto, então a divisão é exata
-- e delta == _commission. O delta é a rede para quando não for.
--
-- ── CORRIDA COM O EDITOR ───────────────────────────────────────────────────
-- O advisory lock serializa sininho-contra-sininho. O EDITOR do admin escreve
-- direto nas tabelas (pela RLS), sem passar por aqui, e não pega o lock. Por
-- isso a leitura do produto é FOR UPDATE: se o editor estiver salvando aquela
-- linha, uma das duas espera a outra em vez de as duas lerem o mesmo valor
-- velho. Linha que ainda não existe não tem o que travar — nesse caso vale o
-- último que escrever, e as duas escritas são do mesmo admin, na mesma tela.
--
-- ── RETORNO ────────────────────────────────────────────────────────────────
--   status = 'applied'         → aplicou agora
--   status = 'already_applied' → chave repetida, nada foi aplicado
-- 'no_scenarios' deixou de existir junto com os cenários. Sem cenário para
-- faltar, não há terceiro desfecho: ou aplica, ou já estava aplicado, ou
-- levanta erro de validação/autorização.

CREATE OR REPLACE FUNCTION public.panel_apply_demo_sale(
  _record_date     date,
  _idempotency_key uuid,
  _product_n       integer,
  _clicks_add      integer,
  _quantity        integer,
  _order_value     numeric,
  _commission      numeric,
  _new_buyers      integer,
  _social_clicks   integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid              uuid;
  _status           text;
  _out_product_n    integer := NULL;
  _out_quantity     integer := NULL;
  _existing         public.panel_sale_events%rowtype;
  _daily            public.panel_daily_records%rowtype;
  _prev_items       integer;
  _prev_per_unit    numeric;
  _prev_accum       numeric;
  _new_items        integer;
  _new_per_unit     numeric;
  _commission_delta numeric;
  _products         jsonb;
BEGIN
  -- ── Autorização ─────────────────────────────────────────────────────────
  -- SECURITY DEFINER não passa pela RLS. Esta checagem é a proteção INTEIRA
  -- da função. Não remover, não afrouxar, não trocar por lista de e-mail.
  _uid := auth.uid();
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- ── Validação da entrada ────────────────────────────────────────────────
  -- Antes do lock: é tudo checagem de argumento, não olha estado nenhum, e não
  -- há por que segurar a data enquanto se recusa uma chamada malformada.
  --
  -- A regra aqui é levantar erro, não corrigir. Uma venda com quantidade 0 ou
  -- comissão negativa é bug do client; gravar "o que dava" esconderia o bug
  -- dentro dos números da apresentação, onde ele é muito mais caro de achar.
  IF _record_date IS NULL THEN
    RAISE EXCEPTION 'Data não informada';
  END IF;

  -- Sem chave não há idempotência, e sem idempotência o clique duplo vende
  -- duas vezes. Recusar é melhor do que aplicar uma venda insegura.
  IF _idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Chave de idempotência não informada';
  END IF;

  IF _product_n      IS NULL OR _quantity      IS NULL OR _clicks_add IS NULL
     OR _order_value IS NULL OR _commission    IS NULL
     OR _new_buyers  IS NULL OR _social_clicks IS NULL THEN
    RAISE EXCEPTION 'Venda incompleta: todos os valores da venda são obrigatórios';
  END IF;

  -- NaN merece linha própria. Em `numeric`, NaN ORDENA ACIMA de qualquer
  -- número: 'NaN' >= 0 é TRUE, e ele passaria tanto por esta validação quanto
  -- pela CHECK da tabela — e a partir daí o total do dia seria NaN para
  -- sempre, sem jeito de somar de volta. (Diferente de float: em numeric,
  -- NaN = NaN é TRUE, então este teste funciona.)
  IF _order_value = 'NaN'::numeric OR _commission = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Venda com valor inválido (NaN)';
  END IF;

  -- Mesma faixa da CHECK de panel_product_stats, para os dois falharem igual.
  IF _product_n < 1 OR _product_n > 1000 THEN
    RAISE EXCEPTION 'Produto fora da faixa do catálogo: %', _product_n;
  END IF;

  -- Zero é recusado aqui, ao contrário dos outros campos: uma venda de zero
  -- itens não é venda, subiria `orders` sem subir `items_sold`, e é exatamente
  -- o descasamento que §11 dos requisitos proíbe. Também é o que garante
  -- itens_novos >= 1 na divisão da média ponderada.
  IF _quantity < 1 THEN
    RAISE EXCEPTION 'Quantidade inválida: %', _quantity;
  END IF;

  -- Os demais aceitam zero (venda sem clique novo, sem comprador novo etc.) e
  -- recusam negativo. Recusar aqui, e não deixar estourar na CHECK da tabela,
  -- é o que dá uma mensagem que diz o que aconteceu.
  IF _clicks_add < 0 OR _new_buyers < 0 OR _social_clicks < 0
     OR _order_value < 0 OR _commission < 0 THEN
    RAISE EXCEPTION 'Venda com valor negativo não é aceita';
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
  -- Antes de ler produto, antes de somar qualquer coisa. Clique duplo, retry
  -- de rede ou dedo nervoso na apresentação devolvem o estado atual e não
  -- vendem de novo. Roda DEPOIS do lock de propósito: se a chamada gêmea ainda
  -- estiver no meio da transação, esta espera e enxerga o evento já commitado,
  -- em vez de passar direto pela verificação.
  SELECT * INTO _existing
    FROM public.panel_sale_events
   WHERE idempotency_key = _idempotency_key;

  IF FOUND THEN
    _status := 'already_applied';
    -- O produto vem do LOG, não do argumento: o que importa devolver é o que
    -- foi aplicado de verdade daquela vez, não o que este client pediu agora.
    -- (Linha antiga, de cenário, devolve NULL — nunca soube o produto.)
    _out_product_n := _existing.product_n;

  ELSE
    -- ── 2) Estado atual do produto nesta data ─────────────────────────────
    -- FOR UPDATE pelo motivo explicado no cabeçalho: o editor do admin escreve
    -- nesta tabela sem passar pelo advisory lock.
    SELECT p.items_sold, p.commission_per_sale
      INTO _prev_items, _prev_per_unit
      FROM public.panel_product_stats p
     WHERE p.record_date = _record_date
       AND p.product_n   = _product_n
     FOR UPDATE;

    -- Produto que ainda não vendeu nesta data: parte de zero. Não é erro nem
    -- caso especial — é o primeiro clique do dia naquele produto.
    _prev_items    := coalesce(_prev_items, 0);
    _prev_per_unit := coalesce(_prev_per_unit, 0);
    _prev_accum    := _prev_items * _prev_per_unit;

    _new_items     := _prev_items + _quantity;
    _new_per_unit  := trim_scale((_prev_accum + _commission) / _new_items);

    -- O quanto a comissão daquele produto REALMENTE subiu depois de recalcular
    -- a média. É este número que vai para o dia, para card e Top 5 baterem.
    _commission_delta := (_new_items * _new_per_unit) - _prev_accum;

    -- ── 3) A linha do dia ─────────────────────────────────────────────────
    -- Upsert somando: a data pode não existir ainda (primeira venda de uma
    -- data nova) ou já ter números que o admin configurou à mão. Os dois casos
    -- são o mesmo INSERT ... ON CONFLICT.
    --
    -- pct_overrides NÃO aparece aqui, nem no INSERT nem no DO UPDATE, e isso é
    -- deliberado: porcentagem manual que o admin escreveu tem que sobreviver
    -- ao sininho. Card em modo automático (chave ausente) recalcula sozinho na
    -- leitura, porque os números que ele compara acabaram de mudar.
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
      _clicks_add,
      1,
      _commission_delta,
      _quantity,
      _order_value,
      _new_buyers,
      _social_clicks,
      now(),
      _uid
    )
    ON CONFLICT (record_date) DO UPDATE SET
      clicks               = d.clicks        + EXCLUDED.clicks,
      orders               = d.orders        + EXCLUDED.orders,
      -- GREATEST só pode morder num estado que JÁ estava inconsistente: o
      -- delta só sai negativo por resíduo de divisão, e só quando _commission
      -- é 0 e o produto já tinha comissão acumulada — ou seja, com o card do
      -- dia zerado à mão enquanto o Top 5 não estava. Preferir clampar a
      -- estourar a CHECK: no meio de uma apresentação, abortar a venda inteira
      -- é o pior desfecho possível.
      estimated_commission = GREATEST(0, d.estimated_commission + EXCLUDED.estimated_commission),
      items_sold           = d.items_sold    + EXCLUDED.items_sold,
      order_value          = d.order_value   + EXCLUDED.order_value,
      new_buyers           = d.new_buyers    + EXCLUDED.new_buyers,
      social_clicks        = d.social_clicks + EXCLUDED.social_clicks,
      updated_at           = now(),
      updated_by           = EXCLUDED.updated_by
    RETURNING * INTO _daily;

    -- ── 4) A linha do produto ─────────────────────────────────────────────
    -- MESMA quantidade que foi para items_sold do dia. É esta igualdade que
    -- impede o caso proibido por §11: "não pode acontecer de aumentar o pedido
    -- sem aumentar o produto". As duas escritas estão na mesma transação —
    -- ou as duas valem, ou nenhuma vale.
    --
    -- Aqui os dois campos são ATRIBUÍDOS, não somados: _new_items já inclui o
    -- que havia, e _new_per_unit já é a média do acumulado. Somar de novo
    -- contaria duas vezes. A leitura FOR UPDATE lá em cima é o que torna essa
    -- atribuição segura.
    INSERT INTO public.panel_product_stats AS p (
      record_date,
      product_n,
      items_sold,
      commission_per_sale
    ) VALUES (
      _record_date,
      _product_n,
      _new_items,
      _new_per_unit
    )
    ON CONFLICT (record_date, product_n) DO UPDATE SET
      items_sold          = EXCLUDED.items_sold,
      commission_per_sale = EXCLUDED.commission_per_sale;

    -- ── 5) O evento ───────────────────────────────────────────────────────
    -- Por último: fecha a idempotência. scenario_id fica NULL — não houve
    -- cenário.
    --
    -- A PK aqui é a rede para UM caso específico: a busca lá em cima é por
    -- chave, SEM filtrar data — então uma chave repetida em OUTRA data já
    -- volta como 'already_applied' e não chega neste INSERT. O que pode chegar
    -- é a corrida: o advisory lock é por DATA, logo duas chamadas com a mesma
    -- chave em datas DIFERENTES rodam em paralelo, as duas não acham o evento
    -- e as duas tentam inserir. A segunda estoura na PK e a transação inteira
    -- volta atrás — nada aplicado, nada pela metade. Contrato do client: uma
    -- chave nova por clique.
    INSERT INTO public.panel_sale_events (idempotency_key, record_date, product_n)
    VALUES (_idempotency_key, _record_date, _product_n);

    _status        := 'applied';
    _out_product_n := _product_n;
    _out_quantity  := _quantity;
  END IF;

  -- ── 6) Resposta ─────────────────────────────────────────────────────────
  -- No desfecho que não aplicou nada, _daily continua vazio: lê a linha atual
  -- para a UI receber sempre a mesma forma de resposta.
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
    'product_n',   _out_product_n,
    'quantity',    _out_quantity,
    'message',
      CASE _status
        WHEN 'already_applied' THEN 'Esta venda já havia sido aplicada.'
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

COMMENT ON FUNCTION public.panel_apply_demo_sale(date, uuid, integer, integer, integer, numeric, numeric, integer, integer) IS
  'Aplica UMA venda demo do sininho do /painel, atomicamente, na data informada. Admin-only. Os valores vêm CALCULADOS DO CLIENT a partir do catálogo real (src/lib/mock/affiliate-products.ts) — o banco valida e aplica, não escolhe o produto. Idempotente por _idempotency_key. commission_per_sale é média ponderada acumulada e o dia recebe o delta realizado, para o card do dia e a soma do Top 5 nunca divergirem.';

-- authenticated pode CHAMAR; quem não é admin leva 'Não autorizado' na
-- primeira linha do corpo. anon não chega nem a chamar.
REVOKE EXECUTE ON FUNCTION public.panel_apply_demo_sale(date, uuid, integer, integer, integer, numeric, numeric, integer, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.panel_apply_demo_sale(date, uuid, integer, integer, integer, numeric, numeric, integer, integer) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- PRÓXIMOS PASSOS (fora deste arquivo)
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Regerar src/integrations/supabase/types.ts — a assinatura de
--    panel_apply_demo_sale mudou de 2 para 9 argumentos.
-- 2. Sininho: escolher o produto em affiliateProducts e chamar
--       supabase.rpc('panel_apply_demo_sale', {
--         _record_date: spDateKey(...), _idempotency_key: crypto.randomUUID(),
--         _product_n: p.n, _clicks_add: ..., _quantity: q,
--         _order_value: q * p.price, _commission: q * p.commissionBRL,
--         _new_buyers: ..., _social_clicks: ... })
--    _commission = _quantity * commissionBRL, e não um total arredondado à
--    parte: é o que mantém exata a divisão da média ponderada.
--    Gerar a chave UMA vez por clique e reusá-la no retry — chave nova em
--    retry aplica uma segunda venda, que é o que a idempotência evita.
--    Desabilitar o sininho enquanto a chamada estiver em voo (§11).
-- 3. Repintar a tela com o `daily` e o `products` da resposta, sem refetch.
--    'already_applied' repinta sem animação de contagem.
