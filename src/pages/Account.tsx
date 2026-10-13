import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../services/supabase";

const emailFlowsEnabled = import.meta.env.VITE_AUTH_EMAILS_ENABLED === "true";
const connectionError = "Холболт амжилтгүй боллоо. Дахин оролдоно уу.";
type Mode = "login" | "signup" | "forgot-password" | "reset-password";
const headings: Record<Mode, string> = {
  login: "Нэвтрэх",
  signup: "Бүртгүүлэх",
  "forgot-password": "Нууц үгээ мартсан уу?",
  "reset-password": "Шинэ нууц үг",
};

function AccountShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="page-shell customer-account">
      <div className="account-intro">
        <p className="eyebrow">MEIRO</p>
        <h1>{title}</h1>
        <p>Өөрийн замаар. Хамтдаа.</p>
        <Link className="text-link" to="/catalogue">
          Бүтээлүүдтэй танилцах →
        </Link>
      </div>
      <div className="account-card">{children}</div>
    </section>
  );
}

export function AccountAuth({ mode }: { mode: Mode }) {
  const { session, loading, error: callbackError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const needsEmailDelivery = mode === "signup" || mode === "forgot-password";
  const disabled =
    !supabase || busy || (needsEmailDelivery && !emailFlowsEnabled);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || !supabase) return;
    setError("");
    setMessage("");
    if (
      (mode === "signup" || mode === "reset-password") &&
      password !== confirmation
    ) {
      setError("Нууц үгүүд таарахгүй байна.");
      return;
    }
    setBusy(true);
    try {
      // The exact site root is on the Supabase allow list, with no hash route.
      const redirect = new URL(import.meta.env.BASE_URL, window.location.origin)
        .href;
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error)
          setError(
            error.code === "email_not_confirmed"
              ? "И-мэйл хаягаа баталгаажуулсны дараа нэвтэрнэ үү."
              : "Нэвтэрч чадсангүй. И-мэйл, нууц үгээ шалгаад дахин оролдоно уу.",
          );
        else navigate("/account", { replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: redirect },
        });
        if (error)
          setError(
            error.code === "weak_password"
              ? "Нууц үг хамгийн багадаа 12 тэмдэгттэй байх ёстой."
              : "Бүртгэл амжилтгүй боллоо. Түр хүлээгээд дахин оролдоно уу.",
          );
        else if (data.session) navigate("/account", { replace: true });
        else {
          setMessage(
            "Баталгаажуулах холбоос авахын тулд и-мэйлээ шалгана уу. Өмнө нь бүртгүүлсэн бол нэвтрэх боломжтой.",
          );
          setPassword("");
          setConfirmation("");
        }
      } else if (mode === "forgot-password") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: redirect },
        );
        if (error)
          setError("И-мэйл илгээж чадсангүй. Түр хүлээгээд дахин оролдоно уу.");
        else
          setMessage(
            "Энэ хаягаар бүртгэл байгаа бол нууц үг шинэчлэх холбоос илгээгдэнэ. И-мэйлээ шалгана уу.",
          );
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error)
          setError(
            "Нууц үг шинэчлэгдсэнгүй. Холбоос болон нууц үгээ шалгаад дахин оролдоно уу.",
          );
        else {
          setMessage("Нууц үг амжилттай шинэчлэгдлээ.");
          setPassword("");
          setConfirmation("");
        }
      }
    } catch {
      setError(connectionError);
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <AccountShell title={headings[mode]}>
        <p role="status">Уншиж байна…</p>
      </AccountShell>
    );
  if (session && (mode === "login" || mode === "signup") && !callbackError)
    return <Navigate to="/account" replace />;
  if (mode === "reset-password" && !session)
    return (
      <AccountShell title={headings[mode]}>
        <p>Нууц үг шинэчлэхийн тулд и-мэйлээр ирсэн холбоосыг нээнэ үү.</p>
        <Link className="text-link" to="/account/forgot-password">
          Шинэ холбоос авах →
        </Link>
      </AccountShell>
    );

  return (
    <AccountShell title={headings[mode]}>
      {!supabase && (
        <p className="account-notice" role="status">
          Нэвтрэх үйлчилгээ түр боломжгүй байна.
        </p>
      )}
      {needsEmailDelivery && !emailFlowsEnabled && (
        <p className="account-notice" role="status">
          {mode === "signup"
            ? "Шинэ бүртгэл удахгүй нээгдэнэ."
            : "Нууц үг сэргээх үйлчилгээ түр боломжгүй байна."}
        </p>
      )}
      <form className="account-form" onSubmit={submit} aria-busy={busy}>
        {mode !== "reset-password" && (
          <label htmlFor="account-email">
            И-мэйл
            <input
              id="account-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </label>
        )}
        {mode !== "forgot-password" && (
          <label htmlFor="account-password">
            {mode === "reset-password" ? "Шинэ нууц үг" : "Нууц үг"}
            <input
              id="account-password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={mode === "login" ? undefined : 12}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
            {mode !== "login" && <small>Хамгийн багадаа 12 тэмдэгт.</small>}
          </label>
        )}
        {(mode === "signup" || mode === "reset-password") && (
          <label htmlFor="account-confirmation">
            Нууц үгээ давтан оруулна уу
            <input
              id="account-confirmation"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={busy}
            />
          </label>
        )}
        {(error || callbackError) && (
          <p className="account-error" role="alert">
            {error || callbackError}
          </p>
        )}
        {message && (
          <p className="account-success" role="status">
            {message}
          </p>
        )}
        <button
          className="button button-primary"
          type="submit"
          disabled={disabled}
        >
          {busy
            ? "Түр хүлээнэ үү…"
            : mode === "forgot-password"
              ? "Холбоос авах"
              : mode === "reset-password"
                ? "Нууц үг шинэчлэх"
                : headings[mode]}
        </button>
      </form>
      <div className="account-links">
        {mode === "login" ? (
          <>
            <Link to="/account/forgot-password">Нууц үгээ мартсан уу?</Link>
            <Link to="/account/signup">Шинээр бүртгүүлэх</Link>
          </>
        ) : (
          <Link to={session ? "/account" : "/account/login"}>
            {session ? "Миний бүртгэл" : "Нэвтрэх"} →
          </Link>
        )}
      </div>
    </AccountShell>
  );
}

