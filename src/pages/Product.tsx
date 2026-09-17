import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { products, formatPrice } from "../data/products";
import ImagePlaceholder from "../components/ImagePlaceholder";
import NotFound from "./NotFound";

export default function Product() {
  const { slug } = useParams();
  const product = products.find((item) => item.slug === slug);
  if (!product) return <NotFound />;
  return (
    <div className="page-shell product-page">
      <Link className="text-link back-link" to="/catalogue">
        <ArrowLeft size={18} /> Бүтээлүүд рүү буцах
      </Link>
      <div className="product-detail">
        <ImagePlaceholder
          description={product.imageDescription}
          tone={product.tone}
        />
        <div className="product-detail-copy">
          <p className="eyebrow">MEIRO / ЗАГВАРЫН ЖИШЭЭ</p>
          <h1>{product.name}</h1>
          <p className="product-price">{formatPrice(product.priceMnt)}</p>
          <p>{product.description}</p>
          <dl>
            <div>
              <dt>Материал</dt>
              <dd>Итали арьс</dd>
            </div>
            <div>
              <dt>Урласан газар</dt>
              <dd>Монгол</dd>
            </div>
            <div>
              <dt>Бэлэн байдал</dt>
              <dd>Удахгүй</dd>
            </div>
          </dl>
          <p className="detail-notice">
            Энэ нь загварын жишээ. Одоогоор захиалга авахгүй байгаа ч та
            бидэнтэй холбогдож дэлгэрэнгүй мэдээлэл авах боломжтой.
          </p>
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
