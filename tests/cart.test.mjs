import test from "node:test";
import assert from "node:assert/strict";
import {
  cartStorageKey,
  loadCart,
  saveCart,
  normalizeCart,
  addCartItem,
  changeCartQuantity,
  resolveCart,
} from "../src/commerce/cart.ts";

function storage(value = null) {
  globalThis.localStorage = {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
  };
}

const product = {
  id: "one",
  isPlaceholder: false,
  variants: [
    { id: "brown", priceMnt: 50000, stock: null, availability: "available" },
    { id: "black", priceMnt: 60000, stock: null, availability: "sold_out" },
    { id: "custom", priceMnt: 70000, stock: 0, availability: "made_to_order" },
  ],
};

test("duplicates merge, variants remain distinct, and quantities stay bounded", () => {
  const item = { productId: "one", variantId: "brown", quantity: 2 };
  const cart = addCartItem([item], { ...item, quantity: 3 });
  assert.deepEqual(cart, [{ ...item, quantity: 5 }]);
  assert.equal(
    addCartItem(cart, { ...item, variantId: "black", quantity: 1 }).length,
    2,
  );
  assert.equal(
    normalizeCart([{ ...item, quantity: 99 }, item])[0].quantity,
    99,
  );
  assert.deepEqual(normalizeCart([{ ...item, productId: "" }]), []);
});

test("quantity edits reject malformed values and preserve other variants", () => {
  const items = [
    { productId: "one", variantId: "brown", quantity: 2 },
    { productId: "one", variantId: "custom", quantity: 1 },
  ];
  for (const qty of [0, -1, 100, NaN, 1.5])
    assert.deepEqual(changeCartQuantity(items, "one", "brown", qty), items);
  assert.deepEqual(changeCartQuantity(items, "one", "brown", 4), [
    { ...items[0], quantity: 4 },
    items[1],
  ]);
});

test("totals use current prices rather than browser-supplied prices", () => {
  const items = [
    { productId: "one", variantId: "brown", quantity: 2, priceMnt: 1 },
  ];
  assert.equal(resolveCart(items, [product])[0].subtotal, 100000);
  const updated = {
    ...product,
    variants: [{ ...product.variants[0], priceMnt: 55000 }],
  };
  assert.equal(resolveCart(items, [updated])[0].subtotal, 110000);
});

test("removed, sold-out, unpriced and unknown variants are excluded from totals", () => {
  for (const id of ["black", "deleted", null])
    assert.equal(
      resolveCart(
        [{ productId: "one", variantId: id, quantity: 1 }],
        [product],
      )[0].subtotal,
      null,
    );
  for (const changes of [
    { priceMnt: null },
    { priceMnt: Infinity },
    { priceMnt: -1 },
    { availability: null },
  ]) {
    const altered = {
      ...product,
      variants: [{ ...product.variants[0], ...changes }],
    };
    assert.equal(
      resolveCart(
        [{ productId: "one", variantId: "brown", quantity: 1 }],
        [altered],
      )[0].available,
      false,
    );
  }
  assert.equal(
    resolveCart(
      [{ productId: "deleted", variantId: "brown", quantity: 1 }],
      [product],
    )[0].subtotal,
    null,
  );
});

test("made-to-order permits zero stock while tracked stock limits quantities", () => {
  assert.equal(
    resolveCart(
      [{ productId: "one", variantId: "custom", quantity: 2 }],
      [product],
    )[0].subtotal,
    140000,
  );
  const limited = {
    ...product,
    variants: [{ ...product.variants[0], stock: 1 }],
  };
  assert.equal(
    resolveCart(
      [{ productId: "one", variantId: "brown", quantity: 2 }],
      [limited],
    )[0].available,
    false,
  );
});

test("cart survives a persistence round trip", () => {
  storage();
  const items = [{ productId: "one", variantId: null, quantity: 2 }];
  assert.equal(saveCart("client-a", items), true);
  assert.deepEqual(loadCart("client-a"), items);
});

test("corrupt storage falls back to an empty cart", () => {
  storage("{bad json");
  assert.deepEqual(loadCart("client-a"), []);
  storage('{"not":"an array"}');
  assert.deepEqual(loadCart("client-a"), []);
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
  assert.deepEqual(loadCart("client-a"), [
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
  assert.deepEqual(loadCart("client-a"), []);
  assert.equal(saveCart("client-a", []), false);
});

test("account carts stay separate and never import the unattributed legacy cart", () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const a = [{ productId: "one", variantId: "brown", quantity: 2 }];
  const b = [{ productId: "two", variantId: "black", quantity: 1 }];
  values.set("meiro.cart.v1", JSON.stringify(a));
  assert.deepEqual(loadCart("client-a"), []);
  assert.deepEqual(loadCart("client-b"), []);
  saveCart("client-a", a);
  saveCart("client-b", b);
  assert.notEqual(cartStorageKey("client-a"), cartStorageKey("client-b"));
  assert.deepEqual(loadCart("client-a"), a);
  assert.deepEqual(loadCart("client-b"), b);
  saveCart("client-b", []);
  assert.deepEqual(loadCart("client-a"), a);
});
