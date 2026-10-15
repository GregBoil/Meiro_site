import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import RequireUser from "../components/RequireUser";
import { formatPrice } from "../data/products";
import { loadOrders, orderStatuses, type Order } from "../services/orders";

export default function Orders() {
  const { session } = useAuth();
  return (
    <RequireUser>
      {session && (
        <OrderHistory key={session.user.id} userId={session.user.id} />
      )}
    </RequireUser>
  );
}
export function OrderHistory({
  userId,
  admin = false,
}: {
  userId?: string;
  admin?: boolean;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setOrders([]);
    loadOrders(userId)
      .then((data) => {
        if (active) setOrders(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, retry]);
  return (
    <section className={admin ? "admin-content" : "page-shell cart-page"}>
      <p className={admin ? "admin-kicker" : "eyebrow"}>
        {admin ? "MEIRO / ADMIN" : "MEIRO"}
      </p>
      <h1>{admin ? "Захиалгууд" : "Миний захиалгууд"}</h1>
      {!admin && (
        <Link className="text-link" to="/account">
          Миний бүртгэл →
        </Link>
      )}
      {loading ? (
        <p role="status">Уншиж байна…</p>
      ) : error ? (
        <>
          <p className="account-error" role="alert">
            Захиалгуудыг ачаалж чадсангүй.
          </p>
          <button
            className="button account-secondary"
            onClick={() => setRetry((v) => v + 1)}
          >
            Дахин оролдох
          </button>
        </>
      ) : !orders.length ? (
        <p className="orders-empty">Одоогоор захиалга байхгүй байна.</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-heading">
                <h2>#{order.id.slice(0, 8).toUpperCase()}</h2>
                <span>
                  {orderStatuses[order.status] ?? "Төлөв шинэчлэгдэж байна"}
                </span>
              </div>
              <p>
                {new Intl.DateTimeFormat("mn-MN", {
                  dateStyle: "medium",
                  timeZone: "Asia/Ulaanbaatar",
                }).format(new Date(order.created_at))}
              </p>
              <ul>
                {order.order_items.map((item) => (
                  <li key={item.id}>
                    {item.product_name} · {item.variant_name} × {item.quantity}{" "}
                    — {formatPrice(item.line_total_mnt)}
                  </li>
                ))}
              </ul>
              <strong>Нийт: {formatPrice(order.total_mnt)}</strong>
              <p>
                Хүргэлт: Улаанбаатар, {order.district}, {order.khoroo}-р хороо,{" "}
                {order.address_line}
              </p>
              {admin && (
                <>
                  <p>
                    Хүлээн авагч: {order.recipient_name} · {order.phone}
                  </p>
                  {order.instructions && <p>{order.instructions}</p>}
                </>
              )}
              {order.tracking_number && (
                <p>Хүргэлтийн дугаар: {order.tracking_number}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
