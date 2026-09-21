export interface ProductImage { id: string; url: string; alt: string; variantId: string | null; isPrimary: boolean; displayOrder: number; }

export interface ProductVariant {
  id: string;
  name: string;
  stock: number | null;
  priceMnt: number | null;
  color?: string | null;
  availability?: "available" | "low_stock" | "sold_out" | "made_to_order" | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  imageDescription: string;
  imageUrl?: string | null;
  tone: string;
  priceMnt: number | null;
  availability: "preview" | "available" | "sold-out";
  isPlaceholder: boolean;
  variants: ProductVariant[];
  images: ProductImage[];
}

export const formatPrice = (price: number | null) =>
  price === null
    ? "Үнэ удахгүй"
    : `${new Intl.NumberFormat("mn-MN").format(price)} ₮`;
