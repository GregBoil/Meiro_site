import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

type Product={id:string;name:string;internal_reference:string|null};
type Collection={id:string;name:string;slug:string;description:string|null;featured:boolean;display_order:number;active:boolean;product_collections:{product_id:string;display_order:number}[]};
const slugify=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9а-яөүё]+/gi,"-").replace(/(^-|-$)/g,"");

export default function AdminCollections(){
 const [rows,setRows]=useState<Collection[]>([]),[products,setProducts]=useState<Product[]>([]),[editing,setEditing]=useState<Collection|null>(null);
 const [name,setName]=useState(""),[description,setDescription]=useState(""),[featured,setFeatured]=useState(false),[active,setActive]=useState(true),[order,setOrder]=useState(0),[selected,setSelected]=useState<string[]>([]);
 const [error,setError]=useState(""),[saving,setSaving]=useState(false);
 async function load(){if(!supabase)return;const [{data:c,error},{data:p}]=await Promise.all([
  supabase.from("collections").select("id,name,slug,description,featured,display_order,active,product_collections(product_id,display_order)").order("display_order"),
  supabase.from("products").select("id,name,internal_reference").order("name")
 ]);if(error)setError(error.message);else setRows((c??[]) as unknown as Collection[]);setProducts((p??[]) as Product[])}
 useEffect(()=>{load()},[]);
 function reset(){setEditing(null);setName("");setDescription("");setFeatured(false);setActive(true);setOrder(rows.length);setSelected([]);setError("")}
 function edit(c:Collection){setEditing(c);setName(c.name);setDescription(c.description??"");setFeatured(c.featured);setActive(c.active);setOrder(c.display_order);setSelected([...(c.product_collections??[])].sort((a,b)=>a.display_order-b.display_order).map(x=>x.product_id))}
 function toggle(id:string){setSelected(x=>x.includes(id)?x.filter(v=>v!==id):[...x,id])}
 async function save(e:FormEvent){e.preventDefault();if(!supabase||!name.trim())return;setSaving(true);setError("");const payload={name:name.trim(),slug:editing?.slug||slugify(name),description:description.trim()||null,featured,active,display_order:order,updated_at:new Date().toISOString()};let id=editing?.id;
  if(id){const {error}=await supabase.from("collections").update(payload).eq("id",id);if(error){setError(error.message);setSaving(false);return}}
  else{const {data,error}=await supabase.from("collections").insert(payload).select("id").single();if(error||!data){setError(error?.message||"Хадгалж чадсангүй.");setSaving(false);return}id=data.id}
  await supabase.from("product_collections").delete().eq("collection_id",id!);
  if(selected.length){const {error}=await supabase.from("product_collections").insert(selected.map((product_id,i)=>({collection_id:id!,product_id,display_order:i})));if(error){setError(error.message);setSaving(false);return}}
  setSaving(false);reset();await load()
 }
 async function remove(c:Collection){if(!supabase||!confirm("Энэ цуглуулгыг устгах уу?"))return;const {error}=await supabase.from("collections").delete().eq("id",c.id);if(error)setError(error.message);else{if(editing?.id===c.id)reset();await load()}}
 return <main className="admin-content"><div className="admin-page-head"><div><p className="admin-kicker">MEIRO / ADMIN</p><h1>Цуглуулга</h1><p>Бүтээгдэхүүнүүдийг цуглуулгаар зохион байгуулна.</p></div><button className="admin-primary" onClick={reset}>+ Шинэ цуглуулга</button></div>
 {error&&<p className="admin-error admin-message">{error}</p>}
 <div className="admin-collections-layout"><div className="admin-collection-list">{rows.map(c=><article key={c.id} className={editing?.id===c.id?"selected":""} onClick={()=>edit(c)}><div><strong>{c.name}</strong><small>{c.product_collections?.length??0} бүтээгдэхүүн</small></div><span>{c.active?"Идэвхтэй":"Идэвхгүй"}{c.featured?" · Онцлох":""}</span></article>)}{!rows.length&&<p className="admin-state">Цуглуулга алга байна.</p>}</div>
 <form className="admin-panel admin-collection-editor" onSubmit={save}><h2>{editing?"Цуглуулга засах":"Шинэ цуглуулга"}</h2><label>Нэр<input value={name} onChange={e=>setName(e.target.value)} required/></label><label>Тайлбар<textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label><label>Дараалал<input type="number" value={order} onChange={e=>setOrder(Number(e.target.value))}/></label><div className="admin-collection-options"><label className="admin-check"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Идэвхтэй</label><label className="admin-check"><input type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)}/> Онцлох</label></div><h3>Бүтээгдэхүүн</h3><div className="admin-product-checks">{products.map(p=><label key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggle(p.id)}/><span><strong>{p.name}</strong><small>{p.internal_reference||"—"}</small></span></label>)}</div><div className="admin-collection-actions"><button className="admin-primary" disabled={saving}>{saving?"Хадгалж байна…":"Хадгалах"}</button>{editing&&<button type="button" className="admin-danger" onClick={()=>remove(editing)}>Устгах</button>}</div></form></div></main>
}