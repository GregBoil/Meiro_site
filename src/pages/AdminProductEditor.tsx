import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../services/supabase";

type Category={id:string;name:string};
type Variant={id?:string;name:string;color:string;sku:string;price:number;active:boolean;made_to_order:boolean;lead_time_days:number|null;display_order:number;quantity_on_hand:number;quantity_reserved:number;low_stock_threshold:number;track_inventory:boolean;_deleted?:boolean};
type ProductImage={id:string;variant_id:string|null;media_id:string;is_primary:boolean;display_order:number;media:{storage_path:string;filename:string;alt_text:string|null}|null};
type Form={name:string;slug:string;internal_reference:string;short_description:string;description:string;material:string;dimensions:string;category_id:string;status:"draft"|"published"|"hidden";featured:boolean;custom_order_available:boolean;custom_order_note:string;display_order:number};
const empty:Form={name:"",slug:"",internal_reference:"",short_description:"",description:"",material:"",dimensions:"",category_id:"",status:"draft",featured:false,custom_order_available:false,custom_order_note:"",display_order:0};
const mnMap:Record<string,string>={а:"a",б:"b",в:"v",г:"g",д:"d",е:"ye",ё:"yo",ж:"j",з:"z",и:"i",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",ө:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ү:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sh",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"};
const slugify=(s:string)=>s.toLowerCase().split("").map(ch=>mnMap[ch]??ch).join("").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

export default function AdminProductEditor(){
 const {id}=useParams(); const creating=id==="new"; const nav=useNavigate(); const topRef=useRef<HTMLElement|null>(null);
 const [form,setForm]=useState<Form>(empty); const [productId,setProductId]=useState<string|null>(creating?null:(id??null)); const [library,setLibrary]=useState<{id:string;storage_path:string;filename:string;alt_text:string|null}[]>([]); const [showLibrary,setShowLibrary]=useState(false); const [variants,setVariants]=useState<Variant[]>([]); const [images,setImages]=useState<ProductImage[]>([]); const [uploading,setUploading]=useState(false); const [draggedImageId,setDraggedImageId]=useState<string|null>(null); const [categories,setCategories]=useState<Category[]>([]); const [newCategory,setNewCategory]=useState(""); const [addingCategory,setAddingCategory]=useState(false); const [loading,setLoading]=useState(!creating); const [saving,setSaving]=useState(false); const [variantErrors,setVariantErrors]=useState<Record<number,string>>({}); const [error,setError]=useState(""); const [saved,setSaved]=useState(false);
 useEffect(()=>{(async()=>{if(!supabase){setError("Supabase тохируулаагүй байна.");setLoading(false);return}
   const {data:c}=await supabase.from("categories").select("id,name").order("display_order"); setCategories((c??[]) as Category[]);
   if(!creating){const {data,error}=await supabase.from("products").select("name,slug,internal_reference,short_description,description,material,dimensions,category_id,status,featured,custom_order_available,custom_order_note,display_order").eq("id",id!).single();
     if(error)setError(error.message); else setForm({...empty,...data} as Form);
     const productRef=String(data?.internal_reference??"").trim().toUpperCase();
     const variantPrefix=productRef?`${productRef}-`:"";
     const {data:v,error:ve}=await supabase.from("product_variants").select("id,name,color,sku,price,active,made_to_order,lead_time_days,display_order").eq("product_id",id!).order("display_order"); if(ve)setError(ve.message); else setVariants(((v??[]) as any[]).map(row=>{const storedSku=String(row.sku??"").trim().toUpperCase();const suffix=variantPrefix&&storedSku.startsWith(variantPrefix)?storedSku.slice(variantPrefix.length):storedSku;return {...row,sku:suffix,quantity_on_hand:0,quantity_reserved:0,low_stock_threshold:2,track_inventory:true}}));
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
 function addVariant(){setVariants(v=>[...v,{name:"",color:"",sku:"",price:0,active:true,made_to_order:false,lead_time_days:null,display_order:v.filter(x=>!x._deleted).length,quantity_on_hand:0,quantity_reserved:0,low_stock_threshold:2,track_inventory:true}])}
 function updateVariant(i:number,patch:Partial<Variant>){setVariants(v=>v.map((x,j)=>j===i?{...x,...patch}:x));setVariantErrors(e=>{if(!e[i])return e;const n={...e};delete n[i];return n})}
 async function removeVariant(i:number){
   if(!supabase)return;const v=variants[i];if(!v)return;
   if(!v.id){setVariants(x=>x.filter((_,j)=>j!==i));return}
   const confirmed=window.confirm("Энэ хувилбарыг устгах уу?\n\nХувилбартай холбоотой зураг, нөөцийн мэдээлэл бүтээгдэхүүнээс хасагдана. Медиа сан дахь зургууд устахгүй.");
   if(!confirmed)return;
   const {error}=await supabase.rpc("admin_delete_product_variant",{p_variant_id:v.id});
   if(error){setVariantErrors(e=>({...e,[i]:error.message}));return}
   const removedImageIds=new Set(images.filter(image=>image.variant_id===v.id).map(image=>image.id));
   const remaining=images.filter(image=>!removedImageIds.has(image.id));
   const removedPrimary=images.some(image=>image.variant_id===v.id&&image.is_primary);
   if(removedPrimary&&remaining.length){
     const general=[...remaining].filter(image=>!image.variant_id).sort((a,b)=>a.display_order-b.display_order);
     const next=(general[0]??[...remaining].sort((a,b)=>a.display_order-b.display_order)[0]);
     setImages(remaining.map(image=>({...image,is_primary:image.id===next.id})));
   }else setImages(remaining);
   setVariants(x=>x.filter((_,j)=>j!==i));
   setVariantErrors({});
 }
 async function saveVariant(i:number){
   if(!supabase)return;const v=variants[i];if(!v||v._deleted)return;
   if(!v.name.trim()||!v.sku.trim()||Number(v.price)<=0){setVariantErrors(e=>({...e,[i]:"Нэр, хувилбарын дотоод код болон үнийг бүрэн бөглөнө үү."}));return}
   let pid=productId;if(!pid){pid=await ensureDraft();if(!pid)return}
   setSaving(true);setError("");
   const payload={product_id:pid,name:v.name.trim(),color:null,sku:`${form.internal_reference.trim().toUpperCase()}-${v.sku.trim().toUpperCase()}`,price:Number(v.price),active:v.active,made_to_order:v.made_to_order,lead_time_days:v.made_to_order&&v.lead_time_days?Number(v.lead_time_days):null,display_order:v.display_order};
   if(v.id){const {error}=await supabase.from("product_variants").update(payload).eq("id",v.id);if(error){setVariantErrors(e=>({...e,[i]:error.code==="23505"?"Энэ хувилбарын дотоод код аль хэдийн ашиглагдаж байна.":error.message}));setSaving(false);return}}
   else {const {data,error}=await supabase.from("product_variants").insert(payload).select("id").single();if(error||!data){setVariantErrors(e=>({...e,[i]:error?.code==="23505"?"Энэ хувилбарын дотоод код аль хэдийн ашиглагдаж байна.":error?.message||"Хувилбарыг хадгалж чадсангүй."}));setSaving(false);return}setVariants(x=>x.map((item,j)=>j===i?{...item,id:data.id}:item))}
   setVariantErrors(e=>{const n={...e};delete n[i];return n});setSaving(false);
 }
 async function saveVariants(productId:string){
   if(!supabase)return null;
   for(const v of variants){
     if(v._deleted){if(v.id){const {error}=await supabase.from("product_variants").delete().eq("id",v.id);if(error)return error}continue}
     const payload={product_id:productId,name:v.name.trim()||"Хувилбар",color:null,sku:`${form.internal_reference.trim().toUpperCase()}-${v.sku.trim().toUpperCase()}`,price:Number(v.price)||0,active:v.active,made_to_order:v.made_to_order,lead_time_days:v.made_to_order&&v.lead_time_days?Number(v.lead_time_days):null,display_order:v.display_order};
     if(v.id){const {error}=await supabase.from("product_variants").update(payload).eq("id",v.id);if(error)return error}
     else {const {data,error}=await supabase.from("product_variants").insert(payload).select("id").single();if(error)return error;if(data)v.id=data.id}
   }
   setVariants([...variants]); return null;
 }
 async function ensureDraft(){
   if(!supabase)return null;if(productId)return productId;
   if(!form.name.trim()||!form.internal_reference.trim()){setError("Зураг нэмэхийн өмнө нэр болон дотоод кодыг оруулна уу.");return null}
   const generatedSlug=slugify(form.internal_reference);if(!generatedSlug){setError("Дотоод код оруулна уу.");return null}
   const payload={...form,status:"draft" as const,slug:generatedSlug,short_description:form.short_description||null,description:form.description||null,material:form.material||null,dimensions:form.dimensions||null,category_id:form.category_id||null,custom_order_note:form.custom_order_note||null};
   const {data,error}=await supabase.from("products").insert(payload).select("id").single();
   if(error||!data){showError(productErrorMessage(error));return null}
   setProductId(data.id);setForm(x=>({...x,slug:generatedSlug,status:"draft"}));nav("/admin/products/"+data.id,{replace:true});return data.id;
 }
 async function uploadImage(file:File){
   if(!supabase)return; setUploading(true);setError(""); const pid=await ensureDraft();if(!pid){setUploading(false);return}
   const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,"-"); const path=`${form.slug||slugify(form.internal_reference)||pid}/${Date.now()}-${safe}`;
   const {error:ue}=await supabase.storage.from("product-images").upload(path,file,{contentType:file.type,upsert:false}); if(ue){setError(ue.message);setUploading(false);return}
   const {data:m,error:me}=await supabase.from("media").insert({storage_path:path,filename:file.name,alt_text:form.name||file.name,mime_type:file.type||null,file_size:file.size}).select("id,storage_path,filename,alt_text").single();
   if(me||!m){await supabase.storage.from("product-images").remove([path]);setError(me?.message||"Зураг хадгалж чадсангүй.");setUploading(false);return}
   const {data:pi,error:pe}=await supabase.from("product_images").insert({product_id:pid,media_id:m.id,is_primary:images.length===0,display_order:images.length}).select("id,variant_id,media_id,is_primary,display_order").single();
   if(pe||!pi){await supabase.from("media").delete().eq("id",m.id);await supabase.storage.from("product-images").remove([path]);setError(pe?.message||"Зураг холбож чадсангүй.");setUploading(false);return}
   setImages(x=>[...x,{...pi,media:m} as ProductImage]);setUploading(false);
 }
 async function openLibrary(){if(!supabase)return;setError("");const {data,error}=await supabase.from("media").select("id,storage_path,filename,alt_text").order("created_at",{ascending:false});if(error)setError(error.message);else{setLibrary((data??[]) as any[]);setShowLibrary(true)}}
 async function attachMedia(media:{id:string;storage_path:string;filename:string;alt_text:string|null}){if(!supabase)return;const pid=await ensureDraft();if(!pid)return;if(images.some(i=>i.media_id===media.id)){setError("Энэ зураг бүтээгдэхүүнд аль хэдийн нэмэгдсэн байна.");return}const {data,error}=await supabase.from("product_images").insert({product_id:pid,media_id:media.id,is_primary:images.length===0,display_order:images.length}).select("id,variant_id,media_id,is_primary,display_order").single();if(error||!data){setError(error?.message||"Зураг холбож чадсангүй.");return}setImages(x=>[...x,{...data,media} as ProductImage]);setShowLibrary(false)}
 async function setImageVariant(image:ProductImage,variantId:string){
   if(!supabase)return; const value=variantId||null; const {error}=await supabase.from("product_images").update({variant_id:value}).eq("id",image.id); if(error)showError(error.message);else setImages(x=>x.map(i=>i.id===image.id?{...i,variant_id:value}:i));
 }
 async function reorderImages(draggedId:string,targetId:string){
   if(!supabase||draggedId===targetId)return;
   const ordered=[...images].sort((a,b)=>a.display_order-b.display_order); const from=ordered.findIndex(i=>i.id===draggedId); const to=ordered.findIndex(i=>i.id===targetId); if(from<0||to<0)return;
   const [moved]=ordered.splice(from,1);ordered.splice(to,0,moved); const next=ordered.map((img,index)=>({...img,display_order:index}));setImages(next);
   for(const img of next){const {error}=await supabase.from("product_images").update({display_order:img.display_order}).eq("id",img.id);if(error){setError(error.message);return}}
 }
 async function makePrimary(imageId:string){
   if(!supabase)return;
   const {error}=await supabase.rpc("admin_set_primary_product_image",{p_image_id:imageId});
   if(error){showError(error.message);return}
   setImages(x=>x.map(i=>({...i,is_primary:i.id===imageId})));
 }
 async function deleteImage(image:ProductImage){
   if(!supabase)return;
   const {error}=await supabase.rpc("admin_remove_product_image",{p_image_id:image.id});
   if(error){showError(error.message);return}
   const remaining=images.filter(i=>i.id!==image.id);
   if(image.is_primary&&remaining.length){
     const next=[...remaining].sort((a,b)=>a.display_order-b.display_order)[0];
     setImages(remaining.map(i=>({...i,is_primary:i.id===next.id})));
   }else setImages(remaining);
 }
 function imageUrl(path:string){return supabase?.storage.from("product-images").getPublicUrl(path).data.publicUrl||""}
 async function deleteProduct(){
   if(!supabase||creating||!id)return;
   if(!window.confirm(`“${form.name}” бүтээгдэхүүнийг бүр мөсөн устгах уу? Медиа сан дахь зургууд устахгүй.`))return;
   setError("");setSaving(true);
   const {error}=await supabase.rpc("admin_delete_product",{p_product_id:id});
   if(error){setError(error.message);setSaving(false);return}
   nav("/admin/products",{replace:true});
 }
 function publicationProblems(){const live=variants.filter(v=>!v._deleted&&v.active);const problems:string[]=[];if(!form.category_id)problems.push("ангилал");if(images.length===0)problems.push("зураг");if(live.length===0)problems.push("идэвхтэй хувилбар");if(live.some(v=>Number(v.price)<=0))problems.push("үнэ");return problems}
 function showError(message:string){setError(message);setSaved(false);requestAnimationFrame(()=>topRef.current?.scrollIntoView({behavior:"smooth",block:"start"}))}
 function productErrorMessage(error:any){
   if(error?.code==="23505"&&(String(error?.message||"").includes("internal_reference")||String(error?.details||"").includes("internal_reference")))return `“${form.internal_reference}” дотоод кодтой бүтээгдэхүүн аль хэдийн байна. Өөр код оруулна уу.`;
   if(error?.code==="23505"&&String(error?.message||"").includes("slug"))return `“${form.internal_reference}” кодоос үүссэн хаяг аль хэдийн ашиглагдаж байна. Өөр дотоод код оруулна уу.`;
   return error?.message||"Бүтээгдэхүүнийг хадгалж чадсангүй.";
 }
 async function save(e:FormEvent){e.preventDefault();if(!supabase)return;setError("");setSaved(false);if(form.status==="published"){const problems=publicationProblems();if(problems.length){setError("Нийтлэхийн өмнө дараах мэдээллийг бөглөнө үү: "+problems.join(", ")+".");return}}setSaving(true);
   const generatedSlug=slugify(form.internal_reference);if(!generatedSlug){setError("Дотоод код оруулна уу.");setSaving(false);return}const payload={...form,slug:creating?generatedSlug:form.slug,short_description:form.short_description||null,description:form.description||null,material:form.material||null,dimensions:form.dimensions||null,category_id:form.category_id||null,custom_order_note:form.custom_order_note||null};
   if(creating){const {data,error}=await supabase.from("products").insert(payload).select("id").single();if(error)showError(productErrorMessage(error));else if(data){const ve=await saveVariants(data.id);if(ve)setError(ve.message);else nav("/admin/products/"+data.id,{replace:true});}}
   else {const {error}=await supabase.from("products").update(payload).eq("id",id!);if(error)showError(productErrorMessage(error));else {const ve=await saveVariants(id!);if(ve)setError(ve.message);else {setSaved(true);topRef.current?.scrollIntoView({behavior:"smooth",block:"start"});}}}
   setSaving(false);
 }
 if(loading)return <main className="admin-content"><p>Уншиж байна…</p></main>;
 return <main className="admin-content" ref={topRef}><div className="admin-editor-head"><div><Link to="/admin/products">← Бүтээгдэхүүн</Link><p className="admin-kicker">MEIRO / ADMIN</p><h1>{creating?"Шинэ бүтээгдэхүүн":form.name||"Бүтээгдэхүүн"}</h1></div><button form="product-form" className="admin-primary" disabled={saving}>{saving?"Хадгалж байна…":"Хадгалах"}</button></div>
 {error&&<p className="admin-error admin-message">{error}</p>}{saved&&<p className="admin-success admin-message">Өөрчлөлт хадгалагдлаа.</p>}
 <form id="product-form" className="admin-editor" onSubmit={save}>
  <section className="admin-panel"><h2>Үндсэн мэдээлэл</h2><div className="admin-fields">
   <div className="admin-name-code-row"><label>Нэр<input value={form.name} onChange={e=>set("name",e.target.value)} required /></label><label>Дотоод код<input value={form.internal_reference} onChange={e=>set("internal_reference",e.target.value.toUpperCase())} placeholder="Жишээ: NHG" required /></label></div>
   <div className="admin-category-field wide"><label>Ангилал<select value={form.category_id} onChange={e=>set("category_id",e.target.value)}><option value="">—</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="admin-inline-add"><input aria-label="Шинэ ангилал" placeholder="Шинэ ангилал…" value={newCategory} onChange={e=>setNewCategory(e.target.value)} /><button type="button" onClick={addCategory} disabled={addingCategory||!newCategory.trim()}>{addingCategory?"…":"+ Нэмэх"}</button></div></div>
   <label className="wide">Товч тайлбар<textarea value={form.short_description} onChange={e=>set("short_description",e.target.value)} rows={2}/></label>
   <label className="wide">Дэлгэрэнгүй тайлбар<textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={5}/></label>
   <label>Материал<input value={form.material} onChange={e=>set("material",e.target.value)}/></label><label>Хэмжээ<input value={form.dimensions} onChange={e=>set("dimensions",e.target.value)}/></label>
  </div></section>
  <section className="admin-panel admin-variants-panel"><div className="admin-section-head"><div><h2>Хувилбарууд</h2><p>Хувилбар, үнэ болон дотоод кодыг энд удирдана.</p></div></div>
   <div className="admin-variants">{variants.map((v,i)=>v._deleted?null:<div className="admin-variant" key={v.id??i}>
    <div className="admin-variant-top"><div><strong>{v.name||"Шинэ хувилбар"}{form.internal_reference&&v.sku&&<span className="admin-variant-title-code"> · {form.internal_reference.toUpperCase()}-{v.sku}</span>}</strong>{!v.id&&<span className="admin-draft-badge">Ноорог</span>}</div><div className="admin-variant-actions"><button type="button" className="admin-secondary" disabled={saving} onClick={()=>saveVariant(i)}>Хадгалах</button><button type="button" onClick={()=>removeVariant(i)}>Устгах</button></div></div>
    <div className="admin-variant-grid"><label>Хувилбарын нэр<input value={v.name} onChange={e=>updateVariant(i,{name:e.target.value})} placeholder="Жишээ: Хөх, Том, Зүүн"/></label><label>Хувилбарын дотоод код<input value={v.sku} onChange={e=>updateVariant(i,{sku:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"")})} placeholder="Жишээ: BLU" required/></label><label>Үнэ (₮)<input type="number" min="0" step="1" value={v.price} onChange={e=>updateVariant(i,{price:Number(e.target.value)})} required/></label></div>{variantErrors[i]&&<div className="admin-variant-error">{variantErrors[i]}</div>}
    <div className="admin-variant-options"><label className="admin-check"><input type="checkbox" checked={v.active} onChange={e=>updateVariant(i,{active:e.target.checked})}/> Идэвхтэй</label><label className="admin-check"><input type="checkbox" checked={v.made_to_order} onChange={e=>updateVariant(i,{made_to_order:e.target.checked})}/> Захиалгаар хийх</label>{v.made_to_order&&<label>Хийх хугацаа (хоног)<input type="number" min="1" value={v.lead_time_days??""} onChange={e=>updateVariant(i,{lead_time_days:e.target.value?Number(e.target.value):null})}/></label>}</div>
   </div>)}</div>{variants.filter(v=>!v._deleted).length===0&&<p className="admin-empty">Хувилбар нэмээгүй байна.</p>}<button type="button" className="admin-secondary admin-add-variant-bottom" onClick={addVariant}>+ Хувилбар нэмэх</button>
  </section>
  <section className="admin-panel admin-media-panel"><div className="admin-section-head"><div><h2>Зураг</h2><p>Бүтээгдэхүүн болон хувилбарын зургууд.</p></div><div className="admin-media-add-actions"><button type="button" className="admin-secondary" onClick={openLibrary}>Медиагаас сонгох</button><label className="admin-upload-button">{uploading?"Оруулж байна…":"+ Шинэ зураг"}<input type="file" accept="image/*" disabled={uploading} onChange={e=>{const file=e.target.files?.[0];if(file)uploadImage(file);e.currentTarget.value=""}}/></label></div></div>
   {showLibrary&&<div className="admin-library-picker"><div className="admin-library-picker-head"><strong>Медиагаас сонгох</strong><button type="button" onClick={()=>setShowLibrary(false)}>×</button></div><div className="admin-library-picker-grid">{library.map(m=><button type="button" key={m.id} className={images.some(i=>i.media_id===m.id)?"already-used":""} disabled={images.some(i=>i.media_id===m.id)} onClick={()=>attachMedia(m)}><img src={imageUrl(m.storage_path)} alt={m.alt_text||m.filename}/><span>{m.filename}</span></button>)}</div></div>}
   {images.length===0?<p className="admin-empty">Зураг нэмээгүй байна.</p>:<div className="admin-image-grid">{[...images].sort((a,b)=>a.display_order-b.display_order).map(image=><div className={`admin-image-card ${draggedImageId===image.id?"is-dragging":""}`} key={image.id} draggable onDragStart={()=>setDraggedImageId(image.id)} onDragEnd={()=>setDraggedImageId(null)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(draggedImageId)reorderImages(draggedImageId,image.id);setDraggedImageId(null)}}>
    {image.media&&<div className="admin-image-preview"><img src={imageUrl(image.media.storage_path)} alt={image.media.alt_text||form.name}/><span className="admin-drag-hint">⋮⋮</span>{image.is_primary&&<span className="admin-primary-badge">Үндсэн зураг</span>}</div>}
    <div className="admin-image-card-body"><select value={image.variant_id||""} onChange={e=>setImageVariant(image,e.target.value)}><option value="">Бүх бүтээгдэхүүн</option>{variants.filter(v=>v.id&&!v._deleted).map(v=><option key={v.id} value={v.id}>{v.color||v.name||v.sku}</option>)}</select>
    <div className="admin-image-actions"><button type="button" className={image.is_primary?"is-primary":""} onClick={()=>makePrimary(image.id)}>{image.is_primary?"Үндсэн зураг":"Үндсэн болгох"}</button><button type="button" onClick={()=>deleteImage(image)}>Хасах</button></div></div>
   </div>)}</div>}
  </section>
  {!creating&&<section className="admin-panel admin-danger-zone"><div><h2>Аюултай бүс</h2><p>Бүтээгдэхүүн болон түүнтэй холбоотой хувилбар, нөөцийн мэдээллийг бүр мөсөн устгана. Медиа сан дахь зургууд хадгалагдана.</p></div><button type="button" onClick={deleteProduct} disabled={saving}>Бүтээгдэхүүн устгах</button></section>}
  <div className="admin-editor-bottom"><button form="product-form" type="submit" className="admin-primary" disabled={saving}>{saving?"Хадгалж байна…":"Хадгалах"}</button></div>
  <aside className="admin-editor-side"><section className="admin-panel"><h2>Нийтлэх</h2><label>Төлөв<select value={form.status} onChange={e=>set("status",e.target.value as Form["status"])}><option value="draft">Ноорог</option><option value="published">Нийтэлсэн</option><option value="hidden">Нуусан</option></select></label><label>Дараалал<input type="number" value={form.display_order} onChange={e=>set("display_order",Number(e.target.value))}/></label><label className="admin-check"><input type="checkbox" checked={form.featured} onChange={e=>set("featured",e.target.checked)}/> Онцлох бүтээгдэхүүн</label></section>
  <section className="admin-panel"><h2>Захиалгын өнгө</h2><label className="admin-check"><input type="checkbox" checked={form.custom_order_available} onChange={e=>set("custom_order_available",e.target.checked)}/> Өөр өнгөөр захиалах боломжтой</label>{form.custom_order_available&&<label>Тайлбар<textarea value={form.custom_order_note} onChange={e=>set("custom_order_note",e.target.value)} rows={3}/></label>}</section></aside>
 </form></main>
}
