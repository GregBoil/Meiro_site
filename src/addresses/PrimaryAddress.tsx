import { useEffect, useState, type FormEvent } from "react";
import {
  deliveryDistricts,
  loadPrimaryAddress,
  savePrimaryAddress,
  type PrimaryAddress as Address,
} from "../services/orders";

const empty: Address = {
  city: "Ulaanbaatar",
  district: "",
  khoroo: 1,
  address_line: "",
  instructions: "",
};
export default function PrimaryAddress({ userId }: { userId: string }) {
  const [stored, setStored] = useState<Address | null>(null),
    [address, setAddress] = useState<Address>(empty),
    [loading, setLoading] = useState(true),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    loadPrimaryAddress(userId)
      .then((data) => {
        if (active) {
          setStored(data);
          setAddress(data ?? empty);
        }
      })
      .catch(() => {
        if (active) setError("Хаягийг ачаалж чадсангүй. Дахин оролдоно уу.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, retry]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await savePrimaryAddress(userId, address);
      const clean = {
        ...address,
        address_line: address.address_line.trim(),
        instructions: address.instructions.trim(),
      };
      setStored(clean);
      setAddress(clean);
      setEditing(false);
      setMessage("Үндсэн хаяг хадгалагдлаа.");
    } catch {
      setError("Хаягийг хадгалж чадсангүй. Дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="primary-address">
      <h3>Үндсэн хаяг</h3>
      <p>Хүргэлтийн үед энэ хаягийг сонгож болно.</p>
      {loading ? (
        <p role="status">Хаяг ачаалж байна…</p>
      ) : editing ? (
        <form className="account-form" onSubmit={save} aria-busy={busy}>
          <p>Хот: Улаанбаатар</p>
          <label htmlFor="primary-district">
            Дүүрэг
            <select
              id="primary-district"
              autoComplete="address-level2"
              value={address.district}
              required
              disabled={busy}
              onChange={(e) =>
                setAddress({ ...address, district: e.target.value })
              }
            >
              <option value="">Дүүргээ сонгоно уу</option>
              {deliveryDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="primary-khoroo">
            Хороо
            <input
              id="primary-khoroo"
              type="number"
              min={1}
              max={100}
              step={1}
              required
              disabled={busy}
              value={address.khoroo || ""}
              onChange={(e) =>
                setAddress({ ...address, khoroo: Number(e.target.value) })
              }
            />
          </label>
          <label htmlFor="primary-address">
            Дэлгэрэнгүй хаяг
            <textarea
              id="primary-address"
              autoComplete="street-address"
              maxLength={1000}
              required
              disabled={busy}
              value={address.address_line}
              onChange={(e) =>
                setAddress({ ...address, address_line: e.target.value })
              }
            />
          </label>
          <label htmlFor="primary-instructions">
            Нэмэлт тайлбар (заавал биш)
            <textarea
              id="primary-instructions"
              maxLength={1000}
              disabled={busy}
              value={address.instructions}
              onChange={(e) =>
                setAddress({ ...address, instructions: e.target.value })
              }
            />
          </label>
          <button
            type="submit"
            className="button button-primary"
            disabled={busy}
          >
            {busy ? "Хадгалж байна…" : "Хаяг хадгалах"}
          </button>
          <button
            type="button"
            className="button account-secondary"
            disabled={busy}
            onClick={() => {
              setAddress(stored ?? empty);
              setEditing(false);
              setError("");
            }}
          >
            Болих
          </button>
        </form>
      ) : (
        <>
          {stored ? (
            <dl className="account-details">
              <div>
                <dt>Хот</dt>
                <dd>Улаанбаатар</dd>
              </div>
              <div>
                <dt>Дүүрэг, хороо</dt>
                <dd>
                  {stored.district}, {stored.khoroo}-р хороо
                </dd>
              </div>
              <div>
                <dt>Дэлгэрэнгүй хаяг</dt>
                <dd>{stored.address_line}</dd>
              </div>
              {stored.instructions && (
                <div>
                  <dt>Нэмэлт тайлбар</dt>
                  <dd>{stored.instructions}</dd>
                </div>
              )}
            </dl>
          ) : (
            !error && <p>Үндсэн хаяг оруулаагүй байна.</p>
          )}
          {!error && (
            <button
              type="button"
              className="button account-secondary"
              onClick={() => {
                setEditing(true);
                setMessage("");
              }}
            >
              {stored ? "Хаяг засах" : "Хаяг нэмэх"}
            </button>
          )}
        </>
      )}
      {error && (
        <>
          <p className="account-error" role="alert">
            {error}
          </p>
          {!editing && (
            <button
              type="button"
              className="button account-secondary"
              onClick={() => setRetry((v) => v + 1)}
            >
              Дахин оролдох
            </button>
          )}
        </>
      )}
      {message && (
        <p className="account-success" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
