import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatPrice } from "../data/products";
import { supabase } from "../services/supabase";

type Category = { id:string; name:string; productCount:number };
type Row = { id:string; slug:string; name:string; status:"draft"|"published"|"hidden"; product_variants:{price:number}[]; product_images:{is_primary:boolean;display_order:number;media:{storage_path:string}|null}[] };

function imageUrl(row: Row) {
  if (!supabase) return null;
  const image=[...(row.product_images??[])].sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)||a.display_order-b.display_order).find(x=>x.media?.storage_path);
  return image?.media?.storage_path ? supabase.storage.from("product-images").getPublicUrl(image.media.storage_path).data.publicUrl : null;
}
const labels={published:"Нийтэлсэн",draft:"Ноорог",hidden:"Нуусан"};

export default function AdminProducts(){
  const navigate=useNavigate();
  const [rows,setRows]=useState<Row[]>([]); const [categories,setCategories]=useState<Category[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [categoryError,setCategoryError]=useState(""); const [deletingCategory,setDeletingCategory]=useState<string|null>(null);
  useEffect(()=>{(async()=>{if(!supabase){setError("Supabase тохируулаагүй байна.");setLoading(false);return}
    const {data,error}=await supabase.from("products").select("id,slug,name,status,product_variants(price),product_images(is_primary,display_order,media(storage_path))").order("display_order",{ascending:true});
    if(error)setError(error.message); else setRows((data??[]) as unknown as Row[]);
    const {data:categoryData,error:categoryLoadError}=await supabase.from("categories").select("id,name,products(id)").order("display_order",{ascending:true});
    if(categoryLoadError)setCategoryError(categoryLoadError.message);else setCategories((categoryData??[]).map(category=>({id:category.id,name:category.name,productCount:(category.products??[]).length})));
    setLoading(false);
  })()},[]);
  async function deleteCategory(category:Category){
    if(!supabase||deletingCategory||category.productCount>0)return;
    if(!window.confirm(`“${category.name}” ангиллыг устгах уу? Энэ үйлдлийг буцаах боломжгүй.`))return;
    setDeletingCategory(category.id);setCategoryError("");
    const {count,error:countError}=await supabase.from("products").select("id",{count:"exact",head:true}).eq("category_id",category.id);
    if(countError||count===null){setCategoryError(countError?.message||"Ангиллын бүтээгдэхүүнийг шалгаж чадсангүй.");setDeletingCategory(null);return}
    if(count>0){setCategories(previous=>previous.map(item=>item.id===category.id?{...item,productCount:count}:item));setCategoryError("Энэ ангилалд бүтээгдэхүүн байгаа тул устгах боломжгүй.");setDeletingCategory(null);return}
    const {data,error:deleteError}=await supabase.from("categories").delete().eq("id",category.id).select("id");
    if(deleteError)setCategoryError(deleteError.code==="23503"?"Энэ ангилалд бүтээгдэхүүн байгаа тул устгах боломжгүй.":deleteError.message);
    else if(!data?.length)setCategoryError("Ангиллыг устгах эрх байхгүй эсвэл ангилал олдсонгүй.");
    else setCategories(previous=>previous.filter(item=>item.id!==category.id));
    setDeletingCategory(null);
  }
  return <main className="admin-content"><div className="admin-page-head"><div><p className="admin-kicker">MEIRO / ADMIN</p><h1>Бүтээгдэхүүн</h1><p>Каталогийн бүтээгдэхүүнүүдийг удирдана.</p></div><Link className="admin-primary" to="/admin/products/new">+ Шинэ бүтээгдэхүүн</Link></div>
    {loading?<p className="admin-state">Уншиж байна…</p>:error?<p className="admin-error">{error}</p>:
    <div className="admin-product-list">{rows.map(row=>{const img=imageUrl(row);const prices=(row.product_variants??[]).map(v=>v.price);return <article className="admin-product-row admin-product-clickable" key={row.id} onClick={()=>navigate(`/admin/products/${row.id}`)}>
      <div className="admin-product-thumb">{img?<img src={img} alt="" />:<span>MEIRO</span>}</div>
      <div className="admin-product-name"><strong>{row.name}</strong><small>{row.slug}</small></div>
      <span className={"admin-status "+row.status}>{labels[row.status]}</span>
      <span className="admin-product-price">{prices.length?formatPrice(Math.min(...prices)):"—"}</span>
      <Link to={"/admin/products/"+row.id} onClick={e=>e.stopPropagation()}>Засах →</Link>
    </article>})}{rows.length===0&&<p className="admin-state">Бүтээгдэхүүн алга байна.</p>}</div>}
    {!loading&&<section className="admin-panel" style={{marginTop:32}}><div className="admin-section-head"><div><h2>Ангиллууд</h2><p>Бүтээгдэхүүнгүй ангиллыг эндээс устгаж болно.</p></div></div>
      {categoryError&&<p className="admin-error">{categoryError}</p>}
      {categories.length===0?<p className="admin-state">Ангилал алга байна.</p>:<div className="admin-product-list">{categories.map(category=><div className="admin-product-row" key={category.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:16,flex:"1 1 auto",minWidth:0,flexWrap:"wrap"}}><strong>{category.name}</strong><span style={{whiteSpace:"nowrap",opacity:0.7}}>{category.productCount} бүтээгдэхүүн</span></div>
        <button type="button" className="admin-secondary" style={{flexShrink:0}} disabled={category.productCount>0||deletingCategory!==null} title={category.productCount>0?"Бүтээгдэхүүнтэй ангиллыг устгах боломжгүй.":"Ангилал устгах"} onClick={()=>deleteCategory(category)}>{deletingCategory===category.id?"Устгаж байна…":"Устгах"}</button>
      </div>)}</div>}
    </section>}
  </main>;
}
