import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../services/supabase";

type Category={id:string;name:string};
type Variant={id?:string;name:string;color:string;sku:string;price:number;active:boolean;made_to_order:boolean;lead_time_days:number|null;display_order:number;_deleted?:boolean};
type ProductImage={id:string;variant_id:string|null;media_id:string;is_primary:boolean;display_order:number;media:{storage_path:string;filename:string;alt_text:string|null}|null};
type Form={name:string;slug:string;internal_reference:string;short_description:string;description:string;material:string;dimensions:string;category_id:string;status:"draft"|"published"|"hidden";featured:boolean;custom_order_available:boolean;custom_order_note:string;display_order:number};
const empty:Form={name:"",slug:"",internal_reference:"",short_description:"",description:"",material:"",dimensions:"",category_id:"",status:"draft",featured:false,custom_order_available:false,custom_order_note:"",display_order:0};
const mnMap:Record<string,string>={а:"a",б:"b",в:"v",г:"g",д:"d",е:"ye",ё:"yo",ж:"j",з:"z",и:"i",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",ө:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ү:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sh",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"};
const slugify=(s:string)=>s.toLowerCase().split("").map(ch=>mnMap[ch]??ch).join("").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

export default function AdminProductEditor(){
 const {id}=useParams(); const creating=id==="new"; const nav=useNavigate();
 const [form,setForm]=useState<Form>(empty); const [variants,setVariants]=useState<Variant[]>([]); const [images,setImages]=useState<ProductImage[]>([]); const [uploading,setUploading]=useState(false); const [draggedImageId,setDraggedImageId]=useState<string|null>(null); const [categories,setCategories]=useState<Category[]>([]); const [newCategory,setNewCategory]=useState(""); const [addingCategory,setAddingCategory]=useState(false); const [loading,setLoading]=useState(!creating); const [saving,setSaving]=useState(false); const [error,setError]=useState(""); const [saved,setSaved]=useState(false);
 useEffect(()=>{(async()=>{if(!supabase){setError("Supabase тохируулаагүй байна.");setLoading(false);return}
   const {data:c}=await supabase.from("categories").select("id,name").order("display_order"); setCategories((c??[]) as Category[]);
   if(!creating){const {data,error}=await supabase.from("products").select("name,slug,internal_reference,short_description,description,material,dimensions,category_id,status,featured,custom_order_available,custom_order_note,display_order").eq("id",id!).single();
     if(error)setError(error.message); else setForm({...empty,...data} as Form);
     const {data:v,error:ve}=await supabase.from("product_variants").select("id,name,color,sku,price,active,made_to_order,lead_time_days,display_order").eq("product_id",id!).order("display_order"); if(ve)setError(ve.message); else setVariants((v??[]) as Variant[]);
     const {data:imgs,error:ie}=await supabase.from("product_images").select("id,variant_id,media_id,is_primary,display_order,media(storage_path,filename,alt_text)").eq("product_id",id!).order("display_order"); if(ie)setError(ie.message); else setImages((imgs??[]) as unknown as ProductImage[]); setLoading(false);}
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
 function addVariant(){const n=variants.filter(v=>!v._deleted).length+1;setVariants(v=>[...v,{name:"",color:"",sku:form.internal_reference?form.internal_reference+"-"+n:"",price:0,active:true,made_to_order:false,lead_time_days:null,display_order:n-1}])}
 function updateVariant(i:number,patch:Partial<Variant>){setVariants(v=>v.map((x,j)=>j===i?{...x,...patch}:x))}
 function removeVariant(i:number){setVariants(v=>v.map((x,j)=>j===i?{...x,_deleted:true}:x))}
 async function saveVariants(productId:string){
   if(!supabase)return null;
   for(const v of variants){
     if(v._deleted){if(v.id){const {error}=await supabase.from("product_variants").delete().eq("id",v.id);if(error)return error}continue}
     const payload={product_id:productId,name:v.name.trim()||v.color.trim()||"Хувилбар",color:v.color.trim()||null,sku:v.sku.trim(),price:Number(v.price)||0,active:v.active,made_to_order:v.made_to_order,lead_time_days:v.made_to_order&&v.lead_time_days?Number(v.lead_time_days):null,display_order:v.display_order};
     const q=v.id?supabase.from("product_variants").update(payload).eq("id",v.id):supabase.from("product_variants").insert(payload); const {error}=await q;if(error)return error;
   } return null;
 }
 async function uploadImage(file:File){
   if(!supabase||creating||!id)return; setUploading(true);setError("");
   const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-"); const path=`${form.slug||id}/${Date.now()}-${safe}`;
   const {error:ue}=await supabase.storage.from("product-images").upload(path,file,{contentType:file.type,upsert:false}); if(ue){setError(ue.message);setUploading(false);return}
   const {data:m,error:me}=await supabase.from("media").insert({storage_path:path,filename:file.name,alt_text:form.name||file.name,mime_type:file.type||null,file_size:file.size}).select("id,storage_path,filename,alt_text").single();
   if(me||!m){await supabase.storage.from("product-images").remove([path]);setError(me?.message||"Зураг хадгалж чадсангүй.");setUploading(false);return}
   const {data:pi,error:pe}=await supabase.from("product_images").insert({product_id:id,media_id:m.id,is_primary:images.length===0,display_order:images.length}).select("id,variant_id,media_id,is_primary,display_order").single();
   if(pe||!pi){setError(pe?.message||"Зураг холбож чадсангүй.");setUploading(false);return}
   setImages(x=>[...x,{...pi,media:m} as ProductImage]);setUploading(false);
 }
 async function setImageVariant(image:ProductImage,variantId:string){
   if(!supabase)return; const value=variantId||null; const {error}=await supabase.from("product_images").update({variant_id:value}).eq("id",image.id); if(error)setError(error.message);else setImages(x=>x.map(i=>i.id===image.id?{...i,variant_id:value}:i));
 }
 async function reorderImages(draggedId:string,targetId:string){
   if(!supabase||draggedId===targetId)return;
   const ordered=[...images].sort((a,b)=>a.display_order-b.display_order); const from=ordered.findIndex(i=>i.id===draggedId); const to=ordered.findIndex(i=>i.id===targetId); if(from<0||to<0)return;
   const [moved]=ordered.splice(from,1);ordered.splice(to,0,moved); const next=ordered.map((img,index)=>({...img,display_order:index}));setImages(next);
   for(const img of next){const {error}=await supabase.from("product_images").update({display_order:img.display_order}).eq("id",img.id);if(error){setError(error.message);return}}
 }
 async function makePrimary(imageId:string){
   if(!supabase||!id)return; const current=images.find(i=>i.is_primary); if(current&&current.id!==imageId)await supabase.from("product_images").update({is_primary:false}).eq("id",current.id);
   const {error}=await supabase.from("product_images").update({is_primary:true}).eq("id",imageId); if(error)setError(error.message);else setImages(x=>x.map(i=>({...i,is_primary:i.id===imageId})));
 }
 async function deleteImage(image:ProductImage){
   if(!supabase)return; const {error}=await supabase.from("product_images").delete().eq("id",image.id); if(error){setError(error.message);return}
   await supabase.from("media").delete().eq("id",image.media_id); if(image.media?.storage_path)await supabase.storage.from("product-images").remove([image.media.storage_path]); setImages(x=>x.filter(i=>i.id!==image.id));
 }
 function imageUrl(path:string){return supabase?.storage.from("product-images").getPublicUrl(path).data.publicUrl||""}
 function publicationProblems(){const live=variants.filter(v=>!v._deleted&&v.active);const problems:string[]=[];if(!form.category_id)problems.push("ангилал");if(images.length===0)problems.push("зураг");if(live.length===0)problems.push("идэвхтэй хувилбар");if(live.some(v=>Number(v.price)<=0))problems.push("үнэ");return problems}
 async function save(e:FormEvent){e.preventDefault();if(!supabase)return;setError("");setSaved(false);if(form.status==="published"){const problems=publicationProblems();if(problems.length){setError("Нийтлэхийн өмнө дараах мэдээллийг бөглөнө үү: "+problems.join(", ")+".");return}}setSaving(true);
   const generatedSlug=slugify(form.internal_reference);if(!generatedSlug){setError("Дотоод код оруулна уу.");setSaving(false);return}const payload={...form,slug:creating?generatedSlug:form.slug,short_description:form.short_description||null,description:form.description||null,material:form.material||null,dimensions:form.dimensions||null,category_id:form.category_id||null,custom_order_note:form.custom_order_note||null};
   if(creating){const {data,error}=await supabase.from("products").insert(payload).select("id").single();if(error)setError(error.message);else if(data){const ve=await saveVariants(data.id);if(ve)setError(ve.message);else nav("/admin/products/"+data.id,{replace:true});}}
   else {const {error}=await supabase.from("products").update(payload).eq("id",id!);if(error)setError(error.message);else {const ve=await saveVariants(id!);if(ve)setError(ve.message);else setSaved(true);}}
   setSaving(false);
 }
 if(loading)return <main className="admin-content"><p>Уншиж байна…</p></main>;
 return <main className="admin-content"><div className="admin-editor-head"><div><Link to="/admin/products">← Бүтээгдэхүүн</Link><p className="admin-kicker">MEIRO / ADMIN</p><h1>{creating?"Шинэ бүтээгдэхүүн":form.name||"Бүтээгдэхүүн"}</h1></div><button form="product-form" className="admin-primary" disabled={saving}>{saving?"Хадгалж байна…":"Хадгалах"}</button></div>
 {error&&<p className="admin-error admin-message">{error}</p>}{saved&&<p className="admin-success admin-message">Өөрчлөлт хадгалагдлаа.</p>}
 <form id="product-form" className="admin-editor" onSubmit={save}>
  <section className="admin-panel"><h2>Үндсэн мэдээлэл</h2><div className="admin-fields">
   <label className="wide">Нэр<input value={form.name} onChange={e=>set("name",e.target.value)} required /></label>
   <label>Дотоод код<input value={form.internal_reference} onChange={e=>set("internal_reference",e.target.value.toUpperCase())} placeholder="Жишээ: NHG" required /></label>
   <div className="admin-category-field"><label>Ангилал<select value={form.category_id} onChange={e=>set("category_id",e.target.value)}><option value="">—</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="admin-inline-add"><input aria-label="Шинэ ангилал" placeholder="Шинэ ангилал…" value={newCategory} onChange={e=>setNewCategory(e.target.value)} /><button type="button" onClick={addCategory} disabled={addingCategory||!newCategory.trim()}>{addingCategory?"…":"+ Нэмэх"}</button></div></div>
   <label className="wide">Товч тайлбар<textarea value={form.short_description} onChange={e=>set("short_description",e.target.value)} rows={2}/></label>
   <label className="wide">Дэлгэрэнгүй тайлбар<textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={5}/></label>
   <label>Материал<input value={form.material} onChange={e=>set("material",e.target.value)}/></label><label>Хэмжээ<input value={form.dimensions} onChange={e=>set("dimensions",e.target.value)}/></label>
  </div></section>
  <section className="admin-panel admin-variants-panel"><div className="admin-section-head"><div><h2>Хувилбарууд</h2><p>Өнгө, үнэ болон SKU кодыг энд удирдана.</p></div><button type="button" className="admin-secondary" onClick={addVariant}>+ Хувилбар нэмэх</button></div>
   <div className="admin-variants">{variants.map((v,i)=>v._deleted?null:<div className="admin-variant" key={v.id??i}>
    <div className="admin-variant-top"><strong>{v.name||v.color||`Хувилбар ${i+1}`}</strong><button type="button" onClick={()=>removeVariant(i)}>Устгах</button></div>
    <div className="admin-variant-grid"><label>Нэр<input value={v.name} onChange={e=>updateVariant(i,{name:e.target.value})} placeholder="Жишээ: Хөх"/></label><label>Өнгө<input value={v.color??""} onChange={e=>updateVariant(i,{color:e.target.value})}/></label><label>SKU<input value={v.sku} onChange={e=>updateVariant(i,{sku:e.target.value.toUpperCase()})} required/></label><label>Үнэ (₮)<input type="number" min="0" step="1" value={v.price} onChange={e=>updateVariant(i,{price:Number(e.target.value)})} required/></label></div>
    <div className="admin-variant-options"><label className="admin-check"><input type="checkbox" checked={v.active} onChange={e=>updateVariant(i,{active:e.target.checked})}/> Идэвхтэй</label><label className="admin-check"><input type="checkbox" checked={v.made_to_order} onChange={e=>updateVariant(i,{made_to_order:e.target.checked})}/> Захиалгаар хийх</label>{v.made_to_order&&<label>Хийх хугацаа (хоног)<input type="number" min="1" value={v.lead_time_days??""} onChange={e=>updateVariant(i,{lead_time_days:e.target.value?Number(e.target.value):null})}/></label>}</div>
   </div>)}</div>{variants.filter(v=>!v._deleted).length===0&&<p className="admin-empty">Хувилбар нэмээгүй байна.</p>}
  </section>
  <section className="admin-panel admin-media-panel"><div className="admin-section-head"><div><h2>Зураг</h2><p>Бүтээгдэхүүн болон хувилбарын зургууд.</p></div>{!creating&&<label className="admin-upload-button">{uploading?"Оруулж байна…":"+ Зураг нэмэх"}<input type="file" accept="image/*" disabled={uploading} onChange={e=>{const file=e.target.files?.[0];if(file)uploadImage(file);e.currentTarget.value=""}}/></label>}</div>
   {creating?<p className="admin-empty">Эхлээд бүтээгдэхүүнийг хадгална уу.</p>:images.length===0?<p className="admin-empty">Зураг нэмээгүй байна.</p>:<div className="admin-image-grid">{[...images].sort((a,b)=>a.display_order-b.display_order).map(image=><div className={`admin-image-card ${draggedImageId===image.id?"is-dragging":""}`} key={image.id} draggable onDragStart={()=>setDraggedImageId(image.id)} onDragEnd={()=>setDraggedImageId(null)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(draggedImageId)reorderImages(draggedImageId,image.id);setDraggedImageId(null)}}>
    {image.media&&<div className="admin-image-preview"><img src={imageUrl(image.media.storage_path)} alt={image.media.alt_text||form.name}/><span className="admin-drag-hint">⋮⋮</span>{image.is_primary&&<span className="admin-primary-badge">Үндсэн зураг</span>}</div>}
    <div className="admin-image-card-body"><select value={image.variant_id||""} onChange={e=>setImageVariant(image,e.target.value)}><option value="">Бүх бүтээгдэхүүн</option>{variants.filter(v=>v.id&&!v._deleted).map(v=><option key={v.id} value={v.id}>{v.color||v.name||v.sku}</option>)}</select>
    <div className="admin-image-actions"><button type="button" className={image.is_primary?"is-primary":""} onClick={()=>makePrimary(image.id)}>{image.is_primary?"Үндсэн зураг":"Үндсэн болгох"}</button><button type="button" onClick={()=>deleteImage(image)}>Устгах</button></div></div>
   </div>)}</div>}
  </section>
  <div className="admin-editor-bottom"><button form="product-form" type="submit" className="admin-primary" disabled={saving}>{saving?"Хадгалж байна…":"Хадгалах"}</button></div>
  <aside className="admin-editor-side"><section className="admin-panel"><h2>Нийтлэх</h2><label>Төлөв<select value={form.status} onChange={e=>set("status",e.target.value as Form["status"])}><option value="draft">Ноорог</option><option value="published">Нийтэлсэн</option><option value="hidden">Нуусан</option></select></label><label>Дараалал<input type="number" value={form.display_order} onChange={e=>set("display_order",Number(e.target.value))}/></label><label className="admin-check"><input type="checkbox" checked={form.featured} onChange={e=>set("featured",e.target.checked)}/> Онцлох бүтээгдэхүүн</label></section>
  <section className="admin-panel"><h2>Захиалгын өнгө</h2><label className="admin-check"><input type="checkbox" checked={form.custom_order_available} onChange={e=>set("custom_order_available",e.target.checked)}/> Өөр өнгөөр захиалах боломжтой</label>{form.custom_order_available&&<label>Тайлбар<textarea value={form.custom_order_note} onChange={e=>set("custom_order_note",e.target.value)} rows={3}/></label>}</section></aside>
 </form></main>
}
