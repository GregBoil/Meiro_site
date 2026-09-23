import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";

type Move={id:string;quantity_change:number;movement_type:string;reason:string|null;created_at:string;product_variants:{name:string;sku:string;products:{name:string}|null}|null};
const PAGE_SIZE=50;

export default function AdminInventoryHistory(){
  const [moves,setMoves]=useState<Move[]>([]); const [from,setFrom]=useState(""); const [to,setTo]=useState("");
  const [appliedFrom,setAppliedFrom]=useState(""); const [appliedTo,setAppliedTo]=useState(""); const [page,setPage]=useState(0);
  const [hasMore,setHasMore]=useState(false); const [loading,setLoading]=useState(true); const [error,setError]=useState("");

  async function load(){
    if(!supabase)return;setLoading(true);setError("");
    let query=supabase.from("stock_movements")
      .select("id,quantity_change,movement_type,reason,created_at,product_variants(name,sku,products(name))")
      .order("created_at",{ascending:false});
    if(appliedFrom)query=query.gte("created_at",appliedFrom+"T00:00:00");
    if(appliedTo){const end=new Date(appliedTo+"T00:00:00");end.setDate(end.getDate()+1);query=query.lt("created_at",end.toISOString())}
    const start=page*PAGE_SIZE; const {data,error}=await query.range(start,start+PAGE_SIZE);
    if(error){setError(error.message);setMoves([])}else{const result=(data??[]) as unknown as Move[];setHasMore(result.length>PAGE_SIZE);setMoves(result.slice(0,PAGE_SIZE))}
    setLoading(false);
  }
  useEffect(()=>{load()},[page,appliedFrom,appliedTo]);
  function apply(e:FormEvent){e.preventDefault();setPage(0);setAppliedFrom(from);setAppliedTo(to)}
  function clear(){setFrom("");setTo("");setPage(0);setAppliedFrom("");setAppliedTo("")}

  return <main className="admin-content">
    <div className="admin-page-head"><div><Link to="/admin/inventory">← Нөөц</Link><p className="admin-kicker">MEIRO / ADMIN</p><h1>Нөөцийн хөдөлгөөн</h1><p>Нөөцийн бүх өөрчлөлтийн түүх.</p></div></div>
    <section className="admin-panel"><form className="admin-history-filters" onSubmit={apply}>
      <label>Эхлэх огноо<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label>
      <label>Дуусах огноо<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label>
      <div className="admin-stock-actions"><button className="admin-primary" type="submit">Шүүх</button><button className="admin-secondary" type="button" onClick={clear}>Цэвэрлэх</button></div>
    </form></section>
    {error&&<p className="admin-error admin-message">{error}</p>}
    <section className="admin-panel admin-stock-history">
      {loading?<p>Уншиж байна…</p>:moves.length===0?<p className="admin-empty">Хөдөлгөөн алга байна.</p>:moves.map(m=><div className="admin-movement" key={m.id}><div><strong>{m.product_variants?.products?.name??"—"}</strong><small>{m.product_variants?.name??"—"} · {m.product_variants?.sku} · {m.reason||m.movement_type}</small></div><b>{m.quantity_change>0?"+":""}{m.quantity_change}</b><time>{new Date(m.created_at).toLocaleString("mn-MN",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}</time></div>)}
      <div className="admin-stock-actions"><button type="button" className="admin-secondary" disabled={page===0||loading} onClick={()=>setPage(p=>Math.max(0,p-1))}>← Өмнөх</button><span>{page+1}</span><button type="button" className="admin-secondary" disabled={!hasMore||loading} onClick={()=>setPage(p=>p+1)}>Дараах →</button></div>
    </section>
  </main>
}