-- ═══════════════════════════════════════════════════════════════════════════
-- Aula ao vivo volta a ser gratuita
-- Migration: 20260827120000_free_class_booking
-- ═══════════════════════════════════════════════════════════════════════════
--
-- dashboard.aulas.tsx para de cobrar PIX pela aula. create_class_booking
-- (20260817120000) continua exatamente como está — ainda lê o preço de
-- class_professors e ainda grava a reserva como 'pending', porque a coluna
-- amount é NOT NULL e depende de existir uma linha ativa em class_professors.
-- Não mexi nessa trava: os preços continuam na tabela, sem uso, para o dia em
-- que as aulas voltarem a ser pagas.
--
-- O que muda é o PASSO SEGUINTE. Antes: create_class_booking → PIX na EvoPay →
-- evopay-webhook → confirm_class_booking (só service_role, a partir do
-- clientReference que a EvoPay devolve). Agora: create_class_booking →
-- confirm_free_class_booking, chamada pelo PRÓPRIO client, sem pagamento no
-- meio.
--
-- DECISÃO: reaproveitar o status 'paid' em vez de criar um valor novo no
-- CHECK de payment_status.
--   • Não existe razão de produto para um terceiro estado — "paga" e
--     "confirmada de graça" são tratadas do mesmo jeito na tela: a aula está
--     marcada e aparece o mesmo card de sucesso.
--   • O discriminador entre as duas já existe de graça: evopay_tx_id NULL numa
--     linha 'paid' é uma reserva confirmada por esta função, não pela EvoPay.
--     Se algum dia for preciso separar receita real de reserva gratuita, a
--     consulta é `payment_status = 'paid' AND evopay_tx_id IS NULL`.
--   • Sem alterar o CHECK, nada no client precisa mudar para reconhecer a aula
--     como marcada — a tela já trata payment_status = 'paid' como confirmada.
--
-- confirm_class_booking (chamada pelo webhook) NÃO FOI TOCADA. Se as aulas
-- voltarem a cobrar, o fluxo antigo — create_class_booking → PIX → webhook →
-- confirm_class_booking — volta a funcionar exatamente como estava, e as duas
-- funções de confirmação convivem sem conflito: uma por service_role via
-- webhook, outra por authenticated via esta migration.


-- ═══════════════════════════════════════════════════════════════════════════
-- confirm_free_class_booking — chamada pelo PRÓPRIO usuário, sem pagamento
-- ═══════════════════════════════════════════════════════════════════════════
-- Diferente de confirm_class_booking (que confia no service_role e por isso
-- nem confere dono), esta função roda como `authenticated` de verdade: quem
-- chama pode ser qualquer usuário logado. A checagem de dono é o que impede
-- alguém de confirmar a reserva de outra pessoa só sabendo o id.
--
-- Não recebe amount, tx_id nem nada além do id da reserva que
-- create_class_booking já criou. payment_status continua sem GRANT de UPDATE
-- para authenticated (ver 20260817120000) — quem escreve é esta função,
-- SECURITY DEFINER, exatamente como confirm_class_booking já faz.

CREATE OR REPLACE FUNCTION public.confirm_free_class_booking(_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid    uuid;
  _owner  uuid;
  _status text;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- FOR UPDATE trava a linha: mesma proteção contra corrida dupla que
  -- confirm_class_booking usa, agora contra duas abas confirmando a mesma
  -- reserva ao mesmo tempo.
  SELECT cb.user_id, cb.payment_status
    INTO _owner, _status
    FROM public.class_bookings cb
   WHERE cb.id = _booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF _owner <> _uid THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  -- Idempotente: se já está 'paid' (por esta função ou, no caso de reservas
  -- antigas, por um PIX de verdade), não reescreve paid_at.
  IF _status = 'paid' THEN
    RETURN true;
  END IF;

  -- 'expired' não ressuscita sozinho — só 'pending' vira confirmada aqui.
  IF _status <> 'pending' THEN
    RETURN false;
  END IF;

  UPDATE public.class_bookings
     SET payment_status = 'paid',
         paid_at        = now()
   WHERE class_bookings.id = _booking_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.confirm_free_class_booking(uuid) IS
  'Confirma reserva de aula ao vivo sem pagamento — o dono da reserva chama logo após create_class_booking. Reaproveita o status "paid"; evopay_tx_id NULL é o que distingue de um pagamento real confirmado via confirm_class_booking.';

REVOKE EXECUTE ON FUNCTION public.confirm_free_class_booking(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.confirm_free_class_booking(uuid) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO — rodar no SQL editor DEPOIS de aplicar
-- ═══════════════════════════════════════════════════════════════════════════
--
-- -- (a) authenticated pode chamar, anon não → esperado: true, false
-- SELECT has_function_privilege('authenticated',
--          'public.confirm_free_class_booking(uuid)', 'EXECUTE') AS authenticated_pode,
--        has_function_privilege('anon',
--          'public.confirm_free_class_booking(uuid)', 'EXECUTE') AS anon_pode;
--
-- -- (b) authenticated continua sem UPDATE/DELETE direto em class_bookings
-- --     → esperado: 0 linhas
-- SELECT privilege_type
--   FROM information_schema.role_table_grants
--  WHERE table_schema = 'public' AND table_name = 'class_bookings'
--    AND grantee = 'authenticated' AND privilege_type IN ('UPDATE','DELETE');
