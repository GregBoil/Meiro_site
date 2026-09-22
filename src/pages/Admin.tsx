import { FormEvent, useEffect, useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function checkAdmin() {
      if (!supabase || !session?.user) { setAuthorized(false); setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase.from("admin_profiles").select("id").eq("id", session.user.id).eq("active", true).maybeSingle();
      setAuthorized(!error && !!data);
      setLoading(false);
    }
    checkAdmin();
  }, [session]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("И-мэйл эсвэл нууц үг буруу байна.");
  }

  if (loading) return <main className="admin-login"><p>Уншиж байна…</p></main>;
  if (!session) return <main className="admin-login"><form className="admin-login-card" onSubmit={signIn}><p className="admin-kicker">MEIRO / ADMIN</p><h1>Нэвтрэх</h1><label>И-мэйл<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required /></label><label>Нууц үг<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required /></label>{error&&<p className="admin-error">{error}</p>}<button type="submit">Нэвтрэх</button></form></main>;
  if (!authorized) return <main className="admin-login"><div className="admin-login-card"><p className="admin-kicker">MEIRO / ADMIN</p><h1>Хандах эрхгүй</h1><p>Энэ хэрэглэгч админы эрхгүй байна.</p><button onClick={()=>supabase?.auth.signOut()}>Гарах</button></div></main>;

  return <div className={`admin-shell ${menuOpen?"menu-open":""}`}><header className="admin-mobile-bar"><div><strong>MEIRO</strong><span>ADMIN</span></div><button type="button" aria-label="Цэс" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?"×":"☰"}</button></header>{menuOpen&&<button className="admin-menu-backdrop" aria-label="Цэс хаах" onClick={()=>setMenuOpen(false)}/>}<aside className="admin-sidebar"><strong>MEIRO</strong><span>ADMIN</span><nav onClick={()=>setMenuOpen(false)}>
    <NavLink end to="/admin">Хянах самбар</NavLink><NavLink to="/admin/products">Бүтээгдэхүүн</NavLink>
    <NavLink to="/admin/inventory">Нөөц</NavLink><NavLink to="/admin/media">Медиа</NavLink><NavLink to="/admin/collections">Цуглуулга</NavLink><NavLink to="/admin/home">Нүүр хуудас</NavLink><span>Тохиргоо</span>
  </nav><button onClick={()=>supabase?.auth.signOut()}>Гарах</button></aside><Outlet /></div>;
}

export function AdminDashboard() {
  const [stats,setStats]=useState({products:0,drafts:0,low:0,out:0,unused:0,collections:0});
  useEffect(()=>{if(!supabase)return;Promise.all([
    supabase.from("products").select("status"),
    supabase.from("variant_availability").select("*"),
    supabase.from("media").select("id,product_images(id)"),
    supabase.from("collections").select("id",{count:"exact",head:true}).eq("active",true),
    supabase.from("homepage_carousel").select("media_id")
  ]).then(([p,v,m,col,home])=>{
    const products=(p.data??[]) as any[], availability=(v.data??[]) as any[], media=(m.data??[]) as any[]; const homepageMedia=new Set(((home.data??[]) as any[]).map(x=>x.media_id));
    const qty=(x:any)=>Number(x.quantity_available??x.available_quantity??(Number(x.quantity_on_hand??0)-Number(x.quantity_reserved??0)));
    setStats({
      products:products.length,
      drafts:products.filter(x=>x.status==="draft").length,
      out:availability.filter(x=>x.track_inventory!==false&&qty(x)<=0).length,
      low:availability.filter(x=>x.track_inventory!==false&&qty(x)>0&&qty(x)<=Number(x.low_stock_threshold??2)).length,
      unused:media.filter(x=>!x.product_images?.length&&!homepageMedia.has(x.id)).length,
      collections:col.count??0
    })
  })},[]);
  const cards=[
    {label:"Бүтээгдэхүүн",value:stats.products,note:`${stats.drafts} ноорог`,to:"/admin/products"},
    {label:"Нөөц дууссан",value:stats.out,note:`${stats.low} цөөн үлдсэн`,to:"/admin/inventory"},
    {label:"Ашиглагдаагүй медиа",value:stats.unused,note:"Цэвэрлэх боломжтой",to:"/admin/media"},
    {label:"Идэвхтэй цуглуулга",value:stats.collections,note:"Каталогт харагдана",to:"/admin/collections"}
  ];
  return <main className="admin-content"><div className="admin-page-head"><div><p className="admin-kicker">MEIRO / ADMIN</p><h1>Хянах самбар</h1><p>Дэлгүүрийн одоогийн төлөвийг нэг дороос харна.</p></div></div>
    <div className="admin-dashboard-grid">{cards.map(x=><Link to={x.to} key={x.label} className="admin-dashboard-card"><span>{x.label}</span><strong>{x.value}</strong><small>{x.note}</small></Link>)}</div>
    <section className="admin-panel admin-dashboard-actions"><h2>Шуурхай үйлдэл</h2><div><Link to="/admin/products/new">+ Шинэ бүтээгдэхүүн</Link><Link to="/admin/inventory">Нөөц шалгах</Link><Link to="/admin/home">Нүүр хуудасны зураг</Link><Link to="/admin/media">Медиа сан</Link></div></section>
  </main>;
}
