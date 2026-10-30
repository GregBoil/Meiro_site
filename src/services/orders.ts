import { supabase } from "./supabase";
import type { CartItem } from "../commerce/types";

export const deliveryDistricts = [
  "Баянгол",
  "Баянзүрх",
  "Сүхбаатар",
  "Сонгинохайрхан",
  "Хан-Уул",
  "Чингэлтэй",
  "Налайх",
  "Багануур",
  "Багахангай",
] as const;
export type DeliveryAddress = {
  recipient_name: string;
  phone: string;
  city: "Ulaanbaatar";
  district: string;
  khoroo: number;
  address_line: string;
  instructions: string;
};
export type CheckoutPreview = {
  items: {
    product_id: string;
    variant_id: string;
    quantity: number;
    product_name?: string;
    variant_name?: string;
    sku?: string;
    unit_price_mnt?: number;
    line_total_mnt?: number;
    available: boolean;
    made_to_order?: boolean;
    lead_time_days?: number | null;
  }[];
  items_subtotal_mnt: number;
  delivery_fee_mnt: number | null;
  total_mnt: number | null;
  all_items_available: boolean;
  checkout_enabled: false;
};
export const orderStatuses: Record<string, string> = {
  pending_payment: "Төлбөр хүлээгдэж байна",
  paid: "Төлбөр төлөгдсөн",
  preparing: "Бэлтгэж байна",
  ready_to_ship: "Хүргэлтэд бэлэн",
  shipped: "Хүргэлтэд гарсан",
  delivered: "Хүргэгдсэн",
  cancelled: "Цуцлагдсан",
  expired: "Хугацаа дууссан",
};
export type Order = {
  id: string;
  status: string;
  total_mnt: number;
  created_at: string;
  recipient_name: string;
  phone: string;
  city: string;
  district: string;
  khoroo: number;
  address_line: string;
  instructions: string;
  tracking_number: string | null;
  order_items: {
    id: string;
    product_name: string;
    variant_name: string;
    sku: string;
    quantity: number;
    unit_price_mnt: number;
    line_total_mnt: number;
    made_to_order: boolean;
  }[];
};

export async function checkoutPreview(
  items: CartItem[],
): Promise<CheckoutPreview> {
  if (!supabase) throw new Error("Unavailable");
  const { data, error } = await supabase.rpc("meiro_checkout_preview", {
    p_items: items,
    p_city: "Ulaanbaatar",
  });
  if (error || !data) throw error ?? new Error("Unavailable");
  return data as CheckoutPreview;
}

export async function loadDeliveryAddress(userId: string) {
  if (!supabase) throw new Error("Unavailable");
  const { data, error } = await supabase
    .from("customer_delivery_addresses")
    .select(
      "recipient_name,phone,city,district,khoroo,address_line,instructions",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return { address: data as DeliveryAddress, saved: true };
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name,phone")
    .eq("id", userId)
    .single();
  if (profileError) throw profileError;
  return {
    saved: false,
    address: {
      recipient_name: profile?.full_name ?? "",
      phone: profile?.phone ?? "",
      city: "Ulaanbaatar" as const,
      district: "",
      khoroo: 1,
      address_line: "",
      instructions: "",
    },
  };
}

export async function saveDeliveryAddress(
  userId: string,
  address: DeliveryAddress,
) {
  if (!supabase) throw new Error("Unavailable");
  const clean = {
    ...address,
    city: "Ulaanbaatar",
    recipient_name: address.recipient_name.trim(),
    phone: address.phone.trim(),
    address_line: address.address_line.trim(),
    instructions: address.instructions.trim(),
  };
  const { data, error } = await supabase
    .from("customer_delivery_addresses")
    .update(clean)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { error: insertError } = await supabase
      .from("customer_delivery_addresses")
      .insert({ ...clean, user_id: userId });
    if (insertError) throw insertError;
  }
}

export async function loadOrders(userId?: string): Promise<Order[]> {
  if (!supabase) throw new Error("Unavailable");
  let query = supabase
    .from("orders")
    .select(
      "id,status,total_mnt,created_at,recipient_name,phone,city,district,khoroo,address_line,instructions,tracking_number,order_items(id,product_name,variant_name,sku,quantity,unit_price_mnt,line_total_mnt,made_to_order)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Order[];
}