type Profile = { id: string; full_name: string | null; phone: string | null };

export default function Account() {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <AccountShell title="Миний бүртгэл">
        <p role="status">Уншиж байна…</p>
      </AccountShell>
    );
  if (!session) return <Navigate to="/account/login" replace />;
  // Changing users remounts the form so another user's details cannot persist.
  return (
    <CustomerProfile
      key={session.user.id}
      userId={session.user.id}
      email={session.user.email ?? ""}
    />
  );
}

function CustomerProfile({ userId, email }: { userId: string; email: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setProfile(null);
    async function load() {
      try {
        if (!supabase) throw new Error();
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .eq("id", userId)
          .single();
        if (error || !data) throw new Error();
        if (active) {
          setProfile(data);
          setName(data.full_name ?? "");
          setPhone(data.phone ?? "");
        }
      } catch {
        if (active) setError("Мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [userId, retry]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !profile || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim() || null,
          phone: phone.trim() || null,
        })
        .eq("id", userId)
        .select("id, full_name, phone")
        .single();
      if (error || !data) throw new Error();
      setProfile(data);
      setName(data.full_name ?? "");
      setPhone(data.phone ?? "");
      setEditing(false);
      setMessage("Мэдээлэл хадгалагдлаа.");
    } catch {
      setError("Мэдээллийг хадгалж чадсангүй. Дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch {
      setError(connectionError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountShell title="Миний бүртгэл">
      <h2>Миний мэдээлэл</h2>
      <p className="account-email">{email}</p>
      {loading ? (
        <p role="status">Уншиж байна…</p>
      ) : (
        <>
          {profile && !editing && (
            <>
              <dl className="account-details">
                <div>
                  <dt>Нэр</dt>
                  <dd>{profile.full_name || "Оруулаагүй"}</dd>
                </div>
                <div>
                  <dt>Утас</dt>
                  <dd>{profile.phone || "Оруулаагүй"}</dd>
                </div>
              </dl>
              <button
                className="button account-secondary"
                type="button"
                onClick={() => {
                  setError("");
                  setMessage("");
                  setEditing(true);
                }}
              >
                Мэдээлэл засах
              </button>
            </>
          )}
          {profile && editing && (
            <form className="account-form" onSubmit={save} aria-busy={busy}>
              <label htmlFor="profile-name">
                Нэр
                <input
                  id="profile-name"
                  autoComplete="name"
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label htmlFor="profile-phone">
                Утас
                <input
                  id="profile-phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={40}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={busy}
                />
              </label>
              <small>Нэр, утасны дугаараа дараа нь бөглөж болно.</small>
              <button
                className="button button-primary"
                disabled={busy}
                type="submit"
              >
                {busy ? "Түр хүлээнэ үү…" : "Хадгалах"}
              </button>
              <button
                className="button account-secondary"
                disabled={busy}
                type="button"
                onClick={() => {
                  setName(profile.full_name ?? "");
                  setPhone(profile.phone ?? "");
                  setError("");
                  setMessage("");
                  setEditing(false);
                }}
              >
                Болих
              </button>
            </form>
          )}
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="account-success" role="status">
              {message}
            </p>
          )}
          {!profile && (
            <button
              className="button account-secondary"
              onClick={() => setRetry((v) => v + 1)}
            >
              Дахин оролдох
            </button>
          )}
        </>
      )}
      <div className="account-links">
        <Link to="/account/orders">Миний захиалгууд</Link>
        <Link to="/account/reset-password">Нууц үг солих</Link>
        <button type="button" onClick={signOut} disabled={busy}>
          Гарах
        </button>
      </div>
    </AccountShell>
  );
}
