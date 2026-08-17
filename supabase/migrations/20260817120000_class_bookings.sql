-- ═══════════════════════════════════════════════════════════════════════════
-- Aulas ao vivo — agendamento sai do localStorage e passa a viver no banco
-- Migration: 20260817120000_class_bookings
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Hoje o agendamento de aula ao vivo existe SÓ no navegador
-- (src/routes/dashboard.aulas.tsx, chave `upshopee-live-class.<userId>`).
-- Vamos cobrar PIX de verdade por isso. Um cliente que limpa o cache perde ao
-- mesmo tempo o agendamento e a prova de que pagou. Por isso a reserva passa a
-- ser uma linha em public.class_bookings, criada antes da cobrança e
-- confirmada pelo webhook.
--
-- Este arquivo é SÓ SQL. O client (.tsx) e as Edge Functions ainda não foram
-- alterados — ver a seção "PRÓXIMOS PASSOS" no fim do arquivo, que lista o que
-- fica quebrado até lá.
--
-- ORDEM DENTRO DO ARQUIVO IMPORTA:
--   1. class_professors (tabela de preços) — precisa existir antes, porque
--      class_bookings tem FK para ela e a policy de INSERT consulta o preço.
--   2. class_bookings.
--   3. RLS + GRANTs.
--   4. RPCs.
-- Tudo aplica em uma transação só.
--
-- REGRA DE OURO #4 do CLAUDE.md ("nenhuma transação real") continua valendo
-- para venda/comissão/saque. Aula ao vivo é a segunda exceção documentada,
-- junto do Impulsionar: aqui entra dinheiro real do cliente.


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. public.class_professors — TABELA DE PREÇOS
-- ═══════════════════════════════════════════════════════════════════════════
-- O preço NUNCA pode vir do navegador. Se o browser mandar o valor, qualquer
-- pessoa paga R$ 0,01 numa aula. Esta tabela é a única fonte de verdade do
-- preço; create_class_booking lê daqui e não aceita argumento de valor.
--
-- O CHECK do hífen no id não é frescura — ver o comentário do
-- client_reference em create_class_booking. Um id com hífen ('joao-pedro')
-- quebra silenciosamente o parsing do webhook. O banco recusa antes.

CREATE TABLE IF NOT EXISTS public.class_professors (
  id     text PRIMARY KEY,
  name   text NOT NULL,
  price  numeric NOT NULL,
  active boolean NOT NULL DEFAULT true,

  CONSTRAINT class_professors_id_no_hyphen
    CHECK (id <> '' AND position('-' in id) = 0)
);

COMMENT ON TABLE public.class_professors IS
  'Tabela de preços das aulas ao vivo. Fonte única do valor cobrado — o client nunca envia amount.';
COMMENT ON COLUMN public.class_professors.id IS
  'Slug do professor. NÃO PODE CONTER HÍFEN: entra no clientReference da EvoPay, que o webhook divide por "-" e exige exatamente 9 partes.';
COMMENT ON COLUMN public.class_professors.active IS
  'false esconde o professor da agenda e faz create_class_booking recusar. Preferir desativar a deletar — DELETE é bloqueado por FK se já houver reserva.';

-- Preços verbatim. ON CONFLICT DO NOTHING para o arquivo poder ser reaplicado
-- sem sobrescrever um ajuste de preço feito depois pelo admin.
INSERT INTO public.class_professors (id, name, price, active) VALUES
  ('renan',   'Professor Renan',   37.89, true),
  ('marcelo', 'Professor Marcelo', 23.56, true),
  ('junior',  'Professor Júnior',  15.78, true)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. public.class_bookings — A RESERVA
-- ═══════════════════════════════════════════════════════════════════════════
-- amount é gravado a partir de class_professors.price no momento da reserva, e
-- fica congelado ali. Se o admin mudar o preço amanhã, quem já pagou continua
-- com o valor que realmente pagou — é registro financeiro, não referência viva.

CREATE TABLE IF NOT EXISTS public.class_bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professor_id     text NOT NULL REFERENCES public.class_professors(id) ON UPDATE CASCADE,
  scheduled_date   date NOT NULL,
  scheduled_time   text NOT NULL,
  amount           numeric NOT NULL,
  payment_status   text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'expired')),
  evopay_tx_id     text,
  client_reference text UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  paid_at          timestamptz
);

-- Índice de user_id: a tela lê "minha reserva" a cada carregamento.
CREATE INDEX IF NOT EXISTS class_bookings_user_id_idx
  ON public.class_bookings (user_id);

