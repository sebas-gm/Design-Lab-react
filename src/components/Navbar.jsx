import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useLab } from "../context";
import { api } from "../api";
import { useConfirm } from "../confirmation";
import { accountHome, isClientView } from "../navigation";
import "../styles/navbar.css";

const publicLinks = [
  ["/inicio", "Inicio", "home"],
  ["/negocios", "Negocios", "shop"],
  ["/videos", "Videos", "play"],
  ["/promociones", "Promociones", "tag"],
];
const ownerLinks = [
  ["/dashboard", "Mi panel", "grid"],
  ["/mi-cuenta", "Mi cuenta", "grid"],
  ["/administrar-negocios", "Mi negocio", "shop"],
  ["/administrar-productos", "Mis productos", "grid"],
  ["/administrar-promociones", "Mis promociones", "tag"],
  ["/administrar-videos", "Mis videos", "play"],
  ["/estado-negocio", "Estado y solicitudes", "shop"],
];
const adminLinks = [
  ["/admin", "Panel del sistema", "grid"],
  ["/admin/negocios", "Todos los negocios", "shop"],
  ["/admin/usuarios", "Usuarios", "user"],
  ["/admin/contenido", "Contenido", "play"],
  ["/admin/historial", "Historial", "grid"],
  ["/admin/solicitudes", "Solicitudes", "grid"],
  ["/admin/reportes", "Reportes", "grid"],
  ["/admin/publicaciones", "Publicaciones", "shop"],
  ["/mi-cuenta", "Mi cuenta", "user"],
];

function Icon({ name }) {
  const paths = {
    user: "M20 21v-2a7 7 0 0 0-14 0v2M17 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
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
  const confirm = useConfirm();
  const { user, setUser, notificationCount = 0 } = useLab();
  const business = user?.is_admin || user?.tipo_cuenta === "negocios";
  const { pathname } = useLocation();
  const clientView = isClientView(user, pathname);
  const workspace = business && !clientView;
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
    if (
      !(await confirm(
        "Tendrás que iniciar sesión de nuevo para volver a tu cuenta.",
        "logout",
      ))
    )
      return;
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
      `${workspace && user?.is_admin ? "/admin/negocios" : "/negocios"}?q=${encodeURIComponent(new FormData(event.currentTarget).get("q"))}`,
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
        {workspace && (
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
        )}
        <Link to={clientView ? "/inicio" : accountHome(user)} className="brand">
          <span className="brand-symbol">
            N<span>•</span>
          </span>
          <span>
            Navishop
            <small>
              {workspace
                ? user?.is_admin
                  ? "Administración de Navishop"
                  : "El espacio de tu negocio"
                : "Descubre lo que está cerca"}
            </small>
          </span>
        </Link>
        {user && clientView && (
          <nav className="topbar-tabs" aria-label="Explorar Navishop">
            {links(publicLinks)}
          </nav>
        )}
        {(clientView || (workspace && user?.is_admin)) && (
          <form className="topbar-search" role="search" onSubmit={search}>
            <input
              name="q"
              aria-label="Buscar negocios y productos"
              placeholder={workspace && user?.is_admin ? "Buscar negocios en el sistema…" : "Busca algo..."}
            />
            <button aria-label="Buscar">⌕</button>
          </form>
        )}
        {business && (
          <Link
            className={`view-switch ${workspace ? "from-workspace" : ""}`}
            to={clientView ? accountHome(user) : "/inicio"}
            onClick={() => setOpen(false)}
          >
            {clientView ? "Volver a mi panel" : "Ver como cliente"}{" "}
            <span aria-hidden="true"></span>
          </Link>
        )}
        {user && (!business || workspace) && (
          <Link
            className="notification-link"
            to="/notificaciones"
            aria-label={`Notificaciones: ${notificationCount} sin leer`}
            title="Notificaciones"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            </svg>
            {notificationCount > 0 && (
              <span>{notificationCount > 99 ? "99+" : notificationCount}</span>
            )}
          </Link>
        )}
        {!(business && clientView) && (
          <Link
            to={user ? "/mi-cuenta" : "/login"}
            className="topbar-account"
            aria-label={user ? `Mi cuenta: ${user.nombre}` : "Iniciar sesión"}
            title={user?.nombre}
          >
            {user && (
              <span className="topbar-user-avatar" aria-hidden="true">
                <span>{user.nombre?.[0]?.toUpperCase() || "N"}</span>
                {user.avatar && (
                  <img
                    src={user.avatar}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </span>
            )}
            <span className="topbar-user-name">
              {user ? user.nombre : "Iniciar sesión"}
            </span>
          </Link>
        )}
        {user && clientView && !business && (
          <button
            className="topbar-logout"
            onClick={logout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            Cerrar sesión
          </button>
        )}
      </header>
      {open && workspace && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        />
      )}
      {workspace && (
        <aside id="sidebar" className={`sidebar ${open ? "is-open" : ""}`}>
          {user?.is_admin && (
            <Link to="/admin" className="admin-sidebar-brand" onClick={() => setOpen(false)}>
              <span className="brand-symbol" aria-hidden="true">N<span>•</span></span>
              <span>Navishop</span>
            </Link>
          )}
          <nav aria-label="Herramientas de tu negocio">
            <p className="sidebar-label">
              {user?.is_admin
                ? "SUPERADMIN Bv"
                : "Mi espacio de negocios"}
            </p>
            {links(user?.is_admin ? adminLinks : ownerLinks)}
          </nav>
          <div className="sidebar-profile">
            <span className="profile-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                user?.nombre?.[0]?.toUpperCase() || "N"
              )}
            </span>
            <div>
              <strong>{user?.nombre || "Tu comunidad local"}</strong>
              <small>
                {user
                  ? user.is_admin
                    ? "Administrador del sistema"
                    : user.tipo_cuenta === "negocios"
                      ? "Cuenta de negocios"
                      : "Cuenta personal"
                  : "Cerca de TECBA"}
              </small>
            </div>
            {user && (
              <button
                onClick={logout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                Cerrar sesión
              </button>
            )}
          </div>
          {error && <p role="alert">{error}</p>}
        </aside>
      )}
      {!workspace && error && (
        <p className="navigation-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
