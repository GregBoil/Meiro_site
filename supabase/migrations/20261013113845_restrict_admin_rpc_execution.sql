-- Keep internal admin checks; limit invocation to signed-in roles.
REVOKE ALL ON FUNCTION public.admin_adjust_inventory(uuid,integer,integer,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_inventory(uuid,integer,integer,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_change_product_internal_reference(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_change_product_internal_reference(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_product(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_product_variant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_product_variant(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_remove_product_image(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_product_image(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_save_product(uuid,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_product(uuid,jsonb,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_set_primary_product_image(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_primary_product_image(uuid) TO authenticated;
-- Trigger functions are not application RPC endpoints.
REVOKE ALL ON FUNCTION public.create_variant_inventory() FROM PUBLIC, anon, authenticated;
