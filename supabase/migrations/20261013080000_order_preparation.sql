-- Meiro : préparation des commandes, livraison Ulaanbaatar uniquement.
-- Exécuter une fois avec le rôle postgres dans Supabase SQL Editor.
-- Aucun paiement, aucune création de commande et aucune réservation de stock
-- ne sont activés par cette migration.
BEGIN;

CREATE TABLE public.customer_delivery_addresses (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name text NOT NULL CHECK (char_length(trim(recipient_name)) BETWEEN 1 AND 200),
  phone text NOT NULL CHECK (char_length(trim(phone)) BETWEEN 1 AND 40),
  city text NOT NULL DEFAULT 'Ulaanbaatar' CHECK (city = 'Ulaanbaatar'),
  district text NOT NULL CHECK (district IN ('Баянгол','Баянзүрх','Сүхбаатар','Сонгинохайрхан','Хан-Уул','Чингэлтэй','Налайх','Багануур','Багахангай')),
  khoroo integer NOT NULL CHECK (khoroo BETWEEN 1 AND 100),
  address_line text NOT NULL CHECK (char_length(trim(address_line)) BETWEEN 1 AND 1000),
  instructions text NOT NULL DEFAULT '' CHECK (char_length(instructions) <= 1000)
);
ALTER TABLE public.customer_delivery_addresses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_delivery_addresses FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.customer_delivery_addresses TO authenticated;
GRANT UPDATE (recipient_name,phone,city,district,khoroo,address_line,instructions) ON public.customer_delivery_addresses TO authenticated;
GRANT ALL ON public.customer_delivery_addresses TO service_role;
CREATE POLICY delivery_address_select_own ON public.customer_delivery_addresses FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY delivery_address_insert_own ON public.customer_delivery_addresses FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY delivery_address_update_own ON public.customer_delivery_addresses FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

CREATE TABLE public.shipping_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  city text NOT NULL DEFAULT 'Ulaanbaatar' CHECK (city = 'Ulaanbaatar'),
  delivery_fee_mnt integer CHECK (delivery_fee_mnt >= 0)
);
INSERT INTO public.shipping_settings (id, delivery_fee_mnt) VALUES (true, NULL);
ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shipping_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shipping_settings TO service_role;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','paid','preparing','ready_to_ship','shipped','delivered','cancelled','expired')),
  currency text NOT NULL DEFAULT 'MNT' CHECK (currency = 'MNT'),
  items_subtotal_mnt bigint NOT NULL CHECK (items_subtotal_mnt >= 0),
  delivery_fee_mnt integer NOT NULL CHECK (delivery_fee_mnt >= 0),
  total_mnt bigint GENERATED ALWAYS AS (items_subtotal_mnt + delivery_fee_mnt) STORED,
  recipient_name text NOT NULL CHECK (char_length(trim(recipient_name)) BETWEEN 1 AND 200),
  phone text NOT NULL CHECK (char_length(trim(phone)) BETWEEN 1 AND 40),
  city text NOT NULL CHECK (city = 'Ulaanbaatar'),
  district text NOT NULL CHECK (district IN ('Баянгол','Баянзүрх','Сүхбаатар','Сонгинохайрхан','Хан-Уул','Чингэлтэй','Налайх','Багануур','Багахангай')),
  khoroo integer NOT NULL CHECK (khoroo BETWEEN 1 AND 100),
  address_line text NOT NULL CHECK (char_length(trim(address_line)) BETWEEN 1 AND 1000),
  instructions text NOT NULL DEFAULT '' CHECK (char_length(instructions) <= 1000),
  tracking_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_customer_date_idx ON public.orders(user_id, created_at DESC);
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_name text NOT NULL,
  sku text NOT NULL,
  unit_price_mnt integer NOT NULL CHECK (unit_price_mnt >= 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  line_total_mnt bigint GENERATED ALWAYS AS (unit_price_mnt::bigint * quantity) STORED,
  made_to_order boolean NOT NULL DEFAULT false,
  lead_time_days integer CHECK (lead_time_days >= 0),
  UNIQUE (order_id, variant_id)
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.orders, public.order_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.orders, public.order_items TO authenticated;
GRANT ALL ON public.orders, public.order_items TO service_role;
CREATE POLICY orders_read_own_or_admin ON public.orders FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_meiro_admin());
CREATE POLICY order_items_read_own_or_admin ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = (SELECT auth.uid()) OR public.is_meiro_admin())));

