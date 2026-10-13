import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { build } from "esbuild";
import { writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

test("basket navigation is hidden for guests and uses an accessible icon after login", async () => {
  const output = await build({
    stdin: { contents: "export {default as Layout} from './src/components/Layout.tsx'; export {default as Cart} from './src/pages/Cart.tsx';", resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, platform: "node", format: "esm", packages: "external", jsx: "automatic", write: false,
    define: { "import.meta.env.BASE_URL": '"/Meiro_site/"' },
    plugins: [{ name: "session-fixtures", setup(builder) {
      builder.onLoad({filter: /auth\/AuthProvider\.tsx$/}, () => ({
        contents: "export const useAuth=()=>globalThis.__meiroCartAuth;",
        loader: "js"
      }));
      builder.onLoad({filter: /commerce\/CartProvider\.tsx$/}, () => ({
        contents: "export const useCart=()=>({count:2,items:[],storageFailed:false,changeQuantity(){},remove(){}});",
        loader: "js"
      }));
      builder.onLoad({filter: /services\/products\.ts$/}, () => ({
        contents: "export async function getPublishedProducts(){return [];}",
        loader: "js"
      }));
    }}]
  });
  const file = path.resolve(`.cart-access-${process.pid}.mjs`);
  await writeFile(file, output.outputFiles[0].text);
  try {
    const {Layout,Cart} = await import(pathToFileURL(file).href);
    const render = Page => renderToString(React.createElement(MemoryRouter,null,React.createElement(Page)));
    globalThis.__meiroCartAuth = {session:null,loading:false};
    assert.ok(!render(Layout).includes('href="/cart"'));
    assert.ok(!render(Cart).includes("Таны сагс хоосон байна."));
    globalThis.__meiroCartAuth = {session:{user:{id:"client"}},loading:false};
    const header = render(Layout);
    assert.ok(header.includes('href="/cart"'));
    assert.ok(header.includes('aria-label="Миний сагс, 2 бүтээл"'));
    assert.ok(header.includes("lucide-shopping-cart"));
    assert.ok(!header.includes(">Сагс"));
    assert.ok(render(Cart).includes("Таны сагс хоосон байна."));
    globalThis.__meiroCartAuth = {session:null,loading:true};
    assert.ok(render(Cart).includes("Уншиж байна…"));
    assert.ok(!render(Layout).includes('href="/cart"'));
  } finally {
    delete globalThis.__meiroCartAuth;
    await unlink(file);
  }
});
