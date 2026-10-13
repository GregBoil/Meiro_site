import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../commerce/CartProvider";
import { quantityLimit, resolveCart } from "../commerce/cart";
import { formatPrice, type Product } from "../data/products";
import { getPublishedProducts } from "../services/products";
import { useAuth } from "../auth/AuthProvider";

export default function Cart() {
  const { items, changeQuantity, remove, storageFailed } = useCart();
  const { session } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getPublishedProducts()
      .then((data) => {
        if (active) setProducts(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const lines = resolveCart(items, products);
  const total = lines.reduce((sum, line) => sum + (line.subtotal ?? 0), 0);
  const invalid = lines.some((line) => !line.available);

  return (
    <section className="page-shell cart-page">
      <p className="eyebrow">MEIRO</p>
      <h1>Миний сагс</h1>
      {storageFailed && (
        <p className="account-notice" role="alert">
          Сагсыг энэ төхөөрөмжид хадгалж чадсангүй. Хуудсыг шинэчлэхэд сонголт
          алдагдаж болзошгүй.
        </p>
      )}
      {!items.length ? (
        <div className="cart-empty">
          <p>Таны сагс хоосон байна.</p>
          <Link className="button button-primary" to="/catalogue">
            Бүтээлүүдтэй танилцах →
          </Link>
        </div>
      ) : loading ? (
        <p role="status">Үнэ, бэлэн байдлыг шалгаж байна…</p>
      ) : error ? (
        <div>
          <p className="account-error" role="alert">
            Үнэ, бэлэн байдлыг шалгаж чадсангүй.
          </p>
          <button
            className="button account-secondary"
            onClick={() => setRetry((v) => v + 1)}
          >
            Дахин оролдох
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-lines">
            {lines.map(({ item, product, variant, available, subtotal }) => {
              const image =
                product?.images.find(
                  (image) => image.variantId === variant?.id,
                ) ?? product?.images.find((image) => !image.variantId);
              const imageUrl = image?.url ?? product?.imageUrl;
              const label = product?.name ?? "Бүтээл одоогоор боломжгүй";
              return (
                <article
                  key={JSON.stringify([item.productId, item.variantId])}
                  className="cart-line"
                >
                  {imageUrl && <img src={imageUrl} alt={image?.alt ?? label} />}
                  <div className="cart-line-copy">
                    <h2>
                      {product ? (
                        <Link to={`/catalogue/${product.slug}`}>{label}</Link>
                      ) : (
                        label
                      )}
                    </h2>
                    <p>
                      {[variant?.color || variant?.name, variant?.material]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {variant && <p>{formatPrice(variant.priceMnt)} / ш</p>}
                    {variant?.availability === "made_to_order" && (
                      <p>Захиалгаар урлана.</p>
                    )}
                    {!available && (
                      <p className="account-error" role="alert">
                        Энэ сонголт эсвэл тоо хэмжээ одоогоор боломжгүй. Тоог
                        багасгах эсвэл сагснаас хасна уу.
                      </p>
                    )}
                    <div className="cart-line-actions">
                      <label>
                        Тоо хэмжээ
                        <select
                          aria-label={`${label} — тоо хэмжээ`}
                          value={item.quantity}
                          onChange={(e) =>
                            changeQuantity(item, Number(e.target.value))
                          }
                        >
                          {Array.from(
                            {
                              length: Math.max(
                                item.quantity,
                                variant
                                  ? quantityLimit(variant)
                                  : item.quantity,
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
                        onClick={() => remove(item)}
                        aria-label={`${label} — хасах`}
                      >
                        Хасах
                      </button>
                    </div>
                  </div>
                  <strong className="cart-line-total">
                    {subtotal === null ? "—" : formatPrice(subtotal)}
                  </strong>
                </article>
              );
            })}
          </div>
          <aside className="cart-summary">
            <h2>Нийт дүн</h2>
            <strong>{formatPrice(total)}</strong>
            <p>Хүргэлтийн төлбөр ороогүй.</p>
            {invalid && (
              <p className="account-error">
                Боломжгүй сонголтууд нийт дүнд ороогүй.
              </p>
            )}
            <p>Захиалга, төлбөрийн үйлчилгээ удахгүй нээгдэнэ.</p>
            {!session && (
              <Link className="text-link" to="/account/login">
                Бүртгэлдээ нэвтрэх →
              </Link>
            )}
            <Link className="text-link" to="/catalogue">
              Бүтээлүүд үзэх →
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
