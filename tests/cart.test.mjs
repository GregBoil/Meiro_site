import test from "node:test";
import assert from "node:assert/strict";
import { loadCart, saveCart } from "../src/commerce/cart.ts";

function storage(value = null) {
  globalThis.localStorage = {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
  };
}

test("cart survives a persistence round trip", () => {
  storage();
  const items = [{ productId: "one", variantId: null, quantity: 2 }];
  assert.equal(saveCart(items), true);
  assert.deepEqual(loadCart(), items);
});

test("corrupt storage falls back to an empty cart", () => {
  storage("{bad json");
  assert.deepEqual(loadCart(), []);
  storage('{"not":"an array"}');
  assert.deepEqual(loadCart(), []);
});

test("invalid quantities and variants are discarded", () => {
  storage(
    JSON.stringify([
      { productId: "one", variantId: null, quantity: -1 },
      { productId: "one", variantId: null, quantity: 1.5 },
      { productId: "one", variantId: 12, quantity: 1 },
      null,
      { productId: "two", variantId: "brown", quantity: 1 },
    ]),
  );
  assert.deepEqual(loadCart(), [
    { productId: "two", variantId: "brown", quantity: 1 },
  ]);
});

test("unavailable storage is handled without crashing", () => {
  globalThis.localStorage = {
    getItem() {
      throw new Error("unavailable");
    },
    setItem() {
      throw new Error("quota exceeded");
    },
  };
  assert.deepEqual(loadCart(), []);
  assert.equal(saveCart([]), false);
});
