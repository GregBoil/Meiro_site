import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { formatPrice, type Product as ProductType } from "../data/products";
import ImagePlaceholder from "../components/ImagePlaceholder";
import NotFound from "./NotFound";
import { getPublishedProductBySlug } from "../services/products";

export default function Product() {
  const { slug } = useParams();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    getPublishedProductBySlug(slug)
      .then((item) => {
        if (cancelled) return;
        if (!item) setNotFound(true);
        else setProduct(item);
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

  return (
    <div className="page-shell product-page">
      <Link className="text-link back-link" to="/catalogue">
        <ArrowLeft size={18} /> Бүтээлүүд рүү буцах
      </Link>

      <div className="product-detail">
        {product.imageUrl ? (
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

        <div className="product-detail-copy">
          <p className="eyebrow">MEIRO / БҮТЭЭЛ</p>
          <h1>{product.name}</h1>
          <p className="product-price">{formatPrice(product.priceMnt)}</p>
          <p>{product.description}</p>

          {product.variants.length > 0 && (
            <dl>
              <div>
                <dt>Сонголт</dt>
                <dd>{product.variants.map((variant) => variant.name).join(", ")}</dd>
              </div>
              <div>
                <dt>Бэлэн байдал</dt>
                <dd>
                  {product.availability === "sold-out" ? "Дууссан" : "Бэлэн"}
                </dd>
              </div>
            </dl>
          )}

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
