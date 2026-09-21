import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "../data/products";
import { supabase } from "../services/supabase";

type Row = { id:string; slug:string; name:string; status:"draft"|"published"|"hidden"; product_variants:{price:number}[]; product_images:{is_primary:boolean;display_order:number;media:{storage_path:string}|null}[] };

function imageUrl(row: Row) {
  if (!supabase) return null;
  const image=[...(row.product_images??[])].sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)||a.display_order-b.display_order).find(x=>x.media?.storage_path);
  return image?.media?.storage_path ? supabase.storage.from("product-images").getPublicUrl(image.media.storage_path).data.publicUrl : null;
}
const labels={published:"Нийтэлсэн",draft:"Ноорог",hidden:"Нуусан"};

export default function AdminProducts(){
  const [rows,setRows]=useState<Row[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  useEffect(()=>{(async()=>{if(!supabase){setError("Supabase тохируулаагүй байна.");setLoading(false);return}
    const {data,error}=await supabase.from("products").select("id,slug,name,status,product_variants(price),product_images(is_primary,display_order,media(storage_path))").order("display_order",{ascending:true});
    if(error)setError(error.message); else setRows((data??[]) as unknown as Row[]); setLoading(false);
  })()},[]);
  return <main className="admin-content"><div className="admin-page-head"><div><p className="admin-kicker">MEIRO / ADMIN</p><h1>Бүтээгдэхүүн</h1><p>Каталогийн бүтээгдэхүүнүүдийг удирдана.</p></div><button className="admin-primary" disabled>+ Шинэ бүтээгдэхүүн</button></div>
    {loading?<p className="admin-state">Уншиж байна…</p>:error?<p className="admin-error">{error}</p>:
    <div className="admin-product-list">{rows.map(row=>{const img=imageUrl(row);const prices=(row.product_variants??[]).map(v=>v.price);return <article className="admin-product-row" key={row.id}>
      <div className="admin-product-thumb">{img?<img src={img} alt="" />:<span>MEIRO</span>}</div>
      <div className="admin-product-name"><strong>{row.name}</strong><small>{row.slug}</small></div>
      <span className={"admin-status "+row.status}>{labels[row.status]}</span>
      <span className="admin-product-price">{prices.length?formatPrice(Math.min(...prices)):"—"}</span>
      <Link to={"/admin/products/"+row.id} aria-disabled="true">Засах →</Link>
    </article>})}{rows.length===0&&<p className="admin-state">Бүтээгдэхүүн алга байна.</p>}</div>}
  </main>;
}
