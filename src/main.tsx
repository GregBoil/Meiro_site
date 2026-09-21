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
import "./styles.css";

const Router =
  import.meta.env.MODE === "github-pages" ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="admin" element={<Admin />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/:id" element={<AdminProductEditor />} />
          <Route path="inventory" element={<AdminInventory />} />
        </Route>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="catalogue" element={<Catalogue />} />
          <Route path="catalogue/:slug" element={<Product />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  </React.StrictMode>,
);
