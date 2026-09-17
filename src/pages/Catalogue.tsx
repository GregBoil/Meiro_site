import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { categories, products } from "../data/products";

export default function Catalogue() {
  const [params, setParams] = useSearchParams();
  const selected = categories.some(
    (category) => category.id === params.get("category"),
  )
    ? params.get("category")!
    : "all";
  const visibleProducts = products.filter(
    (product) => selected === "all" || product.category === selected,
  );

  return (
    <div className="page-shell catalogue-page">
      <div className="page-intro">
        <p className="eyebrow">MEIRO / БҮТЭЭЛҮҮД</p>
        <h1>
          Таны өдөр тутамд.
          <br />
          <em>Таны замд.</em>
        </h1>
        <p>
          Итали арьсны чанар, Монгол урлаачийн сэтгэл.
          <br />
          Өөрт ойр бүтээлээ эндээс олоорой.
        </p>
      </div>
      <div className="preview-notice">
        <span className="status-dot" />
        <p>
          Бид анхны цуглуулгаа бэлдэж байна. Доорх нь загварын жишээнүүд бөгөөд
          зураг, үнэ, бэлэн байгаа эсэхийг удахгүй шинэчилнэ.
        </p>
      </div>
      <div className="catalogue-toolbar">
        <div className="filter-tabs" aria-label="Бүтээлийн төрөл">
          {categories.map((category) => (
            <button
              key={category.id}
              className={selected === category.id ? "selected" : ""}
              aria-pressed={selected === category.id}
              onClick={() =>
                setParams(
                  category.id === "all" ? {} : { category: category.id },
                )
              }
            >
              {category.label}
            </button>
          ))}
        </div>
        <span>{visibleProducts.length} бүтээл</span>
      </div>
      <div className="product-grid">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
