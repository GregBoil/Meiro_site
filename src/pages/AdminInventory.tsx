import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";

type Row={
  variant_id:string; quantity_on_hand:number; quantity_reserved:number; low_stock_threshold:number; track_inventory:boolean;
  product_variants:{name:string;color:string|null;sku:string;display_order:number;product_id:string;products:{name:string;internal_reference:string;display_order:number}|null}|null;
};
type Move={id:string;quantity_change:number;movement_type:string;reason:string|null;created_at:string;product_variants:{sku:string;products:{name:string}|null}|null};

export default function AdminInventory(){
  const [rows,setRows]=useState<Row[]>([]); const [moves,setMoves]=useState<Move[]>([]);
  const [editing,setEditing]=useState<string|null>(null); const [draftQty,setDraftQty]=useState(0); const [draftThreshold,setDraftThreshold]=useState(2); const [draftTrack,setDraftTrack]=useState(true);
  const [saving,setSaving]=useState(false); const [error,setError]=useState("");

  async function load(){
    if(!supabase)return;
    const {data,error}=await supabase.from("inventory")
      .select("variant_id,quantity_on_hand,quantity_reserved,low_stock_threshold,track_inventory,product_variants(name,color,sku,display_order,product_id,products(name,internal_reference,display_order))");
    if(error)setError(error.message); else {
      const sorted=((data??[]) as unknown as Row[]).sort((a,b)=>{
        const ap=a.product_variants?.products?.display_order??0, bp=b.product_variants?.products?.display_order??0;
        if(ap!==bp)return ap-bp;
        const av=a.product_variants?.display_order??0, bv=b.product_variants?.display_order??0;
        if(av!==bv)return av-bv;
        return (a.product_variants?.name??"").localeCompare(b.product_variants?.name??"","mn");
      });
      setRows(sorted);
    }
    const {data:m}=await supabase.from("stock_movements").select("id,quantity_change,movement_type,reason,created_at,product_variants(sku,products(name))").order("created_at",{ascending:false}).limit(10);
    setMoves((m??[]) as unknown as Move[]);
  }
  useEffect(()=>{load()},[]);

  function begin(row:Row){setEditing(row.variant_id);setDraftQty(row.quantity_on_hand);setDraftThreshold(row.low_stock_threshold);setDraftTrack(row.track_inventory);setError("")}
  async function save(row:Row){
    if(!supabase)return;setSaving(true);setError("");
    const {error:ie}=await supabase.rpc("admin_adjust_inventory",{p_variant_id:row.variant_id,p_quantity_on_hand:draftQty,p_low_stock_threshold:draftThreshold,p_track_inventory:draftTrack});
    if(ie){setError(ie.message);setSaving(false);return} setEditing(null);setSaving(false);await load();
  }

  const groups=rows.reduce<{productId:string;name:string;ref:string;rows:Row[]}[]>((acc,row)=>{
    const product=row.product_variants?.products, productId=row.product_variants?.product_id??"unknown";
    let group=acc.find(g=>g.productId===productId);
    if(!group){group={productId,name:product?.name??"—",ref:product?.internal_reference??"",rows:[]};acc.push(group)}
    group.rows.push(row);return acc;
  },[]);

  return <main className="admin-content">
    <div className="admin-page-head"><div><p className="admin-kicker">MEIRO / ADMIN</p><h1>Нөөц</h1><p>Бүтээгдэхүүний нөөц болон хөдөлгөөнийг хянана.</p></div></div>
    {error&&<p className="admin-error admin-message">{error}</p>}
    <div className="admin-stock-list">{groups.map(group=><section className="admin-panel admin-stock-product" key={group.productId}>
      <div className="admin-section-head"><div><h2>{group.name}</h2>{group.ref&&<p>{group.ref}</p>}</div>{group.productId!=="unknown"&&<Link className="admin-secondary" to={"/admin/products/"+group.productId}>Бүтээгдэхүүн харах</Link>}</div>
      <div>{group.rows.map(row=>{
        const available=row.quantity_on_hand-row.quantity_reserved; const low=row.track_inventory&&available<=row.low_stock_threshold; const open=editing===row.variant_id;
        return <article className={"admin-stock-row "+(open?"is-editing":"")} key={row.variant_id}>
          <div className="admin-stock-name"><strong>{row.product_variants?.color||row.product_variants?.name||"—"}</strong><small>{row.product_variants?.sku}</small></div>
          {open?<div className="admin-stock-editor">
            <label>Нөөц<input type="number" min="0" value={draftQty} onChange={e=>setDraftQty(Math.max(0,Number(e.target.value)))}/></label>
            <label>Захиалсан<input type="number" value={row.quantity_reserved} disabled/></label>
            <label>Бэлэн<input type="number" value={Math.max(0,draftQty-row.quantity_reserved)} disabled/></label>
            <label>Бага нөөцийн босго<input type="number" min="0" value={draftThreshold} onChange={e=>setDraftThreshold(Math.max(0,Number(e.target.value)))}/></label>
            <label className="admin-check"><input type="checkbox" checked={draftTrack} onChange={e=>setDraftTrack(e.target.checked)}/> Нөөц хянах</label>
            <div className="admin-stock-actions"><button type="button" className="admin-primary" disabled={saving} onClick={()=>save(row)}>{saving?"Хадгалж байна…":"Хадгалах"}</button><button type="button" className="admin-secondary" onClick={()=>setEditing(null)}>Болих</button></div>
          </div>:<>
            <span className={"admin-stock-state "+(low?"low":"")}>{row.track_inventory?(available<=0?"Дууссан":low?"Цөөн үлдсэн":"Бэлэн"):"Хянахгүй"}</span>
            <div className="admin-stock-numbers"><span><small>Нөөц</small>{row.quantity_on_hand}</span><span><small>Захиалсан</small>{row.quantity_reserved}</span><span><small>Бэлэн</small>{Math.max(0,available)}</span></div>
            <button type="button" className="admin-secondary" onClick={()=>begin(row)}>Засах</button>
          </>}
        </article>
      })}</div>
    </section>)}</div>
    <section className="admin-panel admin-stock-history"><div className="admin-section-head"><h2>Сүүлийн хөдөлгөөн</h2><Link className="admin-secondary" to="/admin/inventory/history">Бүх хөдөлгөөнийг харах</Link></div>{moves.length===0?<p className="admin-empty">Хөдөлгөөн алга байна.</p>:moves.map(m=><div className="admin-movement" key={m.id}><div><strong>{m.product_variants?.products?.name??"—"}</strong><small>{m.product_variants?.sku} · {m.reason||m.movement_type}</small></div><b>{m.quantity_change>0?"+":""}{m.quantity_change}</b><time>{new Date(m.created_at).toLocaleString("mn-MN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}</time></div>)}</section>
  </main>
}