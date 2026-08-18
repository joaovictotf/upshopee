-- ═══════════════════════════════════════════════════════════════════════════
-- "Meus produtos" — quais produtos de afiliado o usuário já clicou em afiliar
-- Migration: 20260817140000_user_affiliate_products
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Hoje o botão "Afiliar na Shopee" (src/components/products/ProductCard.tsx)
-- só abre o link da Shopee e não deixa rastro. O usuário afilia 20 produtos,
-- volta no dia seguinte e não sabe mais quais foram. Esta tabela é a memória
-- disso, para alimentar a aba "Meus produtos".
--
-- ESTA LISTA NÃO É DINHEIRO. Não há venda, comissão nem saque envolvidos —
-- é preferência de navegação do próprio usuário. Por isso as policies são as
-- simples de dono-da-linha, sem WITH CHECK amarrando valor e sem tirar UPDATE
-- do `authenticated`, como foi feito em class_bookings. Um usuário que edite o
-- próprio click_count não ganha nada e não afeta ninguém.
--
-- Ordem dentro do arquivo: tabela → RLS/GRANTs → RPCs. Tudo em uma transação.
--
-- Timestamp escolhido de propósito depois de 20260817130000
-- (secure_webhook_activate_boost_pack), que é a última migration da série —
-- assim um `supabase db push` limpo aceita este arquivo sem reclamar de ordem.
--
-- Este arquivo é SÓ SQL. O client (.tsx) ainda não chama nada disto; ver
-- "PRÓXIMOS PASSOS" no fim.


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. public.user_affiliate_products
-- ═══════════════════════════════════════════════════════════════════════════
-- Guardo `n` (integer) e não o `id` ("af-001") porque `n` é o identificador
-- estável do catálogo em src/lib/mock/affiliate-products.ts — hoje 1..300,
-- gerado pelo script de import. O client resolve n → produto na hora de
-- desenhar a aba; o banco não precisa conhecer nome, preço nem imagem.
--
-- A chave primária composta (user_id, product_n) é o que garante "um produto
-- aparece uma vez só na lista do usuário". Não existe linha duplicada possível
-- — nem por clique repetido, nem por corrida entre duas abas.

CREATE TABLE IF NOT EXISTS public.user_affiliate_products (
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_n        integer NOT NULL,
  first_clicked_at timestamptz NOT NULL DEFAULT now(),
  last_clicked_at  timestamptz NOT NULL DEFAULT now(),
  click_count      integer NOT NULL DEFAULT 1,

  CONSTRAINT user_affiliate_products_pkey PRIMARY KEY (user_id, product_n),

  -- O catálogo tem 300 produtos hoje e vai crescer, então o teto é folgado de
  -- propósito: 1000 não é "o tamanho do catálogo", é a linha onde um valor
  -- deixa de ser produto novo e passa a ser bug (n negativo, 0, índice de
  -- array vazando, parse errado no client).
  CONSTRAINT user_affiliate_products_product_n_range
    CHECK (product_n BETWEEN 1 AND 1000)
);

-- ── Sobre o índice de user_id ──────────────────────────────────────────────
-- A PRIMARY KEY acima já cria o btree user_affiliate_products_pkey em
-- (user_id, product_n). Como user_id é a PRIMEIRA coluna do índice, ele já
-- atende sozinho a única consulta que a aba faz:
--     SELECT ... FROM user_affiliate_products WHERE user_id = auth.uid()
-- Um `CREATE INDEX ... (user_id)` separado seria um segundo btree cobrindo
-- exatamente o mesmo prefixo: custo de escrita e de espaço em todo INSERT e
-- em todo bump de click_count, sem nenhum plano novo em troca. Mesma decisão
-- (e mesmo motivo) documentada em 20260817120000_class_bookings.sql para
-- client_reference.
--
-- Se ainda assim for preferível ter o índice explícito, é só descomentar:
-- CREATE INDEX IF NOT EXISTS user_affiliate_products_user_id_idx
--   ON public.user_affiliate_products (user_id);

