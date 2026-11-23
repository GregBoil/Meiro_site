import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../services/supabase";
type Media = {
  id: string;
  storage_path: string;
  filename: string;
  alt_text: string | null;
};
type ProductImage = {
  id: string;
  media_id: string;
  display_order: number;
  media: Media | null;
};
type Product = {
  id: string;
  name: string;
  internal_reference: string;
  product_images: ProductImage[];
};
type Slide = {
  id: string;
  display_order: number;
  active: boolean;
  object_position: string;
  media: Media | null;
  product_image: {
    id: string;
    product: { id: string; name: string; status: string } | null;
  } | null;
};
export default function AdminHome() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    if (!supabase) return;
    const [carousel, catalogue] = await Promise.all([
      supabase
        .from("homepage_carousel")
        .select(
          "id,display_order,active,object_position,media(id,storage_path,filename,alt_text),product_image:product_images!homepage_carousel_product_image_fkey(id,product:products(id,name,status))",
        )
        .order("display_order")
        .order("id"),
      supabase
        .from("products")
        .select(
          "id,name,internal_reference,product_images(id,media_id,display_order,media(id,storage_path,filename,alt_text))",
        )
        .eq("status", "published")
        .order("name"),
    ]);
    if (carousel.error || catalogue.error) {
      setError(carousel.error?.message || catalogue.error?.message || "");
      return;
    }
    setSlides((carousel.data ?? []) as unknown as Slide[]);
    setProducts((catalogue.data ?? []) as unknown as Product[]);
  }
  useEffect(() => {
    void load();
  }, []);
  const url = (path: string) =>
    supabase?.storage.from("product-images").getPublicUrl(path).data
      .publicUrl ?? "";
  async function choosePhoto(photo: ProductImage) {
    if (!supabase || saving) return;
    setSaving(true);
    setError("");
    const selection = { product_image_id: photo.id, media_id: photo.media_id };
    try {
      const { error } = editingId
        ? await supabase
            .from("homepage_carousel")
            .update(selection)
            .eq("id", editingId)
        : await supabase.from("homepage_carousel").insert({
            ...selection,
            display_order: (slides[slides.length - 1]?.display_order ?? -1) + 1,
            active: true,
          });
      if (error) {
        setError(error.message);
        return;
      }
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }
  async function remove(id: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("homepage_carousel")
      .delete()
      .eq("id", id);
    if (error) setError(error.message);
    else await load();
  }
  async function toggle(s: Slide) {
    if (!supabase) return;
    const { error } = await supabase
      .from("homepage_carousel")
      .update({ active: !s.active })
      .eq("id", s.id);
    if (error) setError(error.message);
    else
      setSlides((x) =>
        x.map((v) => (v.id === s.id ? { ...v, active: !v.active } : v)),
      );
  }
  async function setPosition(s: Slide, object_position: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("homepage_carousel")
      .update({ object_position })
      .eq("id", s.id);
    if (error) setError(error.message);
    else
      setSlides((x) =>
        x.map((v) => (v.id === s.id ? { ...v, object_position } : v)),
      );
  }
  async function move(index: number, d: number) {
    if (!supabase) return;
    const j = index + d;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[index], next[j]] = [next[j], next[index]];
    setSlides(
      next.map((slide, display_order) => ({ ...slide, display_order })),
    );
    for (let i = 0; i < next.length; i++) {
      const { error } = await supabase
        .from("homepage_carousel")
        .update({ display_order: i })
        .eq("id", next[i].id);
      if (error) {
        setError(error.message);
        return;
      }
    }
  }
  const availableProducts = products.filter((product) =>
    product.product_images.some((image) => image.media),
  );
  const product = availableProducts.find((item) => item.id === productId);
  const photos = [...(product?.product_images ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );
  return (
    <main className="admin-content">
      <div className="admin-page-head">
        <div>
          <p className="admin-kicker">MEIRO / ADMIN</p>
          <h1>Нүүр хуудас</h1>
          <p>Нүүр хуудсанд харуулах бүтээгдэхүүн болон зургийг сонгоно.</p>
        </div>
      </div>
      {error && <p className="admin-error admin-message">{error}</p>}
      <section className="admin-panel">
        <h2>Carousel</h2>
        {slides.length === 0 ? (
          <p className="admin-empty">Зураг сонгоогүй байна.</p>
        ) : (
          <div className="admin-home-slides">
            {slides.map((s, i) => (
              <article key={s.id}>
                <img
                  src={s.media ? url(s.media.storage_path) : ""}
                  alt={s.media?.alt_text || ""}
                />
                <div>
                  <strong>
                    {s.product_image?.product?.name ?? s.media?.filename}
                  </strong>
                  {s.product_image?.product?.status !== "published" && (
                    <span>
                      {s.product_image
                        ? "Нийтлээгүй бүтээгдэхүүн"
                        : "Бүтээгдэхүүн сонгоогүй"}
                    </span>
                  )}
                </div>
                <div className="admin-home-position">
                  <span>Кадр</span>
                  <select
                    value={s.object_position || "center center"}
                    onChange={(e) => setPosition(s, e.target.value)}
                  >
                    <option value="left top">↖</option>
                    <option value="center top">↑</option>
                    <option value="right top">↗</option>
                    <option value="left center">←</option>
                    <option value="center center">●</option>
                    <option value="right center">→</option>
                    <option value="left bottom">↙</option>
                    <option value="center bottom">↓</option>
                    <option value="right bottom">↘</option>
                  </select>
                </div>
                <div className="admin-home-slide-actions">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === slides.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(s)}
                    aria-label={s.active ? "Зургийг нуух" : "Зургийг харуулах"}
                    title={s.active ? "Зургийг нуух" : "Зургийг харуулах"}
                    aria-pressed={s.active}
                  >
                    {s.active ? (
                      <Eye size={18} aria-hidden="true" />
                    ) : (
                      <EyeOff size={18} aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setEditingId(s.id);
                      setProductId(s.product_image?.product?.id ?? "");
                      document.getElementById("carousel-product")?.focus();
                    }}
                  >
                    Солих
                  </button>
                  <button
                    type="button"
                    className="admin-danger"
                    onClick={() => remove(s.id)}
                  >
                    Хасах
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="admin-panel">
        <h2>
          {editingId ? "Бүтээгдэхүүн эсвэл зураг солих" : "Бүтээгдэхүүн нэмэх"}
        </h2>
        <div className="admin-fields">
          <label className="wide">
            Бүтээгдэхүүн
            <select
              id="carousel-product"
              value={productId}
              disabled={saving}
              onChange={(event) => setProductId(event.target.value)}
            >
              <option value="">Бүтээгдэхүүн сонгох</option>
              {availableProducts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.internal_reference}
                </option>
              ))}
            </select>
          </label>
        </div>
        {editingId && (
          <button
            type="button"
            className="admin-secondary"
            disabled={saving}
            onClick={() => setEditingId(null)}
          >
            Болих
          </button>
        )}
        {availableProducts.length === 0 && (
          <p className="admin-empty">
            Зурагтай, нийтэлсэн бүтээгдэхүүн алга байна.
          </p>
        )}
        {product && (
          <>
            <p>Харуулах зургийг сонгоно уу.</p>
            <div className="admin-home-library">
              {photos.map(
                (photo) =>
                  photo.media && (
                    <button
                      type="button"
                      key={photo.id}
                      disabled={
                        saving ||
                        slides.some(
                          (slide) =>
                            slide.id !== editingId &&
                            slide.product_image?.id === photo.id,
                        )
                      }
                      onClick={() => choosePhoto(photo)}
                    >
                      <img
                        src={url(photo.media.storage_path)}
                        alt={photo.media.alt_text || product.name}
                      />
                      <span>{photo.media.filename}</span>
                    </button>
                  ),
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
