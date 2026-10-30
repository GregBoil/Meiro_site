import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("primary addresses validate location and remain private, separate from existing delivery addresses", async () => {
  const db = new PGlite();
  const a = "00000000-0000-4000-8000-000000000001",
    b = "00000000-0000-4000-8000-000000000002";
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY); INSERT INTO auth.users VALUES('${a}'),('${b}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;
 CREATE TABLE public.customer_delivery_addresses(user_id uuid PRIMARY KEY,address_line text);INSERT INTO customer_delivery_addresses VALUES('${a}','Existing delivery');`);
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/20261030005953_customer_primary_addresses.sql", import.meta.url),
        "utf8",
      ),
    );
    assert.deepEqual(
      (
        await db.query(
          "SELECT address_line,address_source FROM customer_delivery_addresses",
        )
      ).rows,
      [{ address_line: "Existing delivery", address_source: "other" }],
    );
    await db.exec(
      `SET ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${a}',false);INSERT INTO customer_primary_addresses(user_id,district,khoroo,address_line) VALUES('${a}','Хан-Уул',5,'Main A')`,
    );
    await assert.rejects(
      () =>
        db.exec(
          `INSERT INTO customer_primary_addresses(user_id,district,khoroo,address_line) VALUES('${b}','Хан-Уул',5,'Wrong owner')`,
        ),
      /row-level security/,
    );
    for (const update of [
      "district='invalid'",
      "khoroo=0",
      "address_line=' '",
      "city='Darkhan'",
    ])
      await assert.rejects(
        () => db.exec(`UPDATE customer_primary_addresses SET ${update}`),
        /check constraint/,
      );
    await assert.rejects(
      () => db.exec(`UPDATE customer_primary_addresses SET user_id='${b}'`),
      /permission denied/,
    );
    await db.exec(`SELECT set_config('request.jwt.claim.sub','${b}',false)`);
    assert.equal(
      (await db.query("SELECT * FROM customer_primary_addresses")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          `UPDATE customer_primary_addresses SET address_line='overwrite' WHERE user_id='${a}' RETURNING user_id`,
        )
      ).rows.length,
      0,
    );
    await db.exec(
      `INSERT INTO customer_primary_addresses(user_id,district,khoroo,address_line) VALUES('${b}','Баянгол',1,'Main B')`,
    );
    assert.equal(
      (await db.query("SELECT address_line FROM customer_primary_addresses"))
        .rows[0].address_line,
      "Main B",
    );
    await db.exec("SET ROLE anon");
    await assert.rejects(
      () => db.query("SELECT * FROM customer_primary_addresses"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
