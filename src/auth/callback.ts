export const invalidAuthLinkMessage =
  "Энэ холбоос хүчингүй эсвэл хугацаа нь дууссан байна. Шинэ холбоос авна уу.";

// Consume Supabase's token fragment before HashRouter can treat it as a route.
// The SDK validates and stores the session; this helper never handles tokens itself.
export async function prepareAuthCallback(options: {
  url: string;
  hashRouting: boolean;
  initialize: () => Promise<{ error: unknown }>;
  replace: (url: string) => void;
}): Promise<string | null> {
  const url = new URL(options.url);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const isCallback =
    ["access_token", "refresh_token", "error", "error_code"].some((key) =>
      fragment.has(key),
    ) ||
    url.searchParams.has("code") ||
    url.searchParams.has("error");
  if (!isCallback) return null;

  let failed =
    fragment.has("error") ||
    fragment.has("error_code") ||
    url.searchParams.has("error");
  try {
    const { error } = await options.initialize();
    failed ||= !!error;
  } catch {
    failed = true;
  }
  const route = failed
    ? "/account/login"
    : fragment.get("type") === "recovery"
      ? "/account/reset-password"
      : "/account";
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  if (options.hashRouting) url.hash = route;
  else {
    url.pathname = route;
    url.hash = "";
  }
  options.replace(url.href);
  return failed ? invalidAuthLinkMessage : null;
}
