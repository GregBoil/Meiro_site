import { supabase, isSupabaseConfigured } from "./supabase";
import type { Product, ProductVariant } from "../data/products";

type Availability = ProductVariant["availability"];

type VariantRow = {
  id: string;
  name: string;
  color: string | null;
  price: number;
  active: boolean;
  display_order: number;
};

type ImageRow = {
  id: string;
  variant_id: string | null;
  is_primary: boolean;
  display_order: number;
  media: {
    storage_path: string;
    alt_text: string | null;
  } | null;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  short_description: string | null;
  material: string | null;
  featured: boolean;
  category: { slug: string } | null;
  product_variants: VariantRow[];
  product_images: ImageRow[];
};

type AvailabilityRow = {
  variant_id: string;
  availability: Availability;
};

function getPublicImageUrl(storagePath: string | undefined) {
  if (!storagePath || !supabase) return null;
  const { data } = supabase.storage.from("product-images").getPublicUrl(storagePath);
  return data.publicUrl;
}

function mapProduct(row: ProductRow, availabilityMap: Map<string, Availability>): Product {
  const variants = [...(row.product_variants ?? [])]
    .filter((variant) => variant.active)
    .sort((a, b) => a.display_order - b.display_order)
    .map((variant) => ({
      id: variant.id,
      name: variant.name,
      stock: null,
      priceMnt: variant.price,
      color: variant.color,
      availability: availabilityMap.get(variant.id) ?? null,
    }));

  const images = [...(row.product_images ?? [])]
    .filter((image) => image.media?.storage_path)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order)
    .map((image) => ({
      id: image.id,
      url: getPublicImageUrl(image.media?.storage_path) ?? "",
      alt: image.media?.alt_text ?? row.name,
      variantId: image.variant_id,
      isPrimary: image.is_primary,
      displayOrder: image.display_order,
    }));

  const primaryImage =
    [...(row.product_images ?? [])]
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order)
      .find((image) => image.media?.storage_path)?.media ?? null;

  const availabilityValues = variants.map((variant) => variant.availability);
  const productAvailability =
    availabilityValues.length > 0 &&
    availabilityValues.every((value) => value === "sold_out")
      ? "sold-out"
      : "available";

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category?.slug ?? "all",
    description: row.description ?? row.short_description ?? "",
    imageDescription: primaryImage?.alt_text ?? row.name,
    imageUrl: getPublicImageUrl(primaryImage?.storage_path),
    tone: "taupe",
    priceMnt: variants.length > 0 ? Math.min(...variants.map((variant) => variant.priceMnt ?? 0)) : null,
    availability: productAvailability,
    isPlaceholder: false,
    variants,
    images,
  };
}

export async function getPublishedProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data: rows, error } = await supabase
    .from("products")
    .select(
      `
      id,
      slug,
      name,
      description,
      short_description,
      material,
      featured,
      category:categories(slug),
      product_variants(id,name,color,price,active,display_order),
      product_images(id,variant_id,is_primary,display_order,media(storage_path,alt_text))
      `,
    )
    .eq("status", "published")
    .order("display_order", { ascending: true });

  if (error) throw error;

  const variantIds = (rows ?? []).flatMap((row: any) =>
    (row.product_variants ?? []).filter((variant: VariantRow) => variant.active).map((variant: VariantRow) => variant.id),
  );

  const availabilityMap = new Map<string, Availability>();

  if (variantIds.length > 0) {
    const { data: availabilityRows, error: availabilityError } = await supabase
      .from("variant_availability")
      .select("variant_id,availability")
      .in("variant_id", variantIds);

    if (availabilityError) throw availabilityError;

    for (const item of (availabilityRows ?? []) as AvailabilityRow[]) {
      availabilityMap.set(item.variant_id, item.availability);
    }
  }

  return ((rows ?? []) as unknown as ProductRow[]).map((row) =>
    mapProduct(row, availabilityMap),
  );
}

export async function getPublishedProductBySlug(slug: string): Promise<Product | null> {
  const products = await getPublishedProducts();
  return products.find((product) => product.slug === slug) ?? null;
}