COMMENT ON TABLE public.user_affiliate_products IS
  'Produtos de afiliado em que o usuário clicou "Afiliar na Shopee". Alimenta a aba "Meus produtos". Não é registro financeiro.';
COMMENT ON COLUMN public.user_affiliate_products.product_n IS
  'O campo `n` de AffiliateProduct em src/lib/mock/affiliate-products.ts (1..300 hoje). Identificador do catálogo, não FK — o catálogo vive no bundle, não no banco.';
COMMENT ON COLUMN public.user_affiliate_products.first_clicked_at IS
  'Primeiro clique. NUNCA é reescrito: record_affiliate_click só toca em last_clicked_at e click_count no caminho de conflito.';
COMMENT ON COLUMN public.user_affiliate_products.click_count IS
  'Quantos cliques no mesmo produto. Métrica de interesse, não de venda — a UI pode disparar a cada clique sem criar linha nova.';


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. RLS + GRANTs
-- ═══════════════════════════════════════════════════════════════════════════
-- Duas camadas, como no resto do projeto:
--   • GRANT decide se o papel tem o privilégio (erro duro de permissão);
--   • POLICY decide quais linhas ele enxerga (0 linhas, sem erro).

ALTER TABLE public.user_affiliate_products ENABLE ROW LEVEL SECURITY;

-- anon não tem nada aqui: a lista só existe logado. Isto é a trava real contra
-- leitura anônima — mesmo que uma policy larga demais apareça um dia, sem
-- GRANT o PostgREST responde "permission denied", não linhas.
REVOKE ALL ON TABLE public.user_affiliate_products FROM anon;

-- authenticated mantém as quatro operações no nível de GRANT. As policies
-- abaixo é que amarram tudo em auth.uid() = user_id.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_affiliate_products TO authenticated;
GRANT ALL ON TABLE public.user_affiliate_products TO service_role;

DROP POLICY IF EXISTS "Users read own affiliate products" ON public.user_affiliate_products;
CREATE POLICY "Users read own affiliate products"
  ON public.user_affiliate_products FOR SELECT TO authenticated
  USING (auth.uid() = user_affiliate_products.user_id);

-- Policies permissivas se somam com OR. Esta é a ÚNICA que amplia o SELECT, e
-- só para quem tem a linha 'admin' em user_roles — a fonte correta de papel,
-- não a lista de e-mails do client (§6/§11 do CLAUDE.md).
DROP POLICY IF EXISTS "Admins read all affiliate products" ON public.user_affiliate_products;
CREATE POLICY "Admins read all affiliate products"
  ON public.user_affiliate_products FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users insert own affiliate products" ON public.user_affiliate_products;
CREATE POLICY "Users insert own affiliate products"
  ON public.user_affiliate_products FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_affiliate_products.user_id);

-- USING filtra a linha que pode ser alterada; WITH CHECK impede que o UPDATE
-- termine com user_id de outra pessoa. Sem o WITH CHECK dava para "empurrar"
-- uma linha para a lista de outro usuário — o único abuso não-trivial que
-- existe numa tabela sem dinheiro.
DROP POLICY IF EXISTS "Users update own affiliate products" ON public.user_affiliate_products;
CREATE POLICY "Users update own affiliate products"
  ON public.user_affiliate_products FOR UPDATE TO authenticated
  USING      (auth.uid() = user_affiliate_products.user_id)
  WITH CHECK (auth.uid() = user_affiliate_products.user_id);

DROP POLICY IF EXISTS "Users delete own affiliate products" ON public.user_affiliate_products;
CREATE POLICY "Users delete own affiliate products"
  ON public.user_affiliate_products FOR DELETE TO authenticated
  USING (auth.uid() = user_affiliate_products.user_id);

