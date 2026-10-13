import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "../services/supabase";

type Factor = { id: string; friendly_name?: string };
export default function AdminMfa({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState("");
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setVerified(false);
    setError("");
    async function load() {
      if (!supabase) throw new Error();
      const [assurance, listed] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (assurance.error || listed.error) throw new Error();
      if (!active) return;
      const totp = listed.data.totp.filter((f) => f.status === "verified");
      setFactors(totp);
      setFactorId(totp[0]?.id ?? "");
      setVerified(assurance.data.currentLevel === "aal2");
    }
    load()
      .catch(() => {
        if (active)
          setError("Баталгаажуулалтыг шалгаж чадсангүй. Дахин оролдоно уу.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  async function enroll() {
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    try {
      // Restart only unfinished TOTP enrollments. Never remove an active factor.
      const listed = await supabase.auth.mfa.listFactors();
      if (listed.error) throw listed.error;
      if (listed.data.totp.some((f) => f.status === "verified")) {
        setRetry((v) => v + 1);
        return;
      }
      for (const f of listed.data.all.filter(
        (f) => f.factor_type === "totp" && f.status === "unverified",
      )) {
        const removed = await supabase.auth.mfa.unenroll({ factorId: f.id });
        if (removed.error) throw removed.error;
      }
      const result = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "Meiro",
        friendlyName: "Meiro admin",
      });
      if (result.error) throw result.error;
      setFactorId(result.data.id);
      setCode("");
      setSetup({
        qr: result.data.totp.qr_code,
        secret: result.data.totp.secret,
      });
    } catch {
      setError("Тохируулж чадсангүй. Дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!supabase || busy || !factorId || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    setError("");
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (result.error) throw result.error;
      const assurance =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error || assurance.data.currentLevel !== "aal2")
        throw new Error();
      setSetup(null);
      setCode("");
      setVerified(true);
    } catch {
      setCode("");
      setError(
        "Код буруу эсвэл хугацаа нь дууссан байна. Шинэ кодоор дахин оролдоно уу.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main className="admin-login">
        <p role="status">Баталгаажуулалтыг шалгаж байна…</p>
      </main>
    );
  if (verified) return children;
  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <p className="admin-kicker">MEIRO / ADMIN</p>
        <h1>Хоёр шатлалт баталгаажуулалт</h1>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {!factorId && !error && (
          <>
            <p>
              Админ хэсэгт нэвтрэхийн тулд Google Authenticator, Microsoft
              Authenticator зэрэг апптай холбоно уу.
            </p>
            <button disabled={busy} onClick={enroll}>
              {busy ? "Тохируулж байна…" : "Баталгаажуулах апп холбох"}
            </button>
          </>
        )}
        {setup && (
          <>
            <p>
              Аппаараа QR кодыг уншуулна уу. QR код болон нууц түлхүүрийг бусдад
              бүү дамжуулаарай.
            </p>
            <img
              src={setup.qr}
              alt="Баталгаажуулах апптай холбох QR код"
              width={220}
              height={220}
            />
            <details>
              <summary>Түлхүүрийг гараар оруулах</summary>
              <code style={{ overflowWrap: "anywhere" }}>{setup.secret}</code>
            </details>
          </>
        )}
        {factorId && (
          <form onSubmit={verify}>
            {factors.length > 1 && (
              <label>
                Баталгаажуулах апп
                <select
                  value={factorId}
                  disabled={busy}
                  onChange={(e) => setFactorId(e.target.value)}
                >
                  {factors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.friendly_name || "Authenticator"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Апп дээрх 6 оронтой код
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                disabled={busy}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <button disabled={busy || code.length !== 6}>
              {busy ? "Шалгаж байна…" : "Баталгаажуулах"}
            </button>
          </form>
        )}
        {error && !factorId && (
          <button onClick={() => setRetry((v) => v + 1)}>Дахин оролдох</button>
        )}
        <p>Аппаа алдсан бол Meiro-ийн систем хариуцсан хүнтэй холбогдоно уу.</p>
        <button disabled={busy} onClick={() => supabase?.auth.signOut()}>
          Гарах
        </button>
      </div>
    </main>
  );
}
