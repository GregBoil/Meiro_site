import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { contentSecurityPolicy, publicConfiguration } from "./build/security";

export default defineConfig(({ mode }) => {
  // This development branch must never connect to the production database.
  const env = publicConfiguration({
    VITE_SUPABASE_URL: "https://uiszpsemvkneeykhonzj.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_uZQ8dy8i4HUvhtUm3o5nyg_gI_iZ_b_",
    VITE_AUTH_EMAILS_ENABLED: "false",
    VITE_CONTACT_ENDPOINT: "",
  });
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
