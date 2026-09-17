import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { build } from "esbuild";
import { writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

test("all public page templates render with real routes and honest preview states", async () => {
  const names = ["Home", "Catalogue", "Product", "Contact", "NotFound"];
  const output = await build({
    stdin: {
      contents: names
        .map(
          (name) =>
            `export { default as ${name} } from './src/pages/${name}.tsx';`,
        )
        .join("\n"),
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    jsx: "automatic",
    write: false,
    define: {
      "import.meta.env.VITE_CONTACT_ENDPOINT": '""',
      "import.meta.env.BASE_URL": '"/Meiro_site/"',
    },
  });
  const bundlePath = path.resolve(`.page-test-${process.pid}.mjs`);
  await writeFile(bundlePath, output.outputFiles[0].text);
  const pages = await import(pathToFileURL(bundlePath).href);
  try {
    const scenarios = [
      ["Home", "/", "/", "Өөрийн"],
      ["Catalogue", "/catalogue", "/catalogue", "Загварын жишээ"],
      [
        "Catalogue",
        "/catalogue?category=bags",
        "/catalogue",
        "Өдөр тутмын цүнх",
      ],
      ["Product", "/catalogue/everyday-bag", "/catalogue/:slug", "Үнэ удахгүй"],
      ["Product", "/catalogue/unknown", "/catalogue/:slug", "404"],
      ["Contact", "/contact", "/contact", "Зурвас илгээх"],
      ["NotFound", "/missing", "*", "404"],
    ];
    for (const [name, path, route, expected] of scenarios) {
      const Page = pages[name];
      const markup = renderToString(
        React.createElement(
          MemoryRouter,
          { initialEntries: [path] },
          React.createElement(
            Routes,
            null,
            React.createElement(Route, {
              path: route,
              element: React.createElement(Page),
            }),
          ),
        ),
      );
      assert.ok(
        markup.includes(expected),
        `${name} renders its expected content`,
      );
      if (name === "Home") {
        assert.ok(
          markup.includes('src="/Meiro_site/image_hero.png"'),
          "hero image respects the deployment base",
        );
      }
      if (path.includes("category=bags")) {
        assert.ok(
          !markup.includes("Картны гэр"),
          "category filter excludes other products",
        );
      }
      if (name === "Contact") {
        assert.match(
          markup,
          /disabled=""/,
          "sending is disabled without a delivery endpoint",
        );
      }
    }
  } finally {
    await unlink(bundlePath);
  }
});