-- Índice de client_reference: é como o webhook encontra a reserva. Não crio um
-- índice separado de propósito — a constraint UNIQUE acima já cria
-- class_bookings_client_reference_key, um btree completo. Um segundo índice na
-- mesma coluna só custaria escrita.

COMMENT ON TABLE public.class_bookings IS
  'Agendamento de aula ao vivo com pagamento PIX. Substitui a chave localStorage upshopee-live-class.<userId>.';
COMMENT ON COLUMN public.class_bookings.amount IS
  'Valor efetivamente cobrado, copiado de class_professors.price na criação. Congelado — não acompanha mudança de preço.';
COMMENT ON COLUMN public.class_bookings.scheduled_time IS
  'String do horário, igual às de TIME_SLOTS em dashboard.aulas.tsx ("18:30", "20:30", "22:00"). Texto, não time, para bater exatamente com o que a UI mostra.';
COMMENT ON COLUMN public.class_bookings.client_reference IS
  'String enviada à EvoPay. Formato: shopesync-aula-<uuid>-<professor_id>-<epoch_ms>. Exatamente 9 partes ao dividir por "-" — o webhook depende disso.';
COMMENT ON COLUMN public.class_bookings.payment_status IS
  'pending | paid | expired. Só muda para paid via confirm_class_booking (service_role). authenticated não tem UPDATE nesta tabela.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RLS + GRANTs
-- ═══════════════════════════════════════════════════════════════════════════
-- Duas camadas, de propósito:
--   • GRANT decide se o papel tem o privilégio (erro duro de permissão).
--   • POLICY decide quais linhas ele enxerga (0 linhas, sem erro).
-- Onde ninguém legítimo precisa do privilégio, tiro o GRANT — assim uma policy
-- larga demais criada por engano no futuro não abre nada sozinha.

ALTER TABLE public.class_professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings   ENABLE ROW LEVEL SECURITY;

-- ── class_professors ───────────────────────────────────────────────────────
-- anon não lê preço: a agenda só existe logado.
REVOKE ALL ON TABLE public.class_professors FROM anon;

-- authenticated MANTÉM os privilégios de escrita no nível de GRANT, e isso é
-- proposital: no Supabase o admin também se conecta como `authenticated` (o
-- papel vem de uma linha em user_roles, não de um role do Postgres). Revogar
-- INSERT/UPDATE/DELETE de authenticated bloquearia o admin junto. Quem separa
-- admin de usuário comum aqui são as policies com has_role() abaixo.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.class_professors TO authenticated;
GRANT ALL ON TABLE public.class_professors TO service_role;

DROP POLICY IF EXISTS "Authenticated read professors" ON public.class_professors;
CREATE POLICY "Authenticated read professors"
  ON public.class_professors FOR SELECT TO authenticated
  USING (true);
-- USING (true) aqui é intencional e revisado (o §11 do CLAUDE.md marca
-- USING(true) como suspeito): é uma tabela de preço público, três linhas, sem
-- dado de usuário. A UI precisa mostrar o valor antes de reservar. O escopo
-- está em `TO authenticated` — anon não chega aqui, e o REVOKE acima é a trava
-- de verdade.

DROP POLICY IF EXISTS "Admins insert professors" ON public.class_professors;
CREATE POLICY "Admins insert professors"
  ON public.class_professors FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins update professors" ON public.class_professors;
