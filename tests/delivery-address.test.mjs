import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

test("saved delivery addresses reload per account; profile defaults remain unsaved and read errors propagate", async () => {
  const addresses = new Map(),
    profiles = new Map([
      ["a", { full_name: "Client A", phone: "11111111" }],
      ["b", { full_name: "Client B", phone: "22222222" }],
    ]);
  let readError = false;
  const db = {
    from(table) {
      let operation = "select",
        payload,
        filter;
      const query = {
        select() {
          return query;
        },
        eq(_column, id) {
          filter = id;
          return query;
        },
        update(value) {
          operation = "update";
          payload = value;
          return query;
        },
        async maybeSingle() {
          if (readError) return { data: null, error: new Error("read failed") };
          const row = addresses.get(filter);
          if (operation === "update" && row)
            addresses.set(filter, { ...row, ...payload });
          return {
            data:
              operation === "update"
                ? row
                  ? { user_id: filter }
                  : null
                : row
                  ? { ...row }
                  : null,
            error: null,
          };
        },
        async single() {
          return { data: profiles.get(filter), error: null };
        },
        async insert(value) {
          assert.equal(table, "customer_delivery_addresses");
          addresses.set(value.user_id, { ...value });
          return { error: null };
        },
      };
      return query;
    },
  };
  globalThis.__meiroAddressDb = db;
  const output = await build({
    stdin: {
      contents:
        "export {loadDeliveryAddress,saveDeliveryAddress} from './src/services/orders.ts';",
      resolveDir: process.cwd(),
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    plugins: [
      {
        name: "address-api",
        setup(b) {
          b.onLoad({ filter: /services\/supabase\.ts$/ }, () => ({
            contents: "export const supabase=globalThis.__meiroAddressDb;",
            loader: "js",
          }));
        },
      },
    ],
  });
  const file = path.resolve(`.address-test-${process.pid}.mjs`);
  await writeFile(file, output.outputFiles[0].text);
  try {
    const { loadDeliveryAddress, saveDeliveryAddress } = await import(
      pathToFileURL(file).href
    );
    let result = await loadDeliveryAddress("a");
    assert.equal(result.saved, false);
    assert.equal(result.address.recipient_name, "Client A");
    assert.equal(result.address.address_line, "");
    await saveDeliveryAddress("a", {
      ...result.address,
      district: "Хан-Уул",
      khoroo: 7,
      address_line: " Building 1 ",
      instructions: " Call first ",
    });
    result = await loadDeliveryAddress("a");
    assert.equal(result.saved, true);
    assert.equal(result.address.address_line, "Building 1");
    assert.equal(result.address.instructions, "Call first");
    const other = await loadDeliveryAddress("b");
    assert.equal(other.saved, false);
    assert.equal(other.address.recipient_name, "Client B");
    assert.equal(other.address.address_line, "");
    await saveDeliveryAddress("a", {
      ...result.address,
      address_line: "Building 2",
    });
    assert.equal(
      (await loadDeliveryAddress("a")).address.address_line,
      "Building 2",
    );
    assert.equal(addresses.size, 1);
    readError = true;
    await assert.rejects(() => loadDeliveryAddress("a"), /read failed/);
  } finally {
    delete globalThis.__meiroAddressDb;
    await unlink(file);
  }
});
