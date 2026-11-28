CREATE OR REPLACE FUNCTION public.meiro_checkout_preview(p_items jsonb, p_city text DEFAULT 'Ulaanbaatar'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
      'made_to_order',current_variant.made_to_order AND (NOT coalesce(current_variant.track_inventory,false) OR coalesce(current_variant.quantity_on_hand-current_variant.quantity_reserved,0)<requested.quantity),'lead_time_days',CASE WHEN current_variant.made_to_order AND (NOT coalesce(current_variant.track_inventory,false) OR coalesce(current_variant.quantity_on_hand-current_variant.quantity_reserved,0)<requested.quantity) THEN current_variant.lead_time_days ELSE NULL END,'available',available));
  END LOOP;
  SELECT delivery_fee_mnt INTO delivery_fee FROM public.shipping_settings WHERE id = true;
  RETURN jsonb_build_object('currency','MNT','city','Ulaanbaatar','items',lines,'items_subtotal_mnt',subtotal,
    'delivery_fee_mnt',delivery_fee,'total_mnt',CASE WHEN all_available AND delivery_fee IS NOT NULL THEN subtotal + delivery_fee ELSE NULL END,
    'all_items_available',all_available,'checkout_enabled',false);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.meiro_create_mock_order(p_items jsonb, p_address jsonb, p_key uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid(); oid uuid; preview jsonb; l jsonb; qty integer; vid uuid; reserved integer;
BEGIN
IF uid IS NULL OR p_key IS NULL THEN RAISE EXCEPTION 'Authentication and checkout key required'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
SELECT id INTO oid FROM public.orders WHERE user_id=uid AND checkout_key=p_key;
IF FOUND THEN RETURN oid; END IF;
IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid cart'; END IF;
PERFORM i.variant_id FROM public.inventory i WHERE i.variant_id IN (SELECT (x->>'variantId')::uuid FROM jsonb_array_elements(p_items) x) ORDER BY i.variant_id FOR UPDATE;
PERFORM v.id FROM public.product_variants v WHERE v.id IN (SELECT (x->>'variantId')::uuid FROM jsonb_array_elements(p_items) x) ORDER BY v.id FOR SHARE;
PERFORM p.id FROM public.products p WHERE p.id IN (SELECT (x->>'productId')::uuid FROM jsonb_array_elements(p_items) x) ORDER BY p.id FOR SHARE;
preview:=public.meiro_checkout_preview(p_items,'Ulaanbaatar');
IF NOT coalesce((preview->>'all_items_available')::boolean,false) OR (preview->>'total_mnt') IS NULL THEN RAISE EXCEPTION 'Cart unavailable'; END IF;
INSERT INTO public.orders(user_id,checkout_key,reservation_expires_at,payment_provider,items_subtotal_mnt,delivery_fee_mnt,recipient_name,phone,city,district,khoroo,address_line,instructions)
VALUES(uid,p_key,now()+interval '15 minutes','mock',(preview->>'items_subtotal_mnt')::bigint,(preview->>'delivery_fee_mnt')::integer,p_address->>'recipient_name',p_address->>'phone','Ulaanbaatar',p_address->>'district',(p_address->>'khoroo')::integer,p_address->>'address_line',coalesce(p_address->>'instructions','')) RETURNING id INTO oid;
FOR l IN SELECT value FROM jsonb_array_elements(preview->'items') LOOP
vid:=(l->>'variant_id')::uuid; qty:=(l->>'quantity')::integer; reserved:=0;
IF true THEN
SELECT least(qty,quantity_on_hand-quantity_reserved) INTO reserved FROM public.inventory WHERE variant_id=vid AND track_inventory;
reserved:=coalesce(reserved,0);
IF reserved>0 THEN
UPDATE public.inventory SET quantity_reserved=quantity_reserved+reserved WHERE variant_id=vid; INSERT INTO public.stock_movements(variant_id,quantity_change,movement_type,reference) VALUES(vid,reserved,'reservation',oid::text);
END IF;
IF reserved<qty AND NOT (l->>'made_to_order')::boolean AND EXISTS(SELECT 1 FROM public.inventory WHERE variant_id=vid AND track_inventory) THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
END IF;
INSERT INTO public.order_items(order_id,product_id,variant_id,product_name,variant_name,sku,unit_price_mnt,quantity,made_to_order,lead_time_days,reserved_quantity) VALUES(oid,(l->>'product_id')::uuid,vid,l->>'product_name',l->>'variant_name',l->>'sku',(l->>'unit_price_mnt')::integer,qty,(l->>'made_to_order')::boolean AND reserved<qty,CASE WHEN reserved<qty THEN (l->>'lead_time_days')::integer ELSE NULL END,reserved);
END LOOP; RETURN oid; END $function$
;
