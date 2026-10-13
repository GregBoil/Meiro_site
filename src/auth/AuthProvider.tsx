import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";

const AuthContext = createContext<{
  session: Session | null;
  loading: boolean;
  error: string | null;
}>({ session: null, loading: true, error: null });

export function AuthProvider({
  children,
  callbackError = null,
}: {
  children: ReactNode;
  callbackError?: string | null;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState<string | null>(callbackError);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let receivedEvent = false;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      receivedEvent = true;
      setSession(next);
      if (event === "SIGNED_IN") setError(null);
      setLoading(false);
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || receivedEvent) return;
        setSession(data.session);
        if (error) setError("Холболт амжилтгүй боллоо. Дахин оролдоно уу.");
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Холболт амжилтгүй боллоо. Дахин оролдоно уу.");
        setLoading(false);
      });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
