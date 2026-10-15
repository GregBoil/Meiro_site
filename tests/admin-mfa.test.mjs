import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("admin MFA activation requires enrollment and denies aal1 across existing admin policies", async () => {
  const db = new PGlite();
  const a = "00000000-0000-0000-0000-000000000001";
  const b = "00000000-0000-0000-0000-000000000002";
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      CREATE TABLE auth.mfa_factors(user_id uuid, factor_type text, status text);
      CREATE TABLE public.admin_profiles(id uuid, active boolean);
      INSERT INTO admin_profiles VALUES ('${a}',true),('${b}',true);
      CREATE TABLE public.inventory(id int); INSERT INTO inventory VALUES(1);
      CREATE FUNCTION public.is_meiro_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.admin_profiles WHERE id=auth.uid() AND active)$$;
      ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
      CREATE POLICY admins ON inventory TO authenticated USING(public.is_meiro_admin());
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT SELECT ON inventory TO authenticated;
    `);
    const identity = await readFile(
      new URL(
        "../supabase/migrations/20261013095645_admin_mfa_identity.sql",
        import.meta.url,
      ),
      "utf8",
    );
    const strict = await readFile(
      new URL(
        "../supabase/migrations/20261013095653_require_admin_mfa.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(identity);
    await assert.rejects(() => db.exec(strict), /Enroll TOTP/);
    await db.exec(
      `INSERT INTO auth.mfa_factors VALUES ('${a}','totp','verified')`,
    );
    await assert.rejects(() => db.exec(strict), /Enroll TOTP/);
    await db.exec(
      `INSERT INTO auth.mfa_factors VALUES ('${b}','totp','verified')`,
    );
    await db.exec(strict);
    await db.exec(
      `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${a}',false); SELECT set_config('request.jwt.claims','{"aal":"aal1"}',false)`,
    );
    assert.equal(
      (await db.query("SELECT meiro_is_admin_account() AS ok")).rows[0].ok,
      true,
    );
    assert.equal(
      (await db.query("SELECT is_meiro_admin() AS ok")).rows[0].ok,
      false,
    );
    assert.equal((await db.query("SELECT * FROM inventory")).rows.length, 0);
    await db.exec(
      `SELECT set_config('request.jwt.claims','{"aal":"aal2"}',false)`,
    );
    assert.equal((await db.query("SELECT * FROM inventory")).rows.length, 1);
    await db.exec(
      `SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false)`,
    );
    assert.equal(
      (await db.query("SELECT is_meiro_admin() AS ok")).rows[0].ok,
      false,
    );
    await db.exec(
      `RESET ROLE; UPDATE admin_profiles SET active=false WHERE id='${a}'; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${a}',false)`,
    );
    assert.equal(
      (await db.query("SELECT is_meiro_admin() AS ok")).rows[0].ok,
      false,
    );
    await db.exec("SET ROLE anon");
    await assert.rejects(() => db.query("SELECT meiro_is_admin_account()"));
  } finally {
    await db.close();
  }
});
