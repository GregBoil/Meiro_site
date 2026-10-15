import type { CartItem } from "./types";
import type { Product, ProductVariant } from "../data/products";
// The former shared v1 cart cannot be attributed to a user and is never imported.
export function cartStorageKey(userId: string): string {
  return `meiro.cart.v2.${userId}`;
}
export const MAX_QUANTITY = 99;

export function normalizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const items = new Map<string, CartItem>();
  for (const item of value) {
    if (
      typeof item?.productId !== "string" ||
      !item.productId ||
      !(
        item.variantId === null ||
        (typeof item.variantId === "string" && item.variantId)
      ) ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      item.quantity > MAX_QUANTITY
    )
      continue;
    const key = JSON.stringify([item.productId, item.variantId]);
    const previous = items.get(key);
    items.set(key, {
      productId: item.productId,
      variantId: item.variantId,
      quantity: Math.min(
        MAX_QUANTITY,
        (previous?.quantity ?? 0) + item.quantity,
      ),
    });
  }
  return [...items.values()];
}

export function canPurchaseVariant(
  variant: ProductVariant | null | undefined,
): boolean {
  return (
    !!variant &&
    typeof variant.priceMnt === "number" &&
    Number.isFinite(variant.priceMnt) &&
    variant.priceMnt >= 0 &&
    ["available", "low_stock", "made_to_order"].includes(
      variant.availability ?? "",
    )
  );
}

export function quantityLimit(variant: ProductVariant): number {
  if (variant.availability === "made_to_order" || variant.stock === null)
    return MAX_QUANTITY;
  return Math.min(MAX_QUANTITY, Math.max(0, Math.floor(variant.stock)));
}

export function addCartItem(items: CartItem[], item: CartItem): CartItem[] {
  return normalizeCart([...items, item]);
}

export function changeCartQuantity(
  items: CartItem[],
  productId: string,
  variantId: string | null,
  quantity: number,
): CartItem[] {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY)
    return items;
  return items.map((item) =>
    item.productId === productId && item.variantId === variantId
      ? { ...item, quantity }
      : item,
  );
}

export function resolveCart(items: CartItem[], products: Product[]) {
  return items.map((item) => {
    const product =
      products.find((product) => product.id === item.productId) ?? null;
    const variant =
      product?.variants.find((variant) => variant.id === item.variantId) ??
      null;
    const available =
      !!product &&
      !product.isPlaceholder &&
      canPurchaseVariant(variant) &&
      !!variant &&
      item.quantity <= quantityLimit(variant);
    return {
      item,
      product,
      variant,
      available,
      subtotal: available ? variant!.priceMnt! * item.quantity : null,
    };
  });
}

export function loadCart(userId: string): CartItem[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(cartStorageKey(userId)) || "[]",
    );
    return normalizeCart(value);
  } catch {
    return [];
  }
}

export function saveCart(userId: string, items: CartItem[]): boolean {
  try {
    localStorage.setItem(cartStorageKey(userId), JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}
