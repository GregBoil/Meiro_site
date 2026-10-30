import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { formatPrice, type Product as ProductType } from "../data/products";
import ImagePlaceholder from "../components/ImagePlaceholder";
import NotFound from "./NotFound";
import { getPublishedProductBySlug } from "../services/products";
import { useCart } from "../commerce/CartProvider";
import { useAuth } from "../auth/AuthProvider";
import { canPurchaseVariant, quantityLimit } from "../commerce/cart";

export default function Product() {
  const cart = useCart();
  const { session, loading: authLoading } = useAuth();
  const { slug } = useParams();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setProduct(null);
    setQuantity(1);
    setCartMessage("");
    setCartError("");

    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    getPublishedProductBySlug(slug)
      .then((item) => {
        if (cancelled) return;
        if (!item) setNotFound(true);
        else {
          setProduct(item);
          setSelectedVariantId(null);
          const primary =
            item.images?.find((image) => image.isPrimary) ?? item.images?.[0];
          setSelectedImageId(primary?.id ?? null);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="page-shell product-page">
        <p>Бүтээл ачаалж байна…</p>
      </div>
    );
  }

  if (notFound || !product) return <NotFound />;

  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    null;
  const shownPrice = selectedVariant?.priceMnt ?? product.priceMnt;
  const generalImages = product.images.filter((image) => !image.variantId);
  const variantImages = selectedVariant
    ? product.images.filter((image) => image.variantId === selectedVariant.id)
    : [];
  const galleryImages = selectedVariant
    ? variantImages.length > 0
      ? [...variantImages, ...generalImages]
      : generalImages.length > 0
        ? generalImages
        : product.images
    : product.images;
  const selectedImage =
    galleryImages.find((image) => image.id === selectedImageId) ??
    galleryImages[0] ??
    null;
  const availabilityLabel = !selectedVariant
    ? "Сонголтоо хийнэ үү"
    : selectedVariant.availability === "sold_out"
      ? "Дууссан"
      : selectedVariant.availability === "made_to_order"
        ? "Захиалгаар"
        : selectedVariant.availability === "low_stock"
          ? "Цөөн үлдсэн"
          : selectedVariant.availability === "available"
            ? "Бэлэн"
            : "Бэлэн байдал тодорхойгүй";

  return (
    <div className="page-shell product-page">
      <Link className="text-link back-link" to="/catalogue">
        <ArrowLeft size={18} /> Бүтээлүүд рүү буцах
      </Link>

      <div className="product-detail">
        <div className="product-gallery">
          {selectedImage ? (
            <img
              src={selectedImage.url}
              alt={selectedImage.alt}
              className="product-image"
            />
          ) : product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.imageDescription}
              className="product-image"
            />
          ) : (
            <ImagePlaceholder
              description={product.imageDescription}
              tone={product.tone}
            />
          )}
          {galleryImages.length > 1 && (
            <div className="product-thumbnails">
              {galleryImages.map((image) => (
                <button
                  type="button"
                  key={image.id}
                  className={image.id === selectedImage?.id ? "selected" : ""}
                  onClick={() => setSelectedImageId(image.id)}
                >
                  <img src={image.url} alt={image.alt} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-detail-copy">
          <p className="eyebrow">MEIRO / БҮТЭЭЛ</p>
          <h1>{product.name}</h1>
          {(selectedVariant?.sku || product.internalReference) && (
            <p className="product-reference">
              Код: {selectedVariant?.sku || product.internalReference}
            </p>
          )}
          <p className="product-price">{formatPrice(shownPrice)}</p>
          <p>{product.description}</p>

          {product.variants.length > 0 && (
            <div className="product-variant-picker">
              <p className="product-option-label">Сонголт</p>
              <div className="product-variant-buttons">
                {product.variants.map((variant) => (
                  <button
                    type="button"
                    key={variant.id}
                    className={
                      variant.id === selectedVariant?.id ? "selected" : ""
                    }
                    aria-pressed={variant.id === selectedVariant?.id}
                    onClick={() => {
                      setQuantity(1);
                      setCartMessage("");
                      setCartError("");
                      if (selectedVariantId === variant.id) {
                        setSelectedVariantId(null);
                        const primary =
                          product.images.find((image) => image.isPrimary) ??
                          product.images[0];
                        setSelectedImageId(primary?.id ?? null);
                      } else {
                        setSelectedVariantId(variant.id);
                        const first =
                          product.images.find(
                            (image) => image.variantId === variant.id,
                          ) ?? product.images.find((image) => !image.variantId);
                        setSelectedImageId(first?.id ?? null);
                      }
                    }}
                  >
                    {[variant.color || variant.name, variant.material]
                      .filter(Boolean)
                      .join(" · ")}
                  </button>
                ))}
              </div>
              <dl>
                <div>
                  <dt>Бэлэн байдал</dt>
                  <dd>{availabilityLabel}</dd>
                </div>
              </dl>
            </div>
          )}

          {authLoading ? <p role="status">Уншиж байна…</p> : !session ? (
            <div className="product-cart-actions">
              <Link className="button button-primary" to="/account/login">Нэвтэрч худалдан авах</Link>
            </div>
          ) : <div className="product-cart-actions">
            <label htmlFor="product-quantity">
              Тоо хэмжээ
              <select
                id="product-quantity"
                value={quantity}
                disabled={!canPurchaseVariant(selectedVariant)}
                onChange={(e) => {
                  setQuantity(Number(e.target.value));
                  setCartMessage("");
                  setCartError("");
                }}
              >
                {Array.from(
                  {
                    length: Math.max(
                      1,
                      selectedVariant ? quantityLimit(selectedVariant) : 1,
                    ),
                  },
                  (_, i) => i + 1,
                ).map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button button-primary"
              disabled={
                !canPurchaseVariant(selectedVariant) || product.isPlaceholder
              }
              onClick={() => {
                if (!selectedVariant) return;
                const error = cart.add(product, selectedVariant, quantity);
                setCartError(error ?? "");
                setCartMessage(error ? "" : "Сагсанд нэмэгдлээ.");
              }}
            >
              Сагсанд нэмэх
            </button>
            {!selectedVariant && <small>Өнгө, материалаа сонгоно уу.</small>}
            {cartError && (
              <p className="account-error" role="alert">
                {cartError}
              </p>
            )}
            {cartMessage && (
              <p className="account-success" role="status">
                {cartMessage} <Link to="/cart">Сагс үзэх →</Link>
              </p>
            )}
            {cart.storageFailed && (
              <p className="account-notice" role="alert">
                Сагс энэ төхөөрөмжид хадгалагдахгүй байна.
              </p>
            )}
          </div>}

          <Link
            className="button button-primary"
            to={`/contact?subject=${encodeURIComponent(product.name)}`}
          >
            Бүтээлийн талаар асуух <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
