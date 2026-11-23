CREATE OR REPLACE FUNCTION public.admin_change_product_internal_reference(p_product_id uuid, p_new_reference text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_old_reference text;
  v_new_reference text;
  v_constraint text;
begin
  if not public.is_meiro_admin() then
    raise exception 'Unauthorized';
  end if;

  v_new_reference := upper(trim(p_new_reference));

  if coalesce(v_new_reference, '') = '' then
    raise exception 'Internal reference cannot be empty';
  end if;

  -- Verrouiller le produit et récupérer son ancien code
  select upper(trim(internal_reference))
  into v_old_reference
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  -- Rien à faire si le code n'a pas réellement changé
  if v_old_reference = v_new_reference then
    return;
  end if;

  -- Vérifier que le nouveau code produit est disponible
  if exists (
    select 1
    from public.products
    where id <> p_product_id
      and upper(internal_reference) = v_new_reference
  ) then
    raise exception 'Product internal reference already exists';
  end if;

  -- Verrouiller les variantes concernées
  perform id
  from public.product_variants
  where product_id = p_product_id
  for update;

  -- Strip an existing prefix only when it actually matches the stored SKU.
  -- Older variants store their full code without the product reference.
  begin
    update public.product_variants
    set sku = v_new_reference || '-' ||
      case
        when starts_with(upper(trim(sku)), v_old_reference || '-')
          then substring(upper(trim(sku)) from length(v_old_reference) + 2)
        else upper(trim(sku))
      end
    where product_id = p_product_id;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'product_variants_sku_key' then
      raise exception 'A resulting variant code already exists' using errcode = '23505';
    end if;
    raise;
  end;

  -- Enfin renommer le produit
  update public.products
  set internal_reference = v_new_reference
  where id = p_product_id;

end;
$function$;
