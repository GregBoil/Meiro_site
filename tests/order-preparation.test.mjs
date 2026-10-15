import { PGlite } from "@electric-sql/pglite";
import test from "node:test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
test("order preparation enforces server prices, delivery scope and customer/admin isolation", async () => {
  const db = new PGlite();
  try {
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002",
      p = "10000000-0000-4000-8000-000000000001",
      v = "20000000-0000-4000-8000-000000000001",
      m = "20000000-0000-4000-8000-000000000002";
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE FUNCTION public.is_meiro_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.is_admin',true),'false')='true' $$;
CREATE TABLE public.products(id uuid PRIMARY KEY,name text,status text);
CREATE TABLE public.product_variants(id uuid PRIMARY KEY,product_id uuid REFERENCES public.products(id),name text,sku text,price integer,active boolean,made_to_order boolean,lead_time_days integer);
CREATE TABLE public.inventory(variant_id uuid PRIMARY KEY REFERENCES public.product_variants(id),track_inventory boolean,quantity_on_hand integer,quantity_reserved integer);
INSERT INTO auth.users VALUES ('${a}'),('${b}');
INSERT INTO products VALUES ('${p}','Wallet','published');
INSERT INTO product_variants VALUES ('${v}','${p}','Brown','W-B',50000,true,false,NULL),('${m}','${p}','Custom','W-C',70000,true,true,7);
INSERT INTO inventory VALUES ('${v}',true,3,1),('${m}',true,0,0);`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261013080000_order_preparation.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(`INSERT INTO orders(user_id,items_subtotal_mnt,delivery_fee_mnt,recipient_name,phone,city,district,khoroo,address_line) VALUES ('${a}',50000,5000,'A','99999999','Ulaanbaatar','Хан-Уул',1,'Address A'),('${b}',70000,5000,'B','88888888','Ulaanbaatar','Хан-Уул',1,'Address B');
INSERT INTO order_items(order_id,product_id,variant_id,product_name,variant_name,sku,unit_price_mnt,quantity) SELECT id,'${p}','${v}','Wallet','Brown','W-B',50000,1 FROM orders;
SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${a}',false);`);
    async function preview(items, city = "Ulaanbaatar") {
      return (
        await db.query(
          "SELECT public.meiro_checkout_preview($1::jsonb,$2) AS data",
          [JSON.stringify(items), city],
        )
      ).rows[0].data;
    }
    const item = { productId: p, variantId: v, quantity: 2, priceMnt: 1 };
    let q = await preview([item]);
    assert.equal(q.items_subtotal_mnt, 100000);
    assert.equal(q.total_mnt, null);
    assert.equal(q.checkout_enabled, false);
    assert.equal(q.all_items_available, true);
    assert.ok(!("quantity_on_hand" in q.items[0]));
    q = await preview([{ ...item, quantity: 3 }]);
    assert.equal(q.all_items_available, false);
    assert.equal(q.items_subtotal_mnt, 0);
    q = await preview([{ ...item, variantId: m, quantity: 2 }]);
    assert.equal(q.all_items_available, true);
    assert.equal(q.items_subtotal_mnt, 140000);
    assert.equal(q.items[0].lead_time_days, 7);
    q = await preview([
      { ...item, quantity: 1 },
      { ...item, quantity: 1 },
    ]);
    assert.equal(q.items.length, 1);
    assert.equal(q.items[0].quantity, 2);
    await assert.rejects(() => preview([item], "Darkhan"));
    await assert.rejects(() => preview([]));
    await assert.rejects(() => preview([{ ...item, quantity: 100 }]));
    await assert.rejects(() =>
      db.exec("UPDATE shipping_settings SET delivery_fee_mnt=1"),
    );
    await assert.rejects(() =>
      db.exec(
        `INSERT INTO orders(user_id,items_subtotal_mnt,delivery_fee_mnt,recipient_name,phone,city,district,khoroo,address_line) VALUES ('${a}',1,1,'A','99','Ulaanbaatar','Хан-Уул',1,'Address')`,
      ),
    );
    assert.equal((await db.query("SELECT * FROM orders")).rows.length, 1);
    assert.equal((await db.query("SELECT * FROM order_items")).rows.length, 1);
    await db.exec(
      `INSERT INTO customer_delivery_addresses VALUES ('${a}','A','99999999','Ulaanbaatar','Хан-Уул',1,'Address','')`,
    );
    await assert.rejects(() =>
      db.exec(
        `INSERT INTO customer_delivery_addresses VALUES ('${b}','B','88888888','Ulaanbaatar','Хан-Уул',1,'Other','')`,
      ),
    );
    await assert.rejects(() =>
      db.exec(`UPDATE customer_delivery_addresses SET city='Darkhan'`),
    );
    await db.exec(
      `UPDATE customer_delivery_addresses SET address_line='New address' WHERE user_id='${a}'`,
    );
    assert.equal(
      (await db.query("SELECT address_line FROM customer_delivery_addresses"))
        .rows[0].address_line,
      "New address",
    );
    await db.exec(`SELECT set_config('request.jwt.claim.sub','${b}',false);`);
    assert.equal(
      (await db.query("SELECT * FROM customer_delivery_addresses")).rows.length,
      0,
    );
    await db.exec(`SELECT set_config('test.is_admin','true',false);`);
    assert.equal((await db.query("SELECT * FROM orders")).rows.length, 2);
    assert.equal((await db.query("SELECT * FROM order_items")).rows.length, 2);
    await db.exec(
      `RESET ROLE; UPDATE shipping_settings SET delivery_fee_mnt=5000; UPDATE product_variants SET price=55000 WHERE id='${v}'; SET ROLE authenticated;`,
    );
    q = await preview([item]);
    assert.equal(q.items_subtotal_mnt, 110000);
    assert.equal(q.total_mnt, 115000);
    assert.equal(q.checkout_enabled, false);
    await db.exec("SET ROLE anon");
    await assert.rejects(() => preview([item]));
  } finally {
    await db.close();
  }
});
