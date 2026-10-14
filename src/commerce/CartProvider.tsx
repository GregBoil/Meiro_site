import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Product, ProductVariant } from "../data/products";
import type { CartItem } from "./types";
import { useAuth } from "../auth/AuthProvider";
import {
  addCartItem,
  canPurchaseVariant,
  changeCartQuantity,
  loadCart,
  MAX_QUANTITY,
  quantityLimit,
  saveCart,
  cartStorageKey,
} from "./cart";

type CartContextType = {
  items: CartItem[];
  count: number;
  storageFailed: boolean;
  add: (
    product: Product,
    variant: ProductVariant,
    quantity: number,
  ) => string | null;
  changeQuantity: (item: CartItem, quantity: number) => void;
  remove: (item: CartItem) => void;
};
const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const userId = !loading ? (session?.user.id ?? null) : null;
  return (
    <AccountCartProvider key={userId ?? "guest"} userId={userId}>
      {children}
    </AccountCartProvider>
  );
}

function AccountCartProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  // Remount on account changes: never render or persist the previous user's items.
  const [items, setItems] = useState(() => (userId ? loadCart(userId) : []));
  const [storageFailed, setStorageFailed] = useState(false);
  useEffect(() => {
    if (userId) setStorageFailed(!saveCart(userId, items));
  }, [userId, items]);
  useEffect(() => {
    if (!userId) return;
    function sync(event: StorageEvent) {
      if (event.storageArea && event.storageArea !== window.localStorage)
        return;
      if (event.key === cartStorageKey(userId!) || event.key === null)
        setItems(loadCart(userId!));
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [userId]);

  function add(product: Product, variant: ProductVariant, quantity: number) {
    if (!userId) return "Сагсанд нэмэхийн тулд нэвтэрнэ үү.";
    if (
      product.isPlaceholder ||
      !product.variants.some((v) => v.id === variant.id) ||
      !canPurchaseVariant(variant)
    )
      return "Энэ сонголт одоогоор боломжгүй байна.";
    const existing =
      items.find(
        (item) =>
          item.productId === product.id && item.variantId === variant.id,
      )?.quantity ?? 0;
    const limit = Math.min(MAX_QUANTITY, quantityLimit(variant));
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      existing + quantity > limit
    )
      return `Сагсанд хамгийн ихдээ ${limit} ширхэг нэмэх боломжтой.`;
    setItems((current) =>
      addCartItem(current, {
        productId: product.id,
        variantId: variant.id,
        quantity,
      }),
    );
    return null;
  }
  function changeQuantity(item: CartItem, quantity: number) {
    if (!userId) return;
    setItems((current) =>
      changeCartQuantity(current, item.productId, item.variantId, quantity),
    );
  }
  function remove(item: CartItem) {
    if (!userId) return;
    setItems((current) =>
      current.filter(
        (v) =>
          !(v.productId === item.productId && v.variantId === item.variantId),
      ),
    );
  }
  return (
    <CartContext.Provider
      value={{
        items,
        count: items.reduce((sum, item) => sum + item.quantity, 0),
        storageFailed,
        add,
        changeQuantity,
        remove,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("CartProvider is required");
  return cart;
}
