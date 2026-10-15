import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { contentSecurityPolicy, publicConfiguration } from "./build/security";

export default defineConfig(({ mode }) => {
  const env = publicConfiguration(loadEnv(mode, process.cwd(), "VITE_"));
  return {
    plugins: [
      react(),
      {
        name: "meiro-browser-security",
        apply: "build",
        transformIndexHtml: {
          order: "pre",
          handler: () => [
            {
              tag: "meta",
              attrs: {
                "http-equiv": "Content-Security-Policy",
                content: contentSecurityPolicy(env.VITE_SUPABASE_URL),
              },
              injectTo: "head-prepend",
            },
          ],
        },
      },
    ],
    envPrefix: [],
    define: Object.fromEntries(
      Object.entries(env).map(([name, value]) => [
        `import.meta.env.${name}`,
        JSON.stringify(value),
      ]),
    ),
    base: mode === "github-pages" ? "/Meiro_site/" : "/",
    build: { sourcemap: false },
  };
});
