import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import type { Product } from "../data/products";
import { getPublishedProducts } from "../services/products";
import { supabase } from "../services/supabase";

export default function Catalogue() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [collections, setCollections] = useState<{id:string;name:string;slug:string;productIds:string[]}[]>([]);

  useEffect(() => {
    let cancelled = false;

    getPublishedProducts()
      .then((items) => {
        if (!cancelled) setProducts(items);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setLoadError("Каталогийг ачаалж чадсангүй.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("collections")
      .select("id,name,slug,product_collections(product_id,display_order)")
      .eq("active", true)
      .order("display_order")
      .then(({data,error}) => {
        if (error) console.error(error);
        else setCollections(((data ?? []) as any[]).map(row => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          productIds: [...(row.product_collections ?? [])]
            .sort((a:any,b:any)=>a.display_order-b.display_order)
            .map((x:any)=>x.product_id)
        })));
      });
  }, []);

  const categories = useMemo(() => {
    const ids = Array.from(new Set(products.map((product) => product.category)));
    return [
      { id: "all", label: "Бүгд" },
      ...ids.map((id) => ({ id, label: id })),
    ];
  }, [products]);

  const requestedCollection = params.get("collection");
  const selectedCollection = collections.find(c => c.slug === requestedCollection) ?? null;

  const requested = params.get("category");
  const selected = categories.some((category) => category.id === requested)
    ? requested!
    : "all";

  const visibleProducts = selectedCollection
    ? selectedCollection.productIds.map(id => products.find(p => p.id === id)).filter((p): p is Product => Boolean(p))
    : products.filter((product) => selected === "all" || product.category === selected);

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

      {loading && <div className="preview-notice"><p>Каталог ачаалж байна…</p></div>}
      {loadError && <div className="preview-notice"><p>{loadError}</p></div>}

      {!loading && !loadError && (
        <>
          {collections.length > 0 && <div className="collection-tabs" aria-label="Цуглуулга">
            <button className={!selectedCollection ? "selected" : ""} onClick={()=>setParams({})}>Бүх цуглуулга</button>
            {collections.map(collection => <button key={collection.id} className={selectedCollection?.id===collection.id?"selected":""} onClick={()=>setParams({collection:collection.slug})}>{collection.name}</button>)}
          </div>}
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
        </>
      )}
    </div>
  );
}
