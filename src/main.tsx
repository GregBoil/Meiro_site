import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Catalogue from "./pages/Catalogue";
import Product from "./pages/Product";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Admin, { AdminDashboard } from "./pages/Admin";
import AdminProducts from "./pages/AdminProducts";
import AdminProductEditor from "./pages/AdminProductEditor";
import AdminInventory from "./pages/AdminInventory";
import AdminInventoryHistory from "./pages/AdminInventoryHistory";
import AdminCollections from "./pages/AdminCollections";
import AdminMedia from "./pages/AdminMedia";
import AdminHome from "./pages/AdminHome";
import Account, { AccountAuth } from "./pages/Account";
import { AuthProvider } from "./auth/AuthProvider";
import { prepareAuthCallback } from "./auth/callback";
import { supabase } from "./services/supabase";
import { CartProvider } from "./commerce/CartProvider";
import Cart from "./pages/Cart";
import "./styles.css";
import "./auth/account.css";
import "./commerce/cart.css";

const Router =
  import.meta.env.MODE === "github-pages" ? HashRouter : BrowserRouter;

async function start() {
  const callbackError = await prepareAuthCallback({
    url: window.location.href,
    hashRouting: import.meta.env.MODE === "github-pages",
    initialize: () =>
      supabase
        ? supabase.auth.initialize()
        : Promise.resolve({ error: new Error("Unavailable") }),
    replace: (url) => window.history.replaceState(null, "", url),
  });
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <AuthProvider callbackError={callbackError}>
        <CartProvider>
          <Router>
            <Routes>
              <Route path="admin" element={<Admin />}>
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/:id" element={<AdminProductEditor />} />
                <Route path="inventory" element={<AdminInventory />} />
                <Route
                  path="inventory/history"
                  element={<AdminInventoryHistory />}
                />
                <Route path="collections" element={<AdminCollections />} />
                <Route path="media" element={<AdminMedia />} />
                <Route path="home" element={<AdminHome />} />
              </Route>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="catalogue" element={<Catalogue />} />
                <Route path="catalogue/:slug" element={<Product />} />
                <Route path="contact" element={<Contact />} />
                <Route path="cart" element={<Cart />} />
                <Route path="account" element={<Account />} />
                <Route
                  path="account/login"
                  element={<AccountAuth key="login" mode="login" />}
                />
                <Route
                  path="account/signup"
                  element={<AccountAuth key="signup" mode="signup" />}
                />
                <Route
                  path="account/forgot-password"
                  element={
                    <AccountAuth key="forgot-password" mode="forgot-password" />
                  }
                />
                <Route
                  path="account/reset-password"
                  element={
                    <AccountAuth key="reset-password" mode="reset-password" />
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Router>
        </CartProvider>
      </AuthProvider>
    </React.StrictMode>,
  );
}
void start();
