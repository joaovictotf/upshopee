-- RPC to allow standard users to create a sale order from their Robô Divulgador
CREATE OR REPLACE FUNCTION public.create_robo_sale_order(
  _product_row_id uuid,
  _commission numeric
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _prod public.user_products%rowtype;
  _new_id uuid;
  _customer_names text[] := array['Ana Silva','Carlos Souza','Mariana Oliveira','João Pereira','Beatriz Santos','Rafael Lima','Camila Costa','Diego Almeida'];
  _customer_emails text[] := array['a***@gmail.com','c***@hotmail.com','m***@gmail.com','j***@outlook.com','b***@gmail.com','r***@gmail.com','c***@yahoo.com','d***@gmail.com'];
  _customer_phones text[] := array['(11) *****-1234','(21) *****-5678','(31) *****-9012','(41) *****-3456','(51) *****-7890','(71) *****-2345','(81) *****-6789','(85) *****-0123'];
  _customer_cities text[] := array['São Paulo, SP','Rio de Janeiro, RJ','Belo Horizonte, MG','Curitiba, PR','Porto Alegre, RS','Salvador, BA','Recife, PE','Fortaleza, CE'];
  _idx int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  
  -- Limit commission to be positive and under 500 (allows real product commissions which can go up to R$ 168.90)
  IF _commission IS NULL OR _commission <= 0 OR _commission >= 500 THEN
    RAISE EXCEPTION 'Valor de comissão inválido';
  END IF;

  SELECT * INTO _prod
    FROM public.user_products
    WHERE id = _product_row_id AND user_id = _uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado para este usuário';
  END IF;

  -- Ensure product is approved/ready for sale
  IF _prod.validation_status IS DISTINCT FROM 'approved' 
     AND _prod.status IS DISTINCT FROM 'Pronto para venda'
     AND _prod.status IS DISTINCT FROM 'Disponível na loja' THEN
    RAISE EXCEPTION 'Produto ainda não está pronto para venda';
  END IF;

  _idx := 1 + floor(random()*8)::int;

  INSERT INTO public.sales_orders (
    user_id, product_row_id, product_local_id, product_remote_id,
    product_name, product_image, marketplace,
    supplier_name, supplier_location,
    sale_price, supplier_cost, marketplace_fee, operational_cost,
    commission, customer_name, customer_email_masked,
    customer_phone_masked, customer_location, status, is_demo, source
  ) VALUES (
    _uid, _prod.id, _prod.local_id, _prod.id::text,
    _prod.name, _prod.image, 'shopee',
    _prod.supplier_name, _prod.supplier_location,
    coalesce(_prod.recommended_price, 0), coalesce(_prod.supplier_cost, 0), 0, 0,
    round(_commission::numeric, 2),
    _customer_names[_idx], _customer_emails[_idx],
    _customer_phones[_idx], _customer_cities[_idx],
    'Preparando produto', true, 'robo_divulgador'
  ) RETURNING id INTO _new_id;

  RETURN _new_id;
END
$$;

-- Grant execute access to authenticated users
REVOKE EXECUTE ON FUNCTION public.create_robo_sale_order(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_robo_sale_order(uuid, numeric) TO authenticated;
