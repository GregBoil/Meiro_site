CREATE OR REPLACE FUNCTION public.meiro_create_qpay_order(p_items jsonb, p_address jsonb, p_key uuid, p_user uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=p_user; oid uuid; preview jsonb; l jsonb; qty integer; vid uuid; reserved integer;
BEGIN
IF uid IS NULL OR p_key IS NULL THEN RAISE EXCEPTION 'Authentication and checkout key required'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
SELECT id INTO oid FROM public.orders WHERE user_id=uid AND checkout_key=p_key;
IF FOUND THEN IF NOT EXISTS (SELECT 1 FROM public.qpay_payments WHERE order_id=oid) THEN RAISE EXCEPTION 'Checkout key already used'; END IF; RETURN oid; END IF;
IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid cart'; END IF;
PERFORM i.variant_id FROM public.inventory i WHERE i.variant_id IN (SELECT (x->>'variantId')::uuid FROM jsonb_array_elements(p_items) x) ORDER BY i.variant_id FOR UPDATE;
PERFORM v.id FROM public.product_variants v WHERE v.id IN (SELECT (x->>'variantId')::uuid FROM jsonb_array_elements(p_items) x) ORDER BY v.id FOR SHARE;
PERFORM p.id FROM public.products p WHERE p.id IN (SELECT (x->>'productId')::uuid FROM jsonb_array_elements(p_items) x) ORDER BY p.id FOR SHARE;
preview:=public.meiro_checkout_preview(p_items,'Ulaanbaatar');
IF NOT coalesce((preview->>'all_items_available')::boolean,false) OR (preview->>'total_mnt') IS NULL THEN RAISE EXCEPTION 'Cart unavailable'; END IF;
INSERT INTO public.orders(user_id,checkout_key,reservation_expires_at,payment_provider,items_subtotal_mnt,delivery_fee_mnt,recipient_name,phone,city,district,khoroo,address_line,instructions)
VALUES(uid,p_key,NULL,'qpay',(preview->>'items_subtotal_mnt')::bigint,(preview->>'delivery_fee_mnt')::integer,p_address->>'recipient_name',p_address->>'phone','Ulaanbaatar',p_address->>'district',(p_address->>'khoroo')::integer,p_address->>'address_line',coalesce(p_address->>'instructions','')) RETURNING id INTO oid;
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
END LOOP; INSERT INTO public.qpay_payments(order_id,amount_mnt) VALUES(oid,(preview->>'total_mnt')::bigint); RETURN oid; END $function$
;
revoke all on function public.meiro_create_qpay_order(jsonb,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.meiro_create_qpay_order(jsonb,jsonb,uuid,uuid) to service_role;
