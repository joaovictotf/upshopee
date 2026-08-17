-- ═══════════════════════════════════════════════════════════════════════════
-- FECHA BURACO: webhook_activate_boost_pack liberava pack de graça
-- Migration: 20260817130000_secure_webhook_activate_boost_pack
-- ═══════════════════════════════════════════════════════════════════════════
--
-- O QUE ESTAVA ERRADO (confirmado no banco de PRODUÇÃO, não só no repo):
--
-- O comentário da migration 20260625000001 dizia que a função era
-- "secured by being callable only via the webhook secret". Isso era FALSO.
-- Nem a 20260625000001 nem a 20260625000002 tinham REVOKE, e o Postgres
-- concede EXECUTE a PUBLIC por padrão em toda função nova. Resultado medido
-- na produção em 17/08/2026:
--
--     has_function_privilege('authenticated',
--       'public.webhook_activate_boost_pack(uuid,text)', 'EXECUTE')  →  true
--
-- Somando a isso: a função é SECURITY DEFINER, recebe _user_id como ARGUMENTO,
-- e o corpo não tem nenhuma checagem de autorização — confirmado no prosrc
-- vivo (auth.uid ausente, has_role ausente). Ou seja, qualquer usuário logado
-- podia chamar a RPC pelo PostgREST e ativar QUALQUER pack para QUALQUER conta,
-- sem pagar nada.
--
-- DUAS CAMADAS DE CORREÇÃO, porque uma só não basta:
--   1. GRANT — tira o EXECUTE de PUBLIC/anon/authenticated e deixa só
--      service_role. É a trava principal: o PostgREST devolve erro de
--      permissão antes de o corpo rodar.
--   2. Guarda dentro do corpo — se um GRANT largo voltar no futuro (por
--      descuido, ou por um CREATE OR REPLACE que alguém rode sem REVOKE), a
--      função ainda se recusa a executar. É a rede de proteção.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- CORREÇÃO DE DADO JUNTO: _pack_value estava abaixo do valor cobrado
-- ═══════════════════════════════════════════════════════════════════════════
-- Além da segurança, esta migration corrige duas linhas de _pack_value que
-- gravavam MENOS do que o cliente realmente paga:
--
--     pack         cobrado (UI)   gravava       agora grava
--     inicio       R$  40,00      24            40
--     aceleracao   R$  64,90      50            64.9
--     escala       R$ 150,00      150           150   (já batia)
--     maximo       R$ 400,00      400           400   (já batia)
--
-- O valor cobrado é o de PACKS em src/routes/dashboard.impulsionar-vendas.tsx,
-- que agora também é a tabela de preços de evopay-create-pix. Com os números
-- antigos, boost_campaigns.pack_value subnotificava a receita de dois dos
-- quatro packs, e qualquer relatório somando essa coluna saía errado.
--
-- ATENÇÃO: isto corrige o que será GRAVADO daqui para frente. As linhas já
-- existentes em boost_campaigns continuam com o valor antigo — inclusive a
-- única venda real, de 25/06/2026, que foi 'escala' e portanto já estava certa.
-- Nenhum UPDATE retroativo é feito aqui de propósito: mexer em linha de
-- campanha paga é decisão do Juam, não efeito colateral de uma migration.
--
-- O QUE MAIS NÃO MUDOU: fora a guarda e essas duas constantes, o corpo é cópia
-- literal da 20260625000002 — mesmo cancelamento de campanha ativa, mesmos
-- INSERTs, mesmo laço de eventos, mesmo fallback de "usuário sem produtos",
-- mesmo retorno. Nenhuma faixa de comissão foi tocada (_min_comm/_max_comm/
-- _fixed_comm seguem iguais), então o comportamento visível da campanha é o
-- mesmo. O fluxo Impulsionar que funcionou de verdade em 25/06/2026 continua
-- igual.


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Função com a guarda
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.webhook_activate_boost_pack(
  _user_id uuid,
  _pack_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cid uuid;
  _existing uuid;
  _pack_name text;
  _pack_value numeric;
  _total_sales int;
  _min_comm numeric;
  _max_comm numeric;
  _fixed_comm numeric;
  _has_any_product boolean;
  _i int;
  _ts timestamptz;
  _day_offset numeric;
  _hour int;
  _minute int;
  _comm numeric;
  _prod public.user_products%rowtype;
BEGIN
  -- ── GUARDA (única ADIÇÃO ao corpo da 20260625000002; a outra diferença é
  --    a correção de _pack_value no CASE abaixo, explicada no cabeçalho) ────
  -- Quem pode chamar:
  --   • o webhook, que usa a service key — nesse contexto não há JWT de
  --     usuário e auth.uid() é NULL;
  --   • um admin, para suporte manual.
  -- Qualquer usuário logado comum cai no RAISE.
  --
  -- A comparação é "auth.uid() IS NOT NULL E não é admin" em vez de
  -- "auth.uid() IS NULL OU é admin" negado, para deixar explícito que o
  -- caminho de service role é o NULL. Não usar `auth.role()`: com as novas
  -- secret keys (sb_secret_*) ela nem sempre vem preenchida, enquanto a
  -- ausência de `sub` no JWT é estável nos dois formatos de chave.
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  -- ─────────────────────────────────────────────────────────────────────────

  -- Pack configuration (same as admin_create_boost_campaign)
  CASE _pack_id
    WHEN 'inicio' THEN
      _pack_name := 'Pack Início'; _pack_value := 40;   -- era 24; cobrado R$ 40,00
      _total_sales := 3;
      _min_comm := 24; _max_comm := 50; _fixed_comm := NULL;
    WHEN 'aceleracao' THEN
      _pack_name := 'Pack Aceleração'; _pack_value := 64.9;  -- era 50; cobrado R$ 64,90
      _total_sales := 4 + floor(random() * 5)::int; -- 4..8
      _min_comm := 45; _max_comm := 70; _fixed_comm := NULL;
    WHEN 'escala' THEN
      _pack_name := 'Pack Escala'; _pack_value := 150;
      _total_sales := 8 + floor(random() * 11)::int; -- 8..18
      _fixed_comm := 100;
    WHEN 'maximo' THEN
      _pack_name := 'Pack Máximo'; _pack_value := 400;
      _total_sales := 20 + floor(random() * 26)::int; -- 20..45
      _fixed_comm := 200;
    ELSE
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_pack', 'pack_id', _pack_id);
  END CASE;

  -- Check if user already has an active campaign — cancel it (replace)
  SELECT id INTO _existing FROM public.boost_campaigns
    WHERE user_id = _user_id AND status = 'active' LIMIT 1;
  IF _existing IS NOT NULL THEN
    UPDATE public.boost_campaigns SET status = 'cancelled' WHERE id = _existing;
    DELETE FROM public.boost_simulated_events WHERE campaign_id = _existing AND status = 'scheduled';
  END IF;

  -- Create the campaign
  INSERT INTO public.boost_campaigns(
    user_id, pack_id, pack_name, pack_value,
    starts_at, ends_at, approved_by, internal_note, is_demo
  ) VALUES (
    _user_id, _pack_id, _pack_name, _pack_value,
    now(), now() + interval '7 days',
    _user_id,
    'Ativado via pagamento PIX (EvoPay)',
    false
  )
  RETURNING id INTO _cid;

  -- Generate simulated sales events spread across 7 days
  FOR _i IN 1.._total_sales LOOP
    _day_offset := random() * 7;
    _hour := 9 + floor(random() * 13)::int;   -- 9..21
    _minute := floor(random() * 60)::int;
    _ts := date_trunc('day', now())
            + (floor(_day_offset)::int || ' days')::interval
            + (_hour || ' hours')::interval
            + (_minute || ' minutes')::interval;

    IF _fixed_comm IS NOT NULL THEN
      _comm := _fixed_comm;
    ELSE
      _comm := round((_min_comm + random() * (_max_comm - _min_comm))::numeric, 2);
    END IF;

    -- Prefer approved / Pronto para venda; fallback to any product of this user
    SELECT * INTO _prod FROM public.user_products
      WHERE user_id = _user_id
        AND (validation_status = 'approved' OR status = 'Pronto para venda')
      ORDER BY random() LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO _prod FROM public.user_products
        WHERE user_id = _user_id
        ORDER BY random() LIMIT 1;
    END IF;
    -- Fallback if user has zero products
    IF NOT FOUND THEN
      _prod.name := 'Produto impulsionado ShopeSync';
      _prod.image := '/brands/shopee-bag.svg';
      _prod.id := NULL;
    END IF;

    INSERT INTO public.boost_simulated_events(
      campaign_id, user_id, product_row_id, product_name, product_image,
      scheduled_at, commission, is_demo
    ) VALUES (
      _cid, _user_id, _prod.id, _prod.name, _prod.image, _ts, _comm, false
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'campaign_id', _cid,
    'pack_name', _pack_name,
    'pack_value', _pack_value,
    'sales_planned', _total_sales
  );
END
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. GRANTs — a trava principal
-- ═══════════════════════════════════════════════════════════════════════════
-- Revogar de PUBLIC PRIMEIRO é o que faz a correção pegar. Tirar só de
-- `authenticated` não adianta nada: o privilégio implícito de PUBLIC continua
-- valendo para todo mundo, inclusive anon.
REVOKE EXECUTE ON FUNCTION public.webhook_activate_boost_pack(uuid, text)
  FROM PUBLIC, anon, authenticated;

-- Só o webhook (service key) executa. O dono da função mantém EXECUTE de
-- qualquer forma, então suporte via SQL editor continua possível.
GRANT EXECUTE ON FUNCTION public.webhook_activate_boost_pack(uuid, text)
  TO service_role;

-- Corrige o comentário falso da 20260625000001, que dizia que a função era
-- "secured by being callable only via the webhook secret". Nunca foi — não
-- havia REVOKE nenhum. Agora a afirmação é verdadeira, e está registrada no
-- próprio catálogo do banco, onde a próxima pessoa vai olhar.
COMMENT ON FUNCTION public.webhook_activate_boost_pack(uuid, text) IS
  'Ativa um boost pack após confirmação de pagamento PIX. Chamada apenas pelo evopay-webhook com a service key. EXECUTE revogado de PUBLIC/anon/authenticated em 17/08/2026 — antes disso qualquer usuário logado ativava qualquer pack para qualquer conta sem pagar. Além do GRANT, o corpo recusa chamada com auth.uid() não-nulo que não seja admin. NÃO valida valor pago: quem garante o preço é evopay-create-pix.';


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO — rodar depois de aplicar
-- ═══════════════════════════════════════════════════════════════════════════
-- Esperado: authenticated=false, anon=false, service_role=true
--
-- SELECT has_function_privilege('authenticated',
--          'public.webhook_activate_boost_pack(uuid,text)', 'EXECUTE') AS authenticated,
--        has_function_privilege('anon',
--          'public.webhook_activate_boost_pack(uuid,text)', 'EXECUTE') AS anon,
--        has_function_privilege('service_role',
--          'public.webhook_activate_boost_pack(uuid,text)', 'EXECUTE') AS service_role;
--
-- Esperado: true (a guarda está no corpo)
-- SELECT prosrc ILIKE '%has_role(auth.uid()%' AS guard_present
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname='public' AND p.proname='webhook_activate_boost_pack';
