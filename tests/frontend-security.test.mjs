import test from "node:test";
import assert from "node:assert/strict";
import {
  publicConfiguration,
  contentSecurityPolicy,
} from "../build/security.ts";
const config = {
  VITE_SUPABASE_URL: "https://meiro.example",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};
const jwt = (role) =>
  "header." +
  Buffer.from(JSON.stringify({ role })).toString("base64url") +
  ".signature";
test("build configuration rejects privileged keys and limits public environment variables", () => {
  assert.equal(
    publicConfiguration({ ...config, VITE_PRIVATE_SECRET: "never ship this" })
      .VITE_PRIVATE_SECRET,
    undefined,
  );
  assert.equal(
    publicConfiguration({
      ...config,
      VITE_SUPABASE_PUBLISHABLE_KEY: jwt("anon"),
    }).VITE_SUPABASE_PUBLISHABLE_KEY,
    jwt("anon"),
  );
  for (const key of [
    "sb_secret_test",
    jwt("service_role"),
    jwt("authenticated"),
    "malformed",
    "sb_publishable_",
  ])
    assert.throws(
      () =>
        publicConfiguration({ ...config, VITE_SUPABASE_PUBLISHABLE_KEY: key }),
      /Only a Supabase/,
    );
  for (const url of [
    "http://meiro.example",
    "https://user:secret@meiro.example",
    "https://meiro.example/path",
    "https://meiro.example?secret=token",
    "not a url",
  ])
    assert.throws(() =>
      publicConfiguration({ ...config, VITE_SUPABASE_URL: url }),
    );
  assert.throws(() =>
    publicConfiguration({ VITE_SUPABASE_URL: config.VITE_SUPABASE_URL }),
  );
  assert.equal(publicConfiguration({}).VITE_SUPABASE_URL, "");
});
test("contact configuration permits only same-origin routes", () => {
  assert.equal(
    publicConfiguration({ ...config, VITE_CONTACT_ENDPOINT: "/api/contact" })
      .VITE_CONTACT_ENDPOINT,
    "/api/contact",
  );
  for (const endpoint of [
    "https://other.example",
    "//other.example",
    "/\\other.example",
    "api/contact",
    "/api/contact?token=test",
    "/api/ contact",
  ])
    assert.throws(() =>
      publicConfiguration({ ...config, VITE_CONTACT_ENDPOINT: endpoint }),
    );
});
test("production CSP blocks script injection and limits network traffic while retaining MFA images", () => {
  const policy = contentSecurityPolicy(config.VITE_SUPABASE_URL);
  const directives = Object.fromEntries(
    policy.split("; ").map((value) => {
      const [name, ...sources] = value.split(" ");
      return [name, sources];
    }),
  );
  assert.deepEqual(directives["script-src"], ["'self'"]);
  assert.deepEqual(directives["connect-src"], [
    "'self'",
    "https://meiro.example",
    "wss://meiro.example",
  ]);
  assert.ok(directives["img-src"].includes("data:"));
  assert.ok(directives["img-src"].includes("https://meiro.example"));
  for (const name of [
    "object-src",
    "base-uri",
    "frame-src",
    "worker-src",
    "script-src-attr",
  ])
    assert.deepEqual(directives[name], ["'none'"]);
  assert.ok(!policy.includes("unsafe-eval"));
  assert.ok(!policy.includes("frame-ancestors")); // Unsupported in a meta CSP.
});