CREATE FUNCTION public.meiro_checkout_preview(p_items jsonb, p_city text DEFAULT 'Ulaanbaatar')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  requested record;
  current_variant record;
  lines jsonb := '[]'::jsonb;
  subtotal bigint := 0;
  delivery_fee integer;
  available boolean;
  all_available boolean := true;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_city IS DISTINCT FROM 'Ulaanbaatar' THEN RAISE EXCEPTION 'Ulaanbaatar delivery only'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN RAISE EXCEPTION 'Invalid cart'; END IF;
  IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid cart size'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) AS x(value)
    WHERE jsonb_typeof(value) <> 'object' OR value->>'variantId' IS NULL OR value->>'productId' IS NULL
      OR value->>'quantity' IS NULL OR (value->>'quantity') !~ '^[0-9]+$'
      OR (value->>'quantity')::numeric NOT BETWEEN 1 AND 99) THEN RAISE EXCEPTION 'Invalid cart item'; END IF;

  FOR requested IN SELECT (value->>'productId')::uuid AS product_id,
      (value->>'variantId')::uuid AS variant_id, sum((value->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(p_items) AS x(value) GROUP BY 1,2 ORDER BY 2
  LOOP
    IF requested.quantity NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT p.name AS product_name, v.name AS variant_name, v.sku, v.price, v.made_to_order, v.lead_time_days,
      i.track_inventory, i.quantity_on_hand, i.quantity_reserved
      INTO current_variant
    FROM public.product_variants v JOIN public.products p ON p.id = v.product_id
    LEFT JOIN public.inventory i ON i.variant_id = v.id
    WHERE v.id = requested.variant_id AND p.id = requested.product_id AND v.active AND p.status = 'published' AND v.price > 0;
    IF NOT FOUND THEN
      all_available := false;
      lines := lines || jsonb_build_array(jsonb_build_object('product_id',requested.product_id,'variant_id',requested.variant_id,'quantity',requested.quantity,'available',false));
      CONTINUE;
    END IF;
    available := coalesce(current_variant.made_to_order OR NOT current_variant.track_inventory
      OR current_variant.quantity_on_hand - current_variant.quantity_reserved >= requested.quantity, false);
    all_available := all_available AND available;
    IF available THEN subtotal := subtotal + current_variant.price::bigint * requested.quantity; END IF;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'product_id',requested.product_id,'variant_id',requested.variant_id,'quantity',requested.quantity,
      'product_name',current_variant.product_name,'variant_name',current_variant.variant_name,'sku',current_variant.sku,
      'unit_price_mnt',current_variant.price,'line_total_mnt',current_variant.price::bigint * requested.quantity,
      'made_to_order',current_variant.made_to_order,'lead_time_days',current_variant.lead_time_days,'available',available));
  END LOOP;
  SELECT delivery_fee_mnt INTO delivery_fee FROM public.shipping_settings WHERE id = true;
  RETURN jsonb_build_object('currency','MNT','city','Ulaanbaatar','items',lines,'items_subtotal_mnt',subtotal,
    'delivery_fee_mnt',delivery_fee,'total_mnt',CASE WHEN all_available AND delivery_fee IS NOT NULL THEN subtotal + delivery_fee ELSE NULL END,
    'all_items_available',all_available,'checkout_enabled',false);
END;
$function$;
REVOKE ALL ON FUNCTION public.meiro_checkout_preview(jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meiro_checkout_preview(jsonb,text) TO authenticated;
COMMIT;
