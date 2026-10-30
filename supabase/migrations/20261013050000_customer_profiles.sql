-- Meiro : profils clients. À exécuter une fois dans Supabase SQL Editor
-- avec le rôle postgres. Ne modifie pas le catalogue.
-- Si profiles existe déjà, la transaction échoue sans l'écraser.
BEGIN;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_full_name_length CHECK (
    full_name IS NULL OR char_length(full_name) BETWEEN 1 AND 200
  ),
  CONSTRAINT profiles_phone_length CHECK (
    phone IS NULL OR char_length(phone) BETWEEN 1 AND 40
  )
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Les clients peuvent consulter leur profil et modifier ces deux champs.
-- La création des profils appartient au trigger, pas au navigateur.
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, phone) ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE FUNCTION public.meiro_profiles_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.meiro_profiles_set_updated_at()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER meiro_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.meiro_profiles_set_updated_at();

CREATE FUNCTION public.meiro_create_customer_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Aucun champ obligatoire supplémentaire ne bloque l'inscription.
  -- Nom et téléphone seront renseignés après connexion.
  INSERT INTO public.profiles (id) VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.meiro_create_customer_profile()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER meiro_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.meiro_create_customer_profile();

-- Ajouter aussi un profil aux éventuels comptes déjà présents.
INSERT INTO public.profiles (id)
  SELECT id FROM auth.users
  ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Résultat de contrôle : rls_enabled doit être true,
-- profiles_count doit être égal à auth_users_count.
SELECT
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.profiles'::regclass) AS rls_enabled,
  (SELECT count(*) FROM public.profiles) AS profiles_count,
  (SELECT count(*) FROM auth.users) AS auth_users_count;
