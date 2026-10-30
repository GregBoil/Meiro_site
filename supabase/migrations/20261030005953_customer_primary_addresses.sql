CREATE TABLE public.customer_primary_addresses (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  city text NOT NULL DEFAULT 'Ulaanbaatar' CHECK (city = 'Ulaanbaatar'),
  district text NOT NULL CHECK (district IN ('Баянгол','Баянзүрх','Сүхбаатар','Сонгинохайрхан','Хан-Уул','Чингэлтэй','Налайх','Багануур','Багахангай')),
  khoroo integer NOT NULL CHECK (khoroo BETWEEN 1 AND 100),
  address_line text NOT NULL CHECK (char_length(trim(address_line)) BETWEEN 1 AND 1000),
  instructions text NOT NULL DEFAULT '' CHECK (char_length(instructions) <= 1000)
);
ALTER TABLE public.customer_primary_addresses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_primary_addresses FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.customer_primary_addresses TO authenticated;
GRANT UPDATE (city,district,khoroo,address_line,instructions) ON public.customer_primary_addresses TO authenticated;
GRANT ALL ON public.customer_primary_addresses TO service_role;
CREATE POLICY primary_address_select_own ON public.customer_primary_addresses FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY primary_address_insert_own ON public.customer_primary_addresses FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY primary_address_update_own ON public.customer_primary_addresses FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
ALTER TABLE public.customer_delivery_addresses ADD COLUMN address_source text NOT NULL DEFAULT 'other' CHECK (address_source IN ('primary','other'));
GRANT UPDATE (address_source) ON public.customer_delivery_addresses TO authenticated;
-- Existing saved delivery addresses remain unchanged and are marked as 'other'.
