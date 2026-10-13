import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareAuthCallback,
  invalidAuthLinkMessage,
} from "../src/auth/callback.ts";

test("ordinary hash routes are not consumed as authentication links", async () => {
  let initialized = false;
  await prepareAuthCallback({
    url: "https://example.com/Meiro_site/#/catalogue",
    hashRouting: true,
    initialize: async () => {
      initialized = true;
      return { error: null };
    },
    replace: () => assert.fail("ordinary route should remain unchanged"),
  });
  assert.equal(initialized, false);
});

test("recovery waits for SDK validation, removes credentials and keeps the Pages base", async () => {
  let validated = false;
  let replaced = "";
  const result = await prepareAuthCallback({
    url: "https://example.com/Meiro_site/#access_token=test-secret&refresh_token=test-refresh&type=recovery",
    hashRouting: true,
    initialize: async () => {
      await Promise.resolve();
      validated = true;
      return { error: null };
    },
    replace: (url) => {
      assert.ok(validated);
      replaced = url;
    },
  });
  assert.equal(result, null);
  assert.equal(
    replaced,
    "https://example.com/Meiro_site/#/account/reset-password",
  );
});

test("email confirmation opens the account in browser routing", async () => {
  let replaced;
  await prepareAuthCallback({
    url: "https://example.com/#access_token=test&refresh_token=test&type=signup",
    hashRouting: false,
    initialize: async () => ({ error: null }),
    replace: (url) => {
      replaced = url;
    },
  });
  assert.equal(replaced, "https://example.com/account");
});

for (const [label, initialize] of [
  ["SDK validation error", async () => ({ error: new Error("Invalid token") })],
  [
    "network error",
    async () => {
      throw new Error("Offline");
    },
  ],
]) {
  test(`${label} opens login with feedback instead of the password form`, async () => {
    let replaced;
    const result = await prepareAuthCallback({
      url: "https://example.com/Meiro_site/#access_token=bad&refresh_token=bad&type=recovery",
      hashRouting: true,
      initialize,
      replace: (url) => {
        replaced = url;
      },
    });
    assert.equal(result, invalidAuthLinkMessage);
    assert.equal(replaced, "https://example.com/Meiro_site/#/account/login");
  });
}

test("expired links clear provider errors from the address bar", async () => {
  let replaced;
  const result = await prepareAuthCallback({
    url: "https://example.com/Meiro_site/?error=access_denied&error_code=otp_expired&error_description=detail",
    hashRouting: true,
    initialize: async () => ({ error: null }),
    replace: (url) => {
      replaced = url;
    },
  });
  assert.equal(result, invalidAuthLinkMessage);
  assert.equal(replaced, "https://example.com/Meiro_site/#/account/login");
});
