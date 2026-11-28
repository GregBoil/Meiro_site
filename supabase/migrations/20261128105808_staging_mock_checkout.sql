ALTER TABLE public.orders ADD COLUMN checkout_key uuid, ADD COLUMN reservation_expires_at timestamptz, ADD COLUMN payment_provider text, ADD COLUMN paid_at timestamptz;
CREATE UNIQUE INDEX orders_checkout_key_unique ON public.orders(user_id,checkout_key);
ALTER TABLE public.order_items ADD COLUMN reserved_quantity integer NOT NULL DEFAULT 0 CHECK(reserved_quantity >= 0 AND reserved_quantity <= quantity);
CREATE FUNCTION public.meiro_create_mock_order(p_items jsonb,p_address jsonb,p_key uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
IF NOT (l->>'made_to_order')::boolean THEN
UPDATE public.inventory SET quantity_reserved=quantity_reserved+qty WHERE variant_id=vid AND track_inventory AND quantity_on_hand-quantity_reserved>=qty;
IF FOUND THEN reserved:=qty; INSERT INTO public.stock_movements(variant_id,quantity_change,movement_type,reference) VALUES(vid,qty,'reservation',oid::text);
ELSIF EXISTS(SELECT 1 FROM public.inventory WHERE variant_id=vid AND track_inventory) THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
END IF;
INSERT INTO public.order_items(order_id,product_id,variant_id,product_name,variant_name,sku,unit_price_mnt,quantity,made_to_order,lead_time_days,reserved_quantity) VALUES(oid,(l->>'product_id')::uuid,vid,l->>'product_name',l->>'variant_name',l->>'sku',(l->>'unit_price_mnt')::integer,qty,(l->>'made_to_order')::boolean,(l->>'lead_time_days')::integer,reserved);
END LOOP; RETURN oid; END $$;
REVOKE ALL ON FUNCTION public.meiro_create_mock_order(jsonb,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.meiro_create_mock_order(jsonb,jsonb,uuid) TO authenticated;
CREATE FUNCTION public.meiro_finish_mock_order(p_order uuid,p_action text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; l record; target text;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
IF p_action NOT IN ('paid','cancelled','expired') OR p_action IS NULL THEN RAISE EXCEPTION 'Invalid action'; END IF;
SELECT * INTO o FROM public.orders WHERE id=p_order AND user_id=auth.uid() AND payment_provider='mock' FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
IF o.status<>'pending_payment' THEN RETURN o.status; END IF;
target:=p_action;
IF now()>=o.reservation_expires_at THEN target:='expired'; ELSIF target='expired' THEN RAISE EXCEPTION 'Not expired'; END IF;
FOR l IN SELECT variant_id,sum(reserved_quantity)::integer qty FROM public.order_items WHERE order_id=o.id AND reserved_quantity>0 GROUP BY variant_id ORDER BY variant_id LOOP
UPDATE public.inventory SET quantity_reserved=quantity_reserved-l.qty,quantity_on_hand=quantity_on_hand-CASE WHEN target='paid' THEN l.qty ELSE 0 END WHERE variant_id=l.variant_id AND quantity_reserved>=l.qty;
IF NOT FOUND THEN RAISE EXCEPTION 'Reservation missing'; END IF;
INSERT INTO public.stock_movements(variant_id,quantity_change,movement_type,reference) VALUES(l.variant_id,-l.qty,CASE WHEN target='paid' THEN 'sale'::public.stock_movement_type ELSE 'release'::public.stock_movement_type END,o.id::text);
END LOOP;
UPDATE public.orders SET status=target,paid_at=CASE WHEN target='paid' THEN now() ELSE NULL END WHERE id=o.id;
RETURN target; END $$;
REVOKE ALL ON FUNCTION public.meiro_finish_mock_order(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.meiro_finish_mock_order(uuid,text) TO authenticated;
