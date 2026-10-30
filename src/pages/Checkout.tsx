import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../commerce/CartProvider";
import RequireUser from "../components/RequireUser";
import { formatPrice } from "../data/products";
import {
  checkoutPreview,
  deliveryDistricts,
  loadDeliveryAddress,
  saveDeliveryAddress,
  type CheckoutPreview,
  type DeliveryAddress,
  type AddressSource,
} from "../services/orders";

export default function Checkout() {
  const { session } = useAuth();
  return (
    <RequireUser>
      {session && (
        <CheckoutForm key={session.user.id} userId={session.user.id} />
      )}
    </RequireUser>
  );
}

function CheckoutForm({ userId }: { userId: string }) {
  const { items } = useCart();
  const [address, setAddress] = useState<DeliveryAddress>({
    recipient_name: "",
    phone: "",
    city: "Ulaanbaatar",
    district: "",
    khoroo: 1,
    address_line: "",
    instructions: "",
  });
  const [source, setSource] = useState<AddressSource>("other");
  const [primaryAddress, setPrimaryAddress] = useState<DeliveryAddress | null>(
    null,
  );
  const [otherAddress, setOtherAddress] = useState<DeliveryAddress | null>(
    null,
  );
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressError, setAddressError] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (reviewing) headingRef.current?.focus();
  }, [reviewing]);

  useEffect(() => {
    let active = true;
    setAddressLoading(true);
    setAddressError(false);
    setReviewing(false);
    loadDeliveryAddress(userId)
      .then((data) => {
        if (active) {
          setAddress(data.address);
          setSource(data.source);
          setPrimaryAddress(data.primaryAddress);
          setOtherAddress(data.otherAddress);
          setSaved(data.saved);
          setReviewing(data.saved);
        }
      })
      .catch(() => {
        if (active) setAddressError(true);
      })
      .finally(() => {
        if (active) setAddressLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, retry]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setPreview(null);
    setPreviewError(false);
    if (!items.length) {
      setLoading(false);
      return;
    }
    checkoutPreview(items)
      .then((data) => {
        if (active) setPreview(data);
      })
      .catch(() => {
        if (active) setPreviewError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [items, retry]);

  function change<K extends keyof DeliveryAddress>(
    field: K,
    value: DeliveryAddress[K],
  ) {
    setAddress((current) => ({ ...current, [field]: value }));
    if (source === "other")
      setOtherAddress((current) =>
        current ? { ...current, [field]: value } : null,
      );
    setSaved(false);
    setSaveError(false);
  }
  function chooseSource(next: AddressSource) {
    if (busy || next === source || (next === "primary" && !primaryAddress))
      return;
    if (source === "other") setOtherAddress(address);
    setSource(next);
    setAddress(
      next === "primary" ? primaryAddress! : (otherAddress ?? address),
    );
    setSaved(false);
    setSaveError(false);
    setReviewing(false);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (
      busy ||
      addressLoading ||
      addressError ||
      loading ||
      !preview ||
      previewError
    )
      return;
    if (
      !address.recipient_name.trim() ||
      !address.phone.trim() ||
      !address.address_line.trim() ||
      !deliveryDistricts.some((d) => d === address.district) ||
      !Number.isInteger(address.khoroo) ||
      address.khoroo < 1 ||
      address.khoroo > 100
    ) {
      setSaveError(true);
      return;
    }
    setBusy(true);
    setSaveError(false);
    setSaved(false);
    try {
      await saveDeliveryAddress(userId, address, source);
      setSaved(true);
      setReviewing(true);
    } catch {
      setSaveError(true);
    } finally {
      setBusy(false);
    }
  }
  if (!items.length)
    return (
      <section className="page-shell cart-page">
        <h1>Захиалгын мэдээлэл</h1>
        <p>Таны сагс хоосон байна.</p>
        <Link className="text-link" to="/catalogue">
          Бүтээлүүд үзэх →
        </Link>
      </section>
    );
  return (
    <section className="page-shell cart-page checkout-page">
      <p className="eyebrow">MEIRO</p>
      <h1 ref={headingRef} tabIndex={-1}>
        {reviewing ? "Захиалгаа хянах" : "Захиалгын мэдээлэл"}
      </h1>
      <p className="checkout-steps" aria-label="Захиалгын алхмууд">
        <span aria-current={!reviewing ? "step" : undefined}>
          1. Хүргэлтийн хаяг
        </span>
        <span aria-current={reviewing ? "step" : undefined}>
          2. Захиалгаа хянах
        </span>
        <span>3. Төлбөр</span>
      </p>
      <Link className="text-link" to="/cart">
        Сагс руу буцах →
      </Link>
      <div className="cart-layout checkout-layout">
        <div className="account-card">
          <h2>Хүргэлтийн хаяг</h2>
          <p className="checkout-area">
            Одоогоор зөвхөн Улаанбаатар хотод хүргэнэ.
          </p>
          {!addressLoading && !addressError && (
            <fieldset className="checkout-address-choice" disabled={busy}>
              <legend>Хүргэлтийн хаяг сонгох</legend>
              <label>
                <input
                  type="radio"
                  name="address-source"
                  value="primary"
                  checked={source === "primary"}
                  disabled={!primaryAddress}
                  onChange={() => chooseSource("primary")}
                />{" "}
                Үндсэн хаягаар хүргүүлэх
              </label>
              <label>
                <input
                  type="radio"
                  name="address-source"
                  value="other"
                  checked={source === "other"}
                  onChange={() => chooseSource("other")}
                />{" "}
                Өөр хаягаар хүргүүлэх
              </label>
              {!primaryAddress && (
                <p>
                  <Link to="/account">
                    Миний мэдээлэл хэсэгт үндсэн хаягаа нэмэх →
                  </Link>
                </p>
              )}
            </fieldset>
          )}
          {reviewing ? (
            <>
              <dl className="checkout-address">
                <div>
                  <dt>Хүлээн авагч</dt>
                  <dd>{address.recipient_name}</dd>
                </div>
                <div>
                  <dt>Утасны дугаар</dt>
                  <dd>{address.phone}</dd>
                </div>
                <div>
                  <dt>Хот</dt>
                  <dd>Улаанбаатар</dd>
                </div>
                <div>
                  <dt>Дүүрэг, хороо</dt>
                  <dd>
                    {address.district}, {address.khoroo}-р хороо
                  </dd>
                </div>
                <div>
                  <dt>Дэлгэрэнгүй хаяг</dt>
                  <dd>{address.address_line}</dd>
                </div>
                {address.instructions.trim() && (
                  <div>
                    <dt>Нэмэлт тайлбар</dt>
                    <dd>{address.instructions}</dd>
                  </div>
                )}
              </dl>
              <button
                type="button"
                className="button account-secondary"
                onClick={() => setReviewing(false)}
              >
                Хаяг өөрчлөх
              </button>
              <p>Мэдээллээ шалгаад төлбөрийн алхам руу шилжинэ үү.</p>
            </>
          ) : addressLoading ? (
            <p role="status">Хаяг ачаалж байна…</p>
          ) : addressError ? (
            <>
              <p className="account-error" role="alert">
                Хаягийг ачаалж чадсангүй.
              </p>
              <button
                className="button account-secondary"
                onClick={() => setRetry((v) => v + 1)}
              >
                Дахин оролдох
              </button>
            </>
          ) : (
            <form className="account-form" onSubmit={save} aria-busy={busy}>
              <label htmlFor="delivery-name">
                Хүлээн авагчийн нэр
                <input
                  id="delivery-name"
                  autoComplete="name"
                  maxLength={200}
                  required
                  disabled={busy}
                  value={address.recipient_name}
                  onChange={(e) => change("recipient_name", e.target.value)}
                />
              </label>
              <label htmlFor="delivery-phone">
                Утасны дугаар
                <input
                  id="delivery-phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={40}
                  required
                  disabled={busy}
                  value={address.phone}
                  onChange={(e) => change("phone", e.target.value)}
                />
              </label>
              {source === "primary" ? (
                <div className="checkout-primary-address">
                  <p>
                    Улаанбаатар · {address.district}, {address.khoroo}-р хороо
                  </p>
                  <p>{address.address_line}</p>
                  {address.instructions && <p>{address.instructions}</p>}
                  <Link to="/account">Үндсэн хаягаа засах →</Link>
                </div>
              ) : (
                <>
                  <p>Хот: Улаанбаатар</p>
                  <label htmlFor="delivery-district">
                    Дүүрэг
                    <select
                      id="delivery-district"
                      autoComplete="address-level2"
                      required
                      disabled={busy}
                      value={address.district}
                      onChange={(e) => change("district", e.target.value)}
                    >
                      <option value="">Дүүргээ сонгоно уу</option>
                      {deliveryDistricts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="delivery-khoroo">
                    Хороо
                    <input
                      id="delivery-khoroo"
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      required
                      disabled={busy}
                      value={address.khoroo || ""}
                      onChange={(e) => change("khoroo", Number(e.target.value))}
                    />
                  </label>
                  <label htmlFor="delivery-address">
                    Дэлгэрэнгүй хаяг
                    <textarea
                      id="delivery-address"
                      autoComplete="street-address"
                      maxLength={1000}
                      required
                      disabled={busy}
                      value={address.address_line}
                      onChange={(e) => change("address_line", e.target.value)}
                      placeholder="Гудамж, байр, орц, давхар, тоот"
                    />
                  </label>
                  <label htmlFor="delivery-instructions">
                    Нэмэлт тайлбар (заавал биш)
                    <textarea
                      id="delivery-instructions"
                      maxLength={1000}
                      disabled={busy}
                      value={address.instructions}
                      onChange={(e) => change("instructions", e.target.value)}
                      placeholder="Орцны код, ойролцоох таних тэмдэг"
                    />
                  </label>
                </>
              )}
              {saveError && (
                <p className="account-error" role="alert">
                  Хаягийг хадгалж чадсангүй. Мэдээллээ шалгаад дахин оролдоно
                  уу.
                </p>
              )}
              {saved && (
                <p className="account-success" role="status">
                  Хаяг хадгалагдлаа. Захиалга үүсээгүй.
                </p>
              )}
              <button
                className="button account-secondary"
                type="submit"
                disabled={busy || loading || previewError || !preview}
              >
                {busy ? "Хадгалж байна…" : "Хадгалаад захиалгаа хянах"}
              </button>
            </form>
          )}
        </div>
        <aside className="cart-summary">
          <h2>Захиалгын тойм</h2>
          {reviewing && (
            <Link className="text-link" to="/cart">
              Бүтээл, тоо хэмжээ өөрчлөх →
            </Link>
          )}
          {loading ? (
            <p role="status">Үнэ, бэлэн байдлыг шалгаж байна…</p>
          ) : previewError ? (
            <>
              <p className="account-error" role="alert">
                Захиалгын тоймыг ачаалж чадсангүй.
              </p>
              <button
                className="button account-secondary"
                onClick={() => setRetry((v) => v + 1)}
              >
                Дахин оролдох
              </button>
            </>
          ) : (
            preview && (
              <>
                {preview.items.map((line) => (
                  <div className="checkout-line" key={line.variant_id}>
                    <strong>
                      {line.product_name ?? "Бүтээл одоогоор боломжгүй"}
                    </strong>
                    <p>
                      {line.variant_name} × {line.quantity}
                    </p>
                    {line.made_to_order && (
                      <p>
                        Захиалгаар урлана.
                        {line.lead_time_days != null &&
                          ` Урлах хугацаа: ${line.lead_time_days} хоног.`}
                      </p>
                    )}
                    {line.available ? (
                      <p>{formatPrice(line.line_total_mnt ?? null)}</p>
                    ) : (
                      <p className="account-error">
                        Энэ сонголт эсвэл тоо хэмжээ боломжгүй байна.
                      </p>
                    )}
                  </div>
                ))}
                <dl className="checkout-totals">
                  <div>
                    <dt>Бүтээлийн дүн</dt>
                    <dd>{formatPrice(preview.items_subtotal_mnt)}</dd>
                  </div>
                  <div>
                    <dt>Хүргэлт</dt>
                    <dd>
                      {preview.delivery_fee_mnt === null
                        ? "Тодорхой болоогүй"
                        : formatPrice(preview.delivery_fee_mnt)}
                    </dd>
                  </div>
                  <div>
                    <dt>Нийт төлөх</dt>
                    <dd>
                      {preview.total_mnt === null
                        ? "Тодорхой болоогүй"
                        : formatPrice(preview.total_mnt)}
                    </dd>
                  </div>
                </dl>
                {!preview.all_items_available && (
                  <p className="account-error">
                    Боломжгүй сонголтуудыг сагснаас хасах эсвэл тоог багасгана
                    уу.
                  </p>
                )}
              </>
            )
          )}
          {reviewing && (
            <>
              <p>Захиалга, төлбөрийн үйлчилгээ удахгүй нээгдэнэ.</p>
              <button className="button button-primary" disabled type="button">
                Баталгаажуулаад төлбөр төлөх
              </button>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
