const publicNames = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_AUTH_EMAILS_ENABLED",
  "VITE_CONTACT_ENDPOINT",
] as const;

// An explicit allowlist prevents unrelated VITE_* secrets entering the bundle.
export function publicConfiguration(env: Record<string, string>) {
  const values = Object.fromEntries(
    publicNames.map((name) => [name, env[name] ?? ""]),
  );
  const url = values.VITE_SUPABASE_URL;
  const key = values.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!!url !== !!key)
    throw new Error(
      "Supabase frontend configuration requires both URL and public key.",
    );
  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("Invalid Supabase URL.");
    }
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      parsed.pathname !== "/"
    ) {
      throw new Error(
        "Supabase URL must be an HTTPS origin without credentials or parameters.",
      );
    }
    let isPublic =
      key.startsWith("sb_publishable_") &&
      key.length > "sb_publishable_".length;
    if (!isPublic && key.split(".").length === 3) {
      try {
        isPublic =
          JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
            .role === "anon";
      } catch {
        /* Reject malformed keys. */
      }
    }
    if (!isPublic)
      throw new Error(
        "Only a Supabase publishable or legacy anon key may be used in the frontend.",
      );
  }
  const endpoint = values.VITE_CONTACT_ENDPOINT;
  if (
    endpoint &&
    (!endpoint.startsWith("/") ||
      endpoint.startsWith("//") ||
      /[\\\s?#]/.test(endpoint))
  ) {
    throw new Error(
      "Contact endpoint must be a same-origin absolute path without parameters.",
    );
  }
  return values;
}

export function contentSecurityPolicy(supabaseUrl: string) {
  const origin = supabaseUrl ? new URL(supabaseUrl).origin : "";
  return [
    "default-src 'self'",
    "script-src 'self'",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-elem 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${origin}`.trim(),
    `connect-src 'self' ${origin} ${origin.replace(/^https:/, "wss:")}`.trim(),
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-src 'none'",
    "worker-src 'none'",
  ].join("; ");
}
