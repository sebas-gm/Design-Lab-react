import { Link } from "react-router-dom";
import { useLab } from "../context";

const symbols = { Negocios: "▥", Usuarios: "♙", Productos: "◇", Videos: "▷", Promociones: "♧" };

export default function AdminOverview({ data, onCreate }) {
  const { user } = useLab();
  const pending = data.solicitudes.filter((r) => r.estado === "pendiente").length;
  const stats = [
    ["Negocios", data.negocios.length, "/admin/negocios"],
    ["Usuarios", data.usuarios.length, "/admin/usuarios"],
    ["Productos", data.productos.length, "/admin/contenido"],
    ["Videos", data.videos.length, "/admin/contenido"],
    ["Promociones", data.productos.filter((p) => p.promocion).length, "/admin/contenido"],
  ];
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - 6 + index);
    const count = data.historial.filter((log) => new Date(`${log.fecha}Z`).toDateString() === day.toDateString()).length;
    return { label: day.toLocaleDateString("es", { weekday: "short" }), count, date: day.toLocaleDateString("es") };
  });
  const max = Math.max(1, ...days.map((day) => day.count));
  const points = days.map((day, index) => `${25 + index * 70},${145 - (day.count / max) * 115}`).join(" ");

  return (
    <div className="admin-overview">
      <section className="admin-welcome">
        <div><span className="admin-welcome-label">TU CENTRO DE CONTROL</span>
          <h2>Hola, {user?.nombre?.split(" ")[0] || "administrador"} <span aria-hidden="true">✦</span></h2>
          <p>Bienvenido al panel de superadministración de Navishop.</p>
        </div>
        <div className="admin-welcome-art" aria-hidden="true"><span>▥</span><span>▤</span><span>✦</span></div>
      </section>

      <div className="admin-metrics">
        {stats.map(([label, count, path]) => (
          <Link to={path} className="admin-metric" key={label}>
            <span className={`metric-icon metric-${label.toLowerCase()}`} aria-hidden="true">{symbols[label]}</span>
            <div><strong>{count}</strong><span>{label}</span></div>
          </Link>
        ))}
      </div>

      <div className="admin-overview-grid">
        <section className="admin-dashboard-card">
          <div className="admin-card-heading"><h2>Actividad administrativa</h2><span>Últimos 7 días</span></div>
          <p className="admin-card-caption">Acciones realizadas desde el panel, según las últimas 100 entradas del historial.</p>
          <figure className="admin-activity-chart">
            <svg viewBox="0 0 470 185" role="img" aria-label={`Acciones por día: ${days.map((d) => `${d.date}: ${d.count}`).join(", ")}`}>
              <defs><linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9a60ee" stopOpacity=".42" /><stop offset="100%" stopColor="#9a60ee" stopOpacity=".02" /></linearGradient></defs>
              {[30, 68, 106, 145].map((y) => <line key={y} x1="25" x2="445" y1={y} y2={y} stroke="#ece5f7" />)}
              <polygon points={`25,145 ${points} 445,145`} fill="url(#activity-fill)" />
              <polyline points={points} fill="none" stroke="#8b45e6" strokeWidth="3" strokeLinejoin="round" />
              {days.map((day, index) => <g key={day.date}><circle cx={25 + index * 70} cy={145 - (day.count / max) * 115} r="4" fill="#8b45e6" stroke="white"><title>{day.date}: {day.count} acciones</title></circle><text x={25 + index * 70} y="171" textAnchor="middle">{day.label}</text><text x={25 + index * 70} y={133 - (day.count / max) * 115} textAnchor="middle">{day.count}</text></g>)}
            </svg>
            {!days.some((d) => d.count) && <figcaption>Aún no hay acciones registradas esta semana.</figcaption>}
          </figure>
        </section>

        <section className="admin-dashboard-card">
          <div className="admin-card-heading"><h2>Actividad reciente</h2><Link to="/admin/historial">Ver todo →</Link></div>
          <ul className="admin-recent-activity">
            {data.historial.slice(0, 4).map((log) => (
              <li key={log.id}><span className="activity-icon" aria-hidden="true">◇</span><div><strong>{log.accion.replaceAll("_", " ")} · {log.recurso}</strong><span>{log.detalle?.nombre || log.detalle?.correo || `Registro #${log.recurso_id}`}</span><small>{log.administrador} · {new Date(`${log.fecha}Z`).toLocaleString("es")}</small></div></li>
            ))}
          </ul>
          {!data.historial.length && <p className="admin-card-caption">Las próximas acciones administrativas aparecerán aquí.</p>}
        </section>

        <section className="admin-dashboard-card">
          <div className="admin-card-heading"><h2><span className="admin-gold" aria-hidden="true"></span> Acciones rápidas</h2></div>
          <div className="admin-quick-actions">
            <button onClick={() => onCreate("negocios")}>＋ Registrar negocio</button>
            <button onClick={() => onCreate("usuarios")}>＋ Crear usuario</button>
            <button onClick={() => onCreate("productos")}>＋ Agregar producto</button>
          </div>
        </section>

        <section className="admin-dashboard-card admin-moderation-summary">
          <div className="admin-card-heading"><h2>Estado de la plataforma</h2><span className="admin-connected">Datos actualizados</span></div>
          <p><strong>{data.negocios.filter((b) => b.estado === "activo").length}</strong> negocios activos · <strong>{pending}</strong> solicitudes pendientes</p>
          <Link to="/admin/solicitudes">Revisar solicitudes →</Link>
        </section>
      </div>
      <p className="admin-preservation-note">Suspender o archivar conserva el contenido. El borrado definitivo requiere archivar el negocio y retirar sus productos y videos.</p>
    </div>
  );
}