CREATE POLICY "Admins update professors"
  ON public.class_professors FOR UPDATE TO authenticated
  USING      (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins delete professors" ON public.class_professors;
CREATE POLICY "Admins delete professors"
  ON public.class_professors FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ── class_bookings ─────────────────────────────────────────────────────────
-- Sem UPDATE e sem DELETE para authenticated, nem no GRANT nem em policy.
-- payment_status, amount e paid_at são escritos só do lado do servidor
-- (confirm_class_booking roda como dono da função). Um UPDATE vindo do
-- PostgREST morre em "permission denied for table class_bookings", não em
-- "0 rows" — falha barulhenta é melhor que falha silenciosa quando o assunto é
-- pagamento.
REVOKE ALL ON TABLE public.class_bookings FROM anon;
REVOKE ALL ON TABLE public.class_bookings FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.class_bookings TO authenticated;
GRANT ALL ON TABLE public.class_bookings TO service_role;

DROP POLICY IF EXISTS "Users read own bookings" ON public.class_bookings;
CREATE POLICY "Users read own bookings"
  ON public.class_bookings FOR SELECT TO authenticated
  USING (auth.uid() = class_bookings.user_id);

DROP POLICY IF EXISTS "Admins read all bookings" ON public.class_bookings;
CREATE POLICY "Admins read all bookings"
  ON public.class_bookings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- INSERT direto pelo PostgREST continua permitido (o usuário insere linha
-- dele), mas o WITH CHECK amarra tudo que é dinheiro:
--   • amount tem que ser IGUAL ao preço vigente do professor — é isto que
--     impede a reserva de R$ 0,01 mesmo sem passar pela RPC;
--   • o professor tem que estar ativo;
--   • nasce sempre 'pending', sem tx e sem paid_at — ninguém se declara pago.
-- Sem esta cláusula, a policy "usuário insere a própria linha" sozinha
-- anularia toda a proteção de preço da RPC.
DROP POLICY IF EXISTS "Users create own pending bookings" ON public.class_bookings;
CREATE POLICY "Users create own pending bookings"
  ON public.class_bookings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = class_bookings.user_id
    AND class_bookings.payment_status = 'pending'
    AND class_bookings.evopay_tx_id IS NULL
    AND class_bookings.paid_at IS NULL
    AND class_bookings.amount = (
      SELECT cp.price
        FROM public.class_professors cp
       WHERE cp.id = class_bookings.professor_id
         AND cp.active
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RPC create_class_booking — cria a reserva pendente
-- ═══════════════════════════════════════════════════════════════════════════
-- Assinatura NÃO tem parâmetro de valor, e isso é o ponto principal da função.
-- Preço sempre por lookup em class_professors.
--
-- ┌─ ACOPLAMENTO FRÁGIL COM O WEBHOOK — LEIA ANTES DE MEXER ────────────────┐
-- │ supabase/functions/evopay-webhook/index.ts faz                          │
-- │     const parts = body.clientReference.split("-")                       │
-- │ e exige parts.length === 9. A conta é:                                  │
-- │     'shopesync'(1) + 'aula'(1) + uuid(5) + professor_id(1) + epoch(1)   │
-- │   = 9                                                                   │
-- │ O uuid contribui 5 partes porque já vem com 4 hífens.                   │
-- │                                                                         │
-- │ CONSEQUÊNCIA: professor_id NÃO pode conter hífen. Um id 'joao-pedro'    │
-- │ daria 10 partes e o webhook descartaria o pagamento SEM ERRO — ele      │
-- │ responde 200 para a EvoPay em qualquer caso, para não gerar retry. O    │
-- │ cliente pagaria e a reserva ficaria 'pending' para sempre.              │
-- │                                                                         │
-- │ TRÊS TRAVAS contra isso, todas de propósito:                            │
-- │   1. CHECK class_professors_id_no_hyphen, no cadastro do professor;     │
-- │   2. o IF explícito abaixo, no argumento recebido;                      │
-- │   3. a contagem das 9 partes na string já montada, logo antes do INSERT.│
-- │ A terceira é a que realmente vale: ela confere o contrato no formato    │
-- │ final, e pega também qualquer mudança futura no prefixo.                │
-- │                                                                         │
-- │ ATENÇÃO: o webhook de HOJE exige parts[1] === 'impulsionar' e ignora    │
-- │ qualquer outra coisa. Enquanto ele não aprender 'aula', NENHUM          │
-- │ pagamento de aula vai ser confirmado. Ver "PRÓXIMOS PASSOS".            │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.create_class_booking(
  _professor_id text,
  _date         date,
  _time         text
)
RETURNS TABLE (id uuid, client_reference text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid     uuid;
  _price   numeric;
  _ref     text;
  _parts   int;
  _new_id  uuid;
  _pending timestamptz;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF _professor_id IS NULL OR btrim(_professor_id) = '' THEN
    RAISE EXCEPTION 'Professor não informado';
  END IF;
  IF _date IS NULL THEN
    RAISE EXCEPTION 'Data não informada';
  END IF;
  IF _time IS NULL OR btrim(_time) = '' THEN
    RAISE EXCEPTION 'Horário não informado';
  END IF;

  -- Trava 2 do acoplamento com o webhook (ver caixa acima).
  IF position('-' in _professor_id) > 0 THEN
    RAISE EXCEPTION
      'professor_id não pode conter hífen (recebido: %) — quebraria o parsing do clientReference no evopay-webhook',
      _professor_id;
  END IF;

  -- PREÇO: sempre do banco, nunca do client. A função é SECURITY DEFINER, então
  -- roda como dona e enxerga class_professors sem depender da RLS do chamador.
  SELECT cp.price INTO _price
    FROM public.class_professors cp
   WHERE cp.id = _professor_id
     AND cp.active;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Professor indisponível: %', _professor_id;
  END IF;

  -- Serializa por usuário ANTES de checar o pendente. Sem o lock, dois cliques
  -- rápidos (ou duas abas) passam os dois pela verificação e geram duas
  -- cobranças PIX órfãs. Mesmo padrão de release_automatic_demo_sales; uso a
  -- forma de dois inteiros para não colidir com o namespace de lock das vendas.
  PERFORM pg_advisory_xact_lock(hashtext('class_booking'), hashtext(_uid::text));

  -- Anti-spam: uma reserva pendente por vez, janela de 30 minutos — que é
  -- exatamente o expiresIn do PIX em evopay-create-pix. Reservas 'expired' ou
  -- 'paid' não bloqueiam nada.
  SELECT cb.created_at INTO _pending
    FROM public.class_bookings cb
   WHERE cb.user_id = _uid
     AND cb.payment_status = 'pending'
     AND cb.created_at > now() - interval '30 minutes'
   ORDER BY cb.created_at DESC
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'Você já tem um agendamento aguardando pagamento. Conclua o PIX ou tente de novo em % minuto(s).',
      greatest(1, ceil(extract(epoch FROM (_pending + interval '30 minutes' - now())) / 60)::int);
  END IF;

  -- epoch em milissegundos como bigint: sem ponto decimal, sem sinal, sem
  -- hífen. clock_timestamp() em vez de now() porque now() é congelado na
  -- transação.
  _ref := 'shopesync-aula-'
          || _uid::text || '-'
          || _professor_id || '-'
          || (extract(epoch FROM clock_timestamp()) * 1000)::bigint::text;

  -- Trava 3: confere o contrato das 9 partes na string final, já montada.
  _parts := array_length(string_to_array(_ref, '-'), 1);
  IF _parts <> 9 THEN
    RAISE EXCEPTION
      'client_reference inválido: % parte(s), esperado 9 — o evopay-webhook descartaria este pagamento (%)',
      _parts, _ref;
  END IF;

  INSERT INTO public.class_bookings (
    user_id, professor_id, scheduled_date, scheduled_time,
    amount, payment_status, client_reference
  ) VALUES (
    _uid, _professor_id, _date, _time,
    _price, 'pending', _ref
  )
  RETURNING class_bookings.id INTO _new_id;

  -- Devolve só id e client_reference. amount fica de fora de propósito: quem
  -- for criar a cobrança PIX tem que ler o valor da linha pelo
  -- client_reference, do lado do servidor. Se a RPC devolvesse o valor, ele
  -- passaria pelo navegador — e voltaríamos ao buraco que esta migration fecha.
  RETURN QUERY SELECT _new_id, _ref;
END;
$$;

COMMENT ON FUNCTION public.create_class_booking(text, date, text) IS
  'Cria reserva pendente de aula ao vivo. Preço vem de class_professors — a função não aceita valor do client. Uma pendente por usuário a cada 30 min, sob advisory lock.';

REVOKE EXECUTE ON FUNCTION public.create_class_booking(text, date, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.create_class_booking(text, date, text) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RPC confirm_class_booking — chamada pelo webhook (service_role)
-- ═══════════════════════════════════════════════════════════════════════════
-- NÃO checa auth.uid(): quem chama é o evopay-webhook com a service key, sem
-- usuário logado. A proteção é o GRANT — só service_role executa.
--
-- Nunca levanta exceção por referência desconhecida. O webhook não pode entrar
-- em loop de retry por causa de um clientReference que não é nosso; devolve
-- false e o chamador loga e segue.

CREATE OR REPLACE FUNCTION public.confirm_class_booking(
  _client_reference text,
  _tx_id            text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id     uuid;
  _status text;
BEGIN
  IF _client_reference IS NULL OR btrim(_client_reference) = '' THEN
    RETURN false;
  END IF;

  -- FOR UPDATE trava a linha: a EvoPay pode entregar o mesmo webhook duas
  -- vezes, e as duas chegam em paralelo. A segunda espera aqui, lê 'paid' e
  -- cai no retorno idempotente abaixo, em vez de reescrever paid_at.
  SELECT cb.id, cb.payment_status
    INTO _id, _status
    FROM public.class_bookings cb
   WHERE cb.client_reference = _client_reference
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF _status = 'paid' THEN
    RETURN true;
  END IF;

  -- 'expired' também vira 'paid': se o dinheiro entrou, a aula é do cliente.
  -- Quem expirou e pagou depois aparece com paid_at > 30 min de created_at —
  -- dá para achar esses casos e realocar o horário na mão, se precisar.
  UPDATE public.class_bookings
     SET payment_status = 'paid',
         evopay_tx_id   = coalesce(_tx_id, evopay_tx_id),
         paid_at        = now()
   WHERE class_bookings.id = _id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.confirm_class_booking(text, text) IS
  'Marca a reserva como paga. Idempotente e silenciosa em referência desconhecida (retorna false) para o webhook nunca entrar em retry infinito. EXECUTE só para service_role.';

REVOKE EXECUTE ON FUNCTION public.confirm_class_booking(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.confirm_class_booking(text, text) TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════
-- PRÓXIMOS PASSOS — o que ainda NÃO funciona depois desta migration
-- ═══════════════════════════════════════════════════════════════════════════
-- Esta migration sozinha não liga o fluxo. Faltam, nesta ordem:
--
-- 1. evopay-webhook/index.ts — hoje exige parts[1] === 'impulsionar' e ignora
--    o resto. Precisa aceitar parts[1] === 'aula' e, nesse caso, chamar
--    confirm_class_booking(clientReference, transactionId ?? id) em vez de
--    webhook_activate_boost_pack. Sem isso, todo PIX de aula é ignorado.
--
-- 2. evopay-create-pix/index.ts — hoje monta o clientReference sozinho com
--    'impulsionar' fixo e usa o `amount` que veio do corpo da requisição.
--    Para aula tem que ser o contrário: receber o client_reference que
--    create_class_booking devolveu e ler o `amount` da linha em
--    class_bookings, com service_role. Se continuar usando o amount do body,
--    a proteção de preço desta migration não vale nada.
--
-- 3. dashboard.aulas.tsx — trocar upshopee-live-class.<userId> pelas RPC e
--    tabela. Vale ler o localStorage uma última vez e migrar quem já tem
--    reserva salva, senão essas pessoas perdem o agendamento na virada.
--
-- 4. Nada expira sozinho. 'expired' está no CHECK mas ninguém escreve esse
--    valor. A janela de 30 min de create_class_booking já destrava o usuário,
--    então não é bloqueante — mas um job que marque como expirado o que passou
--    de 30 min sem pagar deixa o histórico honesto.


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO — rodar no SQL editor DEPOIS de aplicar
-- ═══════════════════════════════════════════════════════════════════════════
-- Descomentar e rodar. Os cinco blocos conferem exatamente o que esta
-- migration promete.
--
-- -- (a) authenticated não tem UPDATE em class_bookings  → esperado: 0 linhas
-- SELECT privilege_type
--   FROM information_schema.role_table_grants
--  WHERE table_schema = 'public' AND table_name = 'class_bookings'
--    AND grantee = 'authenticated' AND privilege_type IN ('UPDATE','DELETE');
--
-- -- (a2) nenhuma policy de UPDATE/DELETE em class_bookings → esperado: 0 linhas
-- SELECT policyname, cmd FROM pg_policies
--  WHERE schemaname='public' AND tablename='class_bookings'
--    AND cmd IN ('UPDATE','DELETE');
--
-- -- (b) escrita em class_professors só com policy de admin
-- --     esperado: INSERT/UPDATE/DELETE com qual='has_role...' ou with_check='has_role...'
-- SELECT policyname, cmd, qual, with_check FROM pg_policies
--  WHERE schemaname='public' AND tablename='class_professors' ORDER BY cmd;
--
-- -- (c) confirm_class_booking não é executável por authenticated → esperado: false
-- SELECT has_function_privilege('authenticated',
--          'public.confirm_class_booking(text,text)', 'EXECUTE') AS authenticated_pode,
--        has_function_privilege('anon',
--          'public.confirm_class_booking(text,text)', 'EXECUTE') AS anon_pode,
--        has_function_privilege('service_role',
--          'public.confirm_class_booking(text,text)', 'EXECUTE') AS service_role_pode;
--
-- -- (d) preços exatos ao centavo → esperado: as 3 linhas todas com ok = true
-- SELECT id, name, price,
--        price = (ARRAY[37.89, 23.56, 15.78])[
--          array_position(ARRAY['renan','marcelo','junior'], id)]::numeric AS ok
--   FROM public.class_professors ORDER BY id;
--
-- -- (e) create_class_booking não aceita valor do client → esperado: 3 args,
-- --     nenhum chamado amount/price/valor
-- SELECT p.proname, pg_get_function_arguments(p.oid) AS args
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--  WHERE n.nspname='public' AND p.proname='create_class_booking';
