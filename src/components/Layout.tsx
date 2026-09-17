import { useEffect, useState } from "react";
import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { navigation, socialLinks } from "../data/site";

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    const titles: Record<string, string> = {
      "/": "Өөрийн замаар.",
      "/catalogue": "Бүтээлүүд",
      "/contact": "Холбоо барих",
    };
    document.title = `Meiro — ${titles[pathname] || "Бүтээл"}`;
  }, [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <>
      <a href="#main" className="skip-link">
        Үндсэн агуулга руу
      </a>
      <header className="site-header">
        <Link to="/" className="logo-link" aria-label="Meiro — Нүүр">
          <img src="/meiro-logo.svg" alt="Meiro" width="96" height="72" />
        </Link>
        <nav className="desktop-nav" aria-label="Үндсэн цэс">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <span className="header-note">
          <span className="status-dot" />
          Монголд урлав
        </span>
        <button
          className="icon-button menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? "Цэс хаах" : "Цэс нээх"}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        {menuOpen && (
          <nav
            id="mobile-navigation"
            className="mobile-nav"
            aria-label="Гар утасны цэс"
          >
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} end>
                {item.label}
                <ArrowUpRight size={22} />
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-top">
          <div>
            <p className="eyebrow">ХАМТДАА ШИНЭ ЗАМ РУУ</p>
            <Link className="footer-invitation" to="/contact">
              Танилцъя.
              <ArrowUpRight />
            </Link>
          </div>
          <p className="footer-description">
            Шинэ бүтээл, урлах явц, бидний өдөр тутам.
            <br />
            Meiro-гийн ертөнцөөр хамт аялъя.
          </p>
          <div className="social-links">
            <a href={socialLinks.instagram} target="_blank" rel="noreferrer">
              Инстаграм <ArrowUpRight size={16} />
            </a>
            <a href={socialLinks.facebook} target="_blank" rel="noreferrer">
              Фэйсбүүк <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Meiro</span>
          <span>Итали арьс. Монгол ур.</span>
          <Link to="/catalogue">Бүтээлүүдтэй танилцах ↗</Link>
        </div>
      </footer>
    </>
  );
}
