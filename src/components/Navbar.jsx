import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useLab } from "../context";
import { api } from "../api";
import "../styles/navbar.css";

const publicLinks = [
  ["/", "Inicio", "home"],
  ["/negocios", "Negocios", "shop"],
  ["/videos", "Videos", "play"],
  ["/promociones", "Promociones", "tag"],
];
const ownerLinks = [
  ["/dashboard", "Mi panel", "grid"],
  ["/registrar-negocio", "Registrar negocio", "plus"],
  ["/administrar-negocios", "Mis negocios", "shop"],
  ["/registrar-producto", "Registrar producto", "plus"],
  ["/administrar-productos", "Mis productos", "grid"],
  ["/administrar-promociones", "Mis promociones", "tag"],
  ["/administrar-videos", "Mis videos", "play"],
];

function Icon({ name }) {
  const paths = {
    home: "M3 10 12 3l9 7v10H3V10m6 10v-7h6v7",
    shop: "M4 10v11h16V10M2 10l3-7h14l3 7M8 21v-7h8v7M2 10h20",
    play: "M9 7v10l8-5-8-5M3 3h18v18H3z",
    tag: "M3 3h8l10 10-8 8L3 11V3m4 4h.01",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    plus: "M12 4v16M4 12h16",
  };
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export default function Navbar() {
  const { user, setUser } = useLab();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    function escape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      setOpen(false);
    } catch (e) {
      setError(e.message);
    }
  }
  function search(event) {
    event.preventDefault();
    navigate(
      `/negocios?q=${encodeURIComponent(new FormData(event.currentTarget).get("q"))}`,
    );
    setOpen(false);
  }
  function links(items) {
    return items.map(([path, label, icon]) => (
      <NavLink key={path} to={path} end onClick={() => setOpen(false)}>
        <Icon name={icon} />
        <span>{label}</span>
      </NavLink>
    ));
  }
  return (
    <>
      <header className="topbar">
        <button
          className="sidebar-toggle"
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
        <Link to="/" className="brand">
          <span className="brand-symbol">
            D<span>•</span>
          </span>
          <span>
            Design Lab<small>Descubre lo que está cerca</small>
          </span>
        </Link>
        <form className="topbar-search" role="search" onSubmit={search}>
          <input
            name="q"
            aria-label="Buscar negocios y productos"
            placeholder="Busca algo cerca de TECBA…"
          />
          <button aria-label="Buscar">⌕</button>
        </form>
        <Link to={user ? "/dashboard" : "/login"} className="topbar-account">
          {user ? user.nombre : "Iniciar sesión"}{" "}
          <span aria-hidden="true">↗</span>
        </Link>
      </header>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        />
      )}
      <aside id="sidebar" className={`sidebar ${open ? "is-open" : ""}`}>
        <nav aria-label="Navegación principal">
          <p className="sidebar-label">Descubrir</p>
          {links(publicLinks)}
          <p className="sidebar-label">
            {user ? "Mi espacio" : "Únete a Design Lab"}
          </p>
          {user ? (
            links(ownerLinks)
          ) : (
            <>
              {links([
                ["/login", "Iniciar sesión", "grid"],
                ["/registro", "Crear una cuenta", "plus"],
                ["/registrar-negocio", "Registrar mi negocio", "shop"],
              ])}
            </>
          )}
        </nav>
        <div className="sidebar-profile">
          <span className="profile-avatar">
            {user?.nombre?.[0]?.toUpperCase() || "D"}
          </span>
          <div>
            <strong>{user?.nombre || "Tu comunidad local"}</strong>
            <small>{user ? "Cuenta de Design Lab" : "Cerca de TECBA"}</small>
          </div>
          {user && (
            <button
              onClick={logout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              ↪
            </button>
          )}
        </div>
        {error && <p role="alert">{error}</p>}
      </aside>
    </>
  );
}
