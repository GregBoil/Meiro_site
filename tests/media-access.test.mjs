import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("media RLS isolates unpublished metadata and protects registered files and product links", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA storage;
 CREATE FUNCTION public.is_meiro_admin() RETURNS boolean LANGUAGE sql AS $$SELECT coalesce(current_setting('test.admin',true),'false')='true'$$;
 CREATE TABLE products(id int PRIMARY KEY,status text); INSERT INTO products VALUES(1,'published'),(2,'draft');
 CREATE TABLE media(id int PRIMARY KEY,storage_path text UNIQUE); INSERT INTO media VALUES(1,'public.png'),(2,'draft.png'),(3,'unused.png'),(4,'slide.png'),(5,'hidden-slide.png');
 CREATE TABLE product_images(media_id int CONSTRAINT product_images_media_id_fkey REFERENCES media(id) ON DELETE CASCADE,product_id int REFERENCES products(id)); INSERT INTO product_images VALUES(1,1),(2,2);
 CREATE TABLE homepage_carousel(media_id int REFERENCES media(id) ON DELETE RESTRICT,active boolean); INSERT INTO homepage_carousel VALUES(4,true),(5,false);
 CREATE TABLE storage.buckets(id text,file_size_limit bigint,allowed_mime_types text[]); INSERT INTO storage.buckets(id) VALUES('product-images');
 CREATE TABLE storage.objects(name text,bucket_id text); INSERT INTO storage.objects VALUES('public.png','product-images'),('draft.png','product-images'),('unused.png','product-images'),('orphan.png','product-images');
 ALTER TABLE products ENABLE ROW LEVEL SECURITY; CREATE POLICY published ON products FOR SELECT TO anon,authenticated USING(status='published' OR is_meiro_admin());
 ALTER TABLE product_images ENABLE ROW LEVEL SECURITY; CREATE POLICY visible ON product_images FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM products p WHERE p.id=product_id));
 ALTER TABLE homepage_carousel ENABLE ROW LEVEL SECURITY; CREATE POLICY slides ON homepage_carousel FOR SELECT TO anon,authenticated USING(active OR is_meiro_admin());
 ALTER TABLE media ENABLE ROW LEVEL SECURITY; CREATE POLICY "Public can read media" ON media FOR SELECT TO anon,authenticated USING(true); CREATE POLICY admins ON media TO authenticated USING(is_meiro_admin()) WITH CHECK(is_meiro_admin());
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; CREATE POLICY admin_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(is_meiro_admin()); CREATE POLICY admin_update ON storage.objects FOR UPDATE TO authenticated USING(is_meiro_admin()) WITH CHECK(is_meiro_admin()); CREATE POLICY admin_delete ON storage.objects FOR DELETE TO authenticated USING(is_meiro_admin());
 GRANT USAGE ON SCHEMA public,storage TO anon,authenticated; GRANT SELECT ON products,product_images,homepage_carousel TO anon,authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON media,storage.objects TO anon,authenticated;`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261015072420_harden_media_access.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261015072510_allow_admin_media_storage_listing.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const ids = async () =>
      (await db.query("SELECT id FROM media ORDER BY id")).rows.map(
        (r) => r.id,
      );
    await db.exec("SET ROLE anon");
    assert.deepEqual(await ids(), [1, 4]);
    await assert.rejects(() =>
      db.exec("INSERT INTO media VALUES(6,'attack.png')"),
    );
    await db.exec(
      "SET ROLE authenticated; SELECT set_config('test.admin','false',false)",
    );
    assert.deepEqual(await ids(), [1, 4]);
    assert.equal(
      (await db.query("DELETE FROM media RETURNING id")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("DELETE FROM storage.objects RETURNING name")).rows
        .length,
      0,
    );
    await db.exec("SELECT set_config('test.admin','true',false)");
    assert.deepEqual(await ids(), [1, 2, 3, 4, 5]);
    for (const id of [1, 2, 4, 5])
      await assert.rejects(
        () => db.exec(`DELETE FROM media WHERE id=${id}`),
        /foreign key/,
      );
    assert.equal(
      (
        await db.query(
          "DELETE FROM storage.objects WHERE name='public.png' RETURNING name",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "UPDATE storage.objects SET name='changed.png' WHERE name='draft.png' RETURNING name",
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      () =>
        db.query(
          "UPDATE storage.objects SET name='unused.png' WHERE name='orphan.png' RETURNING name",
        ),
      /row-level security/,
    );
    await db.exec("DELETE FROM media WHERE id=3");
    assert.equal(
      (
        await db.query(
          "DELETE FROM storage.objects WHERE name='unused.png' RETURNING name",
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "DELETE FROM storage.objects WHERE name='orphan.png' RETURNING name",
        )
      ).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
