import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

type Row={
  variant_id:string;
  quantity_on_hand:number;
  quantity_reserved:number;
  low_stock_threshold:number;
  track_inventory:boolean;
  product_variants:{name:string;color:string|null;sku:string;product_id:string;products:{name:string}|null}|null;
};
type Move={id:string;quantity_change:number;movement_type:string;reason:string|null;created_at:string;product_variants:{sku:string;products:{name:string}|null}|null};

export default function AdminInventory(){
  const [rows,setRows]=useState<Row[]>([]);
  const [moves,setMoves]=useState<Move[]>([]);
  const [editing,setEditing]=useState<string|null>(null);
  const [draftQty,setDraftQty]=useState(0);
  const [draftThreshold,setDraftThreshold]=useState(2);
  const [draftTrack,setDraftTrack]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  async function load(){
    if(!supabase)return;
    const {data,error}=await supabase.from("inventory")
      .select("variant_id,quantity_on_hand,quantity_reserved,low_stock_threshold,track_inventory,product_variants(name,color,sku,product_id,products(name))")
      .order("updated_at",{ascending:false});
    if(error)setError(error.message); else setRows((data??[]) as unknown as Row[]);
    const {data:m}=await supabase.from("stock_movements")
      .select("id,quantity_change,movement_type,reason,created_at,product_variants(sku,products(name))")
      .order("created_at",{ascending:false}).limit(30);
    setMoves((m??[]) as unknown as Move[]);
  }
  useEffect(()=>{load()},[]);

  function begin(row:Row){
    setEditing(row.variant_id);
    setDraftQty(row.quantity_on_hand);
    setDraftThreshold(row.low_stock_threshold);
    setDraftTrack(row.track_inventory);
    setError("");
  }

  async function save(row:Row){
    if(!supabase)return;
    setSaving(true);setError("");
    const change=draftQty-row.quantity_on_hand;
    const {error:ie}=await supabase.from("inventory").update({
      quantity_on_hand:draftQty,
      low_stock_threshold:draftThreshold,
      track_inventory:draftTrack,
      updated_at:new Date().toISOString()
    }).eq("variant_id",row.variant_id);
    if(ie){setError(ie.message);setSaving(false);return}
    if(change!==0){
      const {error:me}=await supabase.from("stock_movements").insert({
        variant_id:row.variant_id,
        quantity_change:change,
        movement_type:"adjustment",
        reason:"Админ тохируулга"
      });
      if(me){setError(me.message);setSaving(false);return}
    }
    setEditing(null);setSaving(false);await load();
  }

  return <main className="admin-content">
    <div className="admin-page-head"><div><p className="admin-kicker">MEIRO / ADMIN</p><h1>Нөөц</h1><p>Бүтээгдэхүүний нөөц болон хөдөлгөөнийг хянана.</p></div></div>
    {error&&<p className="admin-error admin-message">{error}</p>}
    <div className="admin-stock-list">{rows.map(row=>{
      const available=row.quantity_on_hand-row.quantity_reserved;
      const low=row.track_inventory&&available<=row.low_stock_threshold;
      const open=editing===row.variant_id;
      return <article className={"admin-stock-row "+(open?"is-editing":"")} key={row.variant_id}>
        <div className="admin-stock-name"><strong>{row.product_variants?.products?.name??"—"}</strong><small>{row.product_variants?.color||row.product_variants?.name} · {row.product_variants?.sku}</small></div>
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
    <section className="admin-panel admin-stock-history"><h2>Сүүлийн хөдөлгөөн</h2>{moves.length===0?<p className="admin-empty">Хөдөлгөөн алга байна.</p>:moves.map(m=><div className="admin-movement" key={m.id}><div><strong>{m.product_variants?.products?.name??"—"}</strong><small>{m.product_variants?.sku} · {m.reason||m.movement_type}</small></div><b>{m.quantity_change>0?"+":""}{m.quantity_change}</b><time>{new Date(m.created_at).toLocaleDateString("mn-MN")}</time></div>)}</section>
  </main>
}
