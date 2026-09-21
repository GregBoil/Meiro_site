import { FormEvent, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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

  return <div className="admin-shell"><aside className="admin-sidebar"><strong>MEIRO</strong><span>ADMIN</span><nav>
    <NavLink end to="/admin">Хянах самбар</NavLink><NavLink to="/admin/products">Бүтээгдэхүүн</NavLink>
    <span>Нөөц</span><span>Медиа</span><span>Цуглуулга</span><span>Нүүр хуудас</span><span>Тохиргоо</span>
  </nav><button onClick={()=>supabase?.auth.signOut()}>Гарах</button></aside><Outlet /></div>;
}

export function AdminDashboard() {
  return <main className="admin-content"><p className="admin-kicker">MEIRO / ADMIN</p><h1>Хянах самбар</h1><p>Meiro-ийн бүтээгдэхүүн, нөөц болон контентыг эндээс удирдана.</p><div className="admin-cards"><article><span>Бүтээгдэхүүн</span><strong>Удахгүй</strong></article><article><span>Нөөц</span><strong>Удахгүй</strong></article><article><span>Медиа</span><strong>Удахгүй</strong></article></div></main>;
}
