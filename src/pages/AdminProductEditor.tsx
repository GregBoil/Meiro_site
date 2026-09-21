import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../services/supabase";

type Category={id:string;name:string};
type Form={name:string;slug:string;internal_reference:string;short_description:string;description:string;material:string;dimensions:string;category_id:string;status:"draft"|"published"|"hidden";featured:boolean;custom_order_available:boolean;custom_order_note:string;display_order:number};
const empty:Form={name:"",slug:"",internal_reference:"",short_description:"",description:"",material:"",dimensions:"",category_id:"",status:"draft",featured:false,custom_order_available:false,custom_order_note:"",display_order:0};
const slugify=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

export default function AdminProductEditor(){
 const {id}=useParams(); const creating=id==="new"; const nav=useNavigate();
 const [form,setForm]=useState<Form>(empty); const [categories,setCategories]=useState<Category[]>([]); const [newCategory,setNewCategory]=useState(""); const [addingCategory,setAddingCategory]=useState(false); const [loading,setLoading]=useState(!creating); const [saving,setSaving]=useState(false); const [error,setError]=useState(""); const [saved,setSaved]=useState(false);
 useEffect(()=>{(async()=>{if(!supabase){setError("Supabase тохируулаагүй байна.");setLoading(false);return}
   const {data:c}=await supabase.from("categories").select("id,name").order("display_order"); setCategories((c??[]) as Category[]);
   if(!creating){const {data,error}=await supabase.from("products").select("name,slug,internal_reference,short_description,description,material,dimensions,category_id,status,featured,custom_order_available,custom_order_note,display_order").eq("id",id!).single();
     if(error)setError(error.message); else setForm({...empty,...data} as Form); setLoading(false);}
 })()},[id,creating]);
 const set=<K extends keyof Form>(k:K,v:Form[K])=>setForm(x=>({...x,[k]:v}));
 async function addCategory(){
   if(!supabase||!newCategory.trim())return;
   setAddingCategory(true);setError("");
   const name=newCategory.trim();
   const {data,error}=await supabase.from("categories").insert({name,slug:slugify(name),active:true}).select("id,name").single();
   if(error)setError(error.message); else if(data){setCategories(x=>[...x,data as Category]);set("category_id",data.id);setNewCategory("");}
   setAddingCategory(false);
 }
 async function save(e:FormEvent){e.preventDefault();if(!supabase)return;setSaving(true);setError("");setSaved(false);
   const payload={...form,short_description:form.short_description||null,description:form.description||null,material:form.material||null,dimensions:form.dimensions||null,category_id:form.category_id||null,custom_order_note:form.custom_order_note||null};
   if(creating){const {data,error}=await supabase.from("products").insert(payload).select("id").single();if(error)setError(error.message);else if(data)nav("/admin/products/"+data.id,{replace:true});}
   else {const {error}=await supabase.from("products").update(payload).eq("id",id!);if(error)setError(error.message);else setSaved(true);}
   setSaving(false);
 }
 if(loading)return <main className="admin-content"><p>Уншиж байна…</p></main>;
 return <main className="admin-content"><div className="admin-editor-head"><div><Link to="/admin/products">← Бүтээгдэхүүн</Link><p className="admin-kicker">MEIRO / ADMIN</p><h1>{creating?"Шинэ бүтээгдэхүүн":form.name||"Бүтээгдэхүүн"}</h1></div><button form="product-form" className="admin-primary" disabled={saving}>{saving?"Хадгалж байна…":"Хадгалах"}</button></div>
 {error&&<p className="admin-error admin-message">{error}</p>}{saved&&<p className="admin-success admin-message">Өөрчлөлт хадгалагдлаа.</p>}
 <form id="product-form" className="admin-editor" onSubmit={save}>
  <section className="admin-panel"><h2>Үндсэн мэдээлэл</h2><div className="admin-fields">
   <label className="wide">Нэр<input value={form.name} onChange={e=>{set("name",e.target.value);if(creating)set("slug",slugify(e.target.value))}} required /></label>
   <label>Slug<input value={form.slug} onChange={e=>set("slug",e.target.value)} required /></label><label>Дотоод код <span className="admin-label-hint">Référence interne</span><input value={form.internal_reference} onChange={e=>set("internal_reference",e.target.value.toUpperCase())} placeholder="Жишээ: NHG" /></label>
   <div className="admin-category-field"><label>Ангилал<select value={form.category_id} onChange={e=>set("category_id",e.target.value)}><option value="">—</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="admin-inline-add"><input aria-label="Шинэ ангилал" placeholder="Шинэ ангилал…" value={newCategory} onChange={e=>setNewCategory(e.target.value)} /><button type="button" onClick={addCategory} disabled={addingCategory||!newCategory.trim()}>{addingCategory?"…":"+ Нэмэх"}</button></div></div>
   <label className="wide">Товч тайлбар<textarea value={form.short_description} onChange={e=>set("short_description",e.target.value)} rows={2}/></label>
   <label className="wide">Дэлгэрэнгүй тайлбар<textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={5}/></label>
   <label>Материал<input value={form.material} onChange={e=>set("material",e.target.value)}/></label><label>Хэмжээ<input value={form.dimensions} onChange={e=>set("dimensions",e.target.value)}/></label>
  </div></section>
  <aside className="admin-editor-side"><section className="admin-panel"><h2>Нийтлэх</h2><label>Төлөв<select value={form.status} onChange={e=>set("status",e.target.value as Form["status"])}><option value="draft">Ноорог</option><option value="published">Нийтэлсэн</option><option value="hidden">Нуусан</option></select></label><label>Дараалал<input type="number" value={form.display_order} onChange={e=>set("display_order",Number(e.target.value))}/></label><label className="admin-check"><input type="checkbox" checked={form.featured} onChange={e=>set("featured",e.target.checked)}/> Онцлох бүтээгдэхүүн</label></section>
  <section className="admin-panel"><h2>Захиалгын өнгө</h2><label className="admin-check"><input type="checkbox" checked={form.custom_order_available} onChange={e=>set("custom_order_available",e.target.checked)}/> Өөр өнгөөр захиалах боломжтой</label>{form.custom_order_available&&<label>Тайлбар<textarea value={form.custom_order_note} onChange={e=>set("custom_order_note",e.target.value)} rows={3}/></label>}</section></aside>
 </form></main>
}
