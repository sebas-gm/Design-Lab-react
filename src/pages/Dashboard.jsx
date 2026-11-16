import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLab } from "../context";
import { api } from "../api";
import FormModal from "../components/FormModal";
import EntityForm from "../components/EntityForm";
import "../styles/dashboard.css";

function Icon({ name }) {
  const paths = { product: "M12 2 3 7v10l9 5 9-5V7l-9-5ZM3 7l9 5 9-5M12 12v10", tag: "M3 3h8l10 10-8 8L3 11V3ZM7 7h.01", video: "M3 4h18v16H3zM10 8l6 4-6 4V8Z", shop: "M4 10v11h16V10M2 10l3-7h14l3 7H2ZM9 21v-7h6v7", clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function Dashboard() {
  const [creating, setCreating] = useState(false);
  const { negocios, productos, user, loading, error } = useLab();
  const business = negocios.find((n) => n.owner_id === user.id);
  const products = productos.filter((p) => p.negocioId === business?.id);
  const [extra, setExtra] = useState({ videos: null, notices: [], pending: true, error: "" });
  useEffect(() => {
    let active = true;
    async function load() {
      const [videos, notices] = await Promise.allSettled([api("/mis-videos"), api("/notificaciones")]);
      if (active) setExtra({ videos: videos.status === "fulfilled" ? videos.value.length : null, notices: notices.status === "fulfilled" ? notices.value.items.slice(0, 4) : [], pending: false, error: [videos, notices].filter((r) => r.status === "rejected").map((r) => r.reason.message).join(" ") });
    }
    load();
    window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("focus", load); };
  }, []);
  const archived = business?.estado === "archivado";
  const actions = [["shop", "Administrar mi negocio", "/administrar-negocios", false], ["product", "Registrar producto", "/registrar-producto", !business || archived], ["tag", "Administrar promociones", "/administrar-promociones", !business || archived], ["video", "Administrar videos", "/administrar-videos", !business || archived]];
  const stats = [["product", "Productos", loading || error ? "—" : products.length, "/administrar-productos"], ["tag", "Promociones", loading || error ? "—" : products.filter((p) => p.promocion).length, "/administrar-promociones"], ["video", "Videos", extra.videos ?? "—", "/administrar-videos"], ["shop", "Estado del negocio", loading ? "…" : business?.estado || "Sin negocio", "/estado-negocio"]];
  return <main className="dashboard owner-dashboard">
    <header className="owner-heading">
      <div><h1>Panel de administración</h1><p>Gestiona tu negocio, productos, promociones y videos.</p></div>
      <div className="owner-heading-actions">
        <Link to="/estado-negocio" className={`owner-state state-${business?.estado}`}>
          {loading ? "Cargando…" : business ? `● Negocio ${business.estado}` : "Sin negocio"}
        </Link>
        <Link className="owner-view-business" to={business?.estado === "activo" ? `/negocios/${business.id}` : "/estado-negocio"}>
          {business?.estado === "activo" ? "Ver mi negocio" : "Estado y solicitudes →"}
        </Link>
      </div>
    </header>
    {(error || extra.error) && <p role="alert" className="owner-error">{error || extra.error}</p>}
    <div className="owner-metrics">{stats.map(([icon, label, count, to]) => <Link key={label} to={to} className={`owner-metric tone-${icon}`}><span className="owner-icon"><Icon name={icon}/></span><div><strong>{count}</strong><span>{label}</span></div></Link>)}</div>
    {creating && !archived && <FormModal title="Registrar producto" onClose={() => setCreating(false)}>
      {(close) => <EntityForm kind="productos" onSaved={() => setCreating(false)} onCancel={close} />}
    </FormModal>}
    <div className="owner-grid">
      <section className="owner-card"><h2><span className="owner-gold" aria-hidden="true"></span> Acciones rápidas</h2><div className="owner-actions">{actions.map(([icon,label,to,disabled]) => disabled ? <div className={`owner-action tone-${icon} unavailable`} key={label}><span className="owner-icon"><Icon name={icon}/></span><span>{label}</span><small>{archived ? "Negocio archivado" : "Requiere negocio"}</small></div> : <Link key={label} to={to} onClick={to === "/registrar-producto" ? (event) => { event.preventDefault(); setCreating(true); } : undefined} className={`owner-action tone-${icon}`}><span className="owner-icon"><Icon name={icon}/></span><span>{label}</span><span className="owner-arrow" aria-hidden="true">›</span></Link>)}</div></section>
      <section className="owner-card owner-recent"><div className="owner-card-heading"><h2><Icon name="clock"/> Novedades y avisos</h2><Link to="/notificaciones">Ver todo →</Link></div>{extra.pending ? <p role="status">Cargando avisos…</p> : extra.notices.length ? <ul>{extra.notices.map((n) => <li key={n.id}><span className="owner-icon"><Icon name="shop"/></span><div><strong>{n.titulo}</strong><p>{n.mensaje}</p><time dateTime={`${n.fecha}Z`}>{new Date(`${n.fecha}Z`).toLocaleString("es")}</time></div></li>)}</ul> : <div className="owner-empty"><Icon name="clock"/><p>Aún no tienes avisos. Aquí aparecerán las notificaciones sobre tu negocio.</p></div>}</section>
    </div>
  </main>;
}
