import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function RequireUser({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading)
    return (
      <section className="page-shell cart-page">
        <p role="status">Уншиж байна…</p>
      </section>
    );
  if (!session) return <Navigate to="/account/login" replace />;
  return <>{children}</>;
}
