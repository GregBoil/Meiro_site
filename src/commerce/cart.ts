import type { CartItem } from "./types";
const STORAGE_KEY = "meiro.cart.v1";
const MAX_QUANTITY = 99;

export function loadCart(): CartItem[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]",
    );
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is CartItem =>
        typeof item?.productId === "string" &&
        (item.variantId === null || typeof item.variantId === "string") &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        item.quantity <= MAX_QUANTITY,
    );
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}
