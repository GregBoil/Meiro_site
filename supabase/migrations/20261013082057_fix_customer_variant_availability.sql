-- Expose availability without exposing inventory quantities.
create schema if not exists meiro_private;
revoke all on schema meiro_private from public;
grant usage on schema meiro_private to anon, authenticated;
create or replace function meiro_private.variant_availability(p_variant_id uuid)
returns text
language sql stable security definer
set search_path = ''
as $function$
  select case
    when v.made_to_order then 'made_to_order'
    when not i.track_inventory then 'available'
    when i.quantity_on_hand - i.quantity_reserved <= 0 then 'sold_out'
    when i.quantity_on_hand - i.quantity_reserved <= i.low_stock_threshold then 'low_stock'
    else 'available'
  end
  from public.product_variants v
  join public.products p on p.id = v.product_id
  join public.inventory i on i.variant_id = v.id
  where v.id = p_variant_id
    and ((v.active and p.status = 'published') or public.is_meiro_admin())
$function$;
revoke all on function meiro_private.variant_availability(uuid) from public;
grant execute on function meiro_private.variant_availability(uuid) to anon, authenticated, service_role;
grant usage on schema meiro_private to service_role;
create or replace view public.variant_availability
with (security_invoker = true)
as select v.id as variant_id,
  meiro_private.variant_availability(v.id) as availability
from public.product_variants v
where meiro_private.variant_availability(v.id) is not null;
grant select on public.variant_availability to anon, authenticated;