-- Admin NÃO ganha UPDATE nem DELETE aqui, de propósito: é lista pessoal de
-- navegação. Admin só precisa enxergar, para métrica de "produto mais
-- afiliado".


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RPC record_affiliate_click — o clique em "Afiliar na Shopee"
-- ═══════════════════════════════════════════════════════════════════════════
-- A assinatura não recebe user_id: sempre auth.uid(). Um _user_id como
-- argumento em função SECURITY DEFINER seria uma porta para escrever na lista
-- dos outros.
--
-- IDEMPOTÊNCIA: a UI pode disparar isto em TODO clique, inclusive dois em
-- seguida no mesmo produto. O ON CONFLICT resolve na própria instrução —
-- primeiro clique insere com click_count 1; do segundo em diante bumpa
-- click_count e last_clicked_at e deixa first_clicked_at intacto. Nunca cria
-- segunda linha, nem sob corrida: o INSERT concorrente que perder espera o
-- lock da linha e cai no ramo DO UPDATE. É por isso que aqui não precisa de
-- advisory lock como em create_class_booking.

CREATE OR REPLACE FUNCTION public.record_affiliate_click(_product_n integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF _product_n IS NULL THEN
    RAISE EXCEPTION 'Produto não informado';
  END IF;

  -- Mesmo intervalo do CHECK da tabela, checado antes para o erro sair legível
  -- ("Produto inválido: 0") em vez de violação de constraint crua no PostgREST.
  IF _product_n < 1 OR _product_n > 1000 THEN
    RAISE EXCEPTION 'Produto inválido: %', _product_n;
  END IF;

  INSERT INTO public.user_affiliate_products AS uap (user_id, product_n)
  VALUES (_uid, _product_n)
  ON CONFLICT (user_id, product_n) DO UPDATE
     SET click_count     = uap.click_count + 1,
         last_clicked_at = now();
END;
$$;

COMMENT ON FUNCTION public.record_affiliate_click(integer) IS
  'Registra clique em "Afiliar na Shopee" para auth.uid(). Idempotente: repetição bumpa click_count/last_clicked_at, nunca duplica linha nem mexe em first_clicked_at.';

REVOKE EXECUTE ON FUNCTION public.record_affiliate_click(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.record_affiliate_click(integer) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RPC remove_affiliate_product — tirar da lista
-- ═══════════════════════════════════════════════════════════════════════════
-- Clique errado tem que ser removível. O WHERE carrega user_id = auth.uid()
-- explicitamente: a função é SECURITY DEFINER e roda como dona da tabela, ou
-- seja, NÃO passa pela RLS. Aqui a RLS não é rede de proteção nenhuma — o
-- WHERE é a proteção inteira. Não remover essa condição.
--
-- Não levanta erro se a linha não existir: DELETE de 0 linhas é sucesso. Dois
-- cliques em "remover" não podem virar um toast vermelho.

CREATE OR REPLACE FUNCTION public.remove_affiliate_product(_product_n integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF _product_n IS NULL THEN
    RAISE EXCEPTION 'Produto não informado';
  END IF;

  DELETE FROM public.user_affiliate_products
   WHERE user_id   = _uid
     AND product_n = _product_n;
END;
$$;

COMMENT ON FUNCTION public.remove_affiliate_product(integer) IS
  'Remove um produto da lista "Meus produtos" de auth.uid(). Só a linha do próprio chamador. Idempotente — linha inexistente não é erro.';

REVOKE EXECUTE ON FUNCTION public.remove_affiliate_product(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.remove_affiliate_product(integer) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- PRÓXIMOS PASSOS (fora deste arquivo)
-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ProductCard.tsx:187 — no clique de "Afiliar na Shopee", chamar
--    supabase.rpc('record_affiliate_click', { _product_n: product.n }).
--    O clique abre o link da Shopee; não bloquear a navegação esperando a RPC,
--    e não mostrar erro se ela falhar (a lista é conveniência, não o produto).
-- 2. Aba "Meus produtos": SELECT product_n, last_clicked_at, click_count
--    FROM user_affiliate_products ORDER BY last_clicked_at DESC, e resolver
--    n → produto por affiliateProducts (um Map por `n` evita varredura por
--    item com 300 produtos).
-- 3. Botão de remover → rpc('remove_affiliate_product', { _product_n: n }).
-- 4. Regenerar src/integrations/supabase/types.ts depois do push.
