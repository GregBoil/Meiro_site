import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { formatPrice, type Product } from "../data/products";
import ImagePlaceholder from "./ImagePlaceholder";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link className="product-card" to={`/catalogue/${product.slug}`}>
      <div className="product-image-wrap">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.imageDescription}
            className="product-image"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder
            description={product.imageDescription}
            tone={product.tone}
          />
        )}
        {product.isPlaceholder && (
          <span className="product-badge">Загварын жишээ</span>
        )}
        <span className="product-open">
          <ArrowUpRight size={21} />
        </span>
      </div>
      <div className="product-title">
        <h2>{product.name}</h2>
        <span>{formatPrice(product.priceMnt)}</span>
      </div>
      {product.internalReference && <p className="product-reference">Код: {product.internalReference}</p>}
      <p>{product.description}</p>
    </Link>
  );
}
