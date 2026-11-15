import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLab } from "../context";
import { useConfirm } from "../confirmation";
import { api } from "../api";
import EntityForm from "../components/EntityForm";
import LocationMap from "../components/LocationMap";
import FacadeImage from "../components/FacadeImage";
import { formatBusinessDays } from "../businessDays";
import RegistrationWait from "../components/RegistrationWait";
import { registrationWaiting } from "../registration";
import "../styles/myBusiness.css";

export default function AdministrarNegocios() {
  const { user, negocios, productos, loading, error: catalogError, refresh, moderation } = useLab();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [editing, setEditing] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editor = useRef(null);
  const business = negocios.find((n) => n.owner_id === user.id);
  const archived = business?.estado === "archivado";
  useEffect(() => {
    if (editing) (editor.current?.querySelector(`[data-time-name="${editing}"] select`) || editor.current?.querySelector(`[name="${editing}"]`))?.focus();
  }, [editing]);

  async function edit(field = "nombre") {
    if (archived || busy) return;
    if (await confirm("¿Quieres editar la información de tu negocio?", "edit")) {
      setNotice("");
      setEditing(field);
    }
  }
  async function remove() {
    if (business.estado !== "activo" || busy) return;
    if (!(await confirm(`Se eliminará definitivamente “${business.nombre}”. Tu cuenta volverá a personal y deberás esperar 15 días para registrar otro negocio. Esta acción no se puede deshacer.`, "delete"))) return;
    setBusy(true);
    setError("");
    try {
      await api(`/negocios/${business.id}`, { method: "DELETE" });
      navigate("/inicio", { replace: true });
      await refresh();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if (loading && !business) return <main className="my-business"><p role="status">Cargando tu negocio…</p></main>;
  if (catalogError) return <main className="my-business"><p role="alert">{catalogError}</p><button onClick={refresh}>Reintentar</button></main>;
  if (!business) return <main className="my-business"><header className="my-business-heading"><h1>Mi negocio</h1><p>El espacio para administrar tu negocio en Navishop.</p></header>{registrationWaiting(user) ? <RegistrationWait account={user} /> : <section className="my-business-section"><h2>{user.puede_registrar === false ? "Registro pendiente de autorización" : "Aún no tienes un negocio"}</h2><p>{user.puede_registrar === false ? "Consulta la decisión administrativa y solicita autorización para registrar otro negocio." : "Completa los datos de tu negocio para comenzar a publicar productos, promociones y videos."}</p><Link to={user.puede_registrar === false ? "/estado-negocio" : "/registrar-negocio"}>{user.puede_registrar === false ? "Estado y solicitudes →" : "Registrar mi negocio →"}</Link></section>}</main>;

  const decision = moderation?.historial?.find((e) => e.negocio_id === business.id && e.estado === business.estado);
  const count = productos.filter((p) => p.negocioId === business.id).length;
  function editButton(field) { return <button className="my-business-edit" disabled={archived || busy} onClick={() => edit(field)}>Editar</button>; }
  return (
    <main className="my-business">
      <header className="my-business-heading"><div><h1>Mi negocio</h1><p>La identidad y los datos de tu negocio, en un solo lugar.</p></div><div className="my-business-actions"><span className={`my-business-status is-${business.estado}`}>{business.estado}</span>{business.estado === "activo" && <Link to={`/negocios/${business.id}`}>Ver mi negocio</Link>}</div></header>
      <section className="my-business-profile">
        <div className="my-business-cover">{business.imagen ? <FacadeImage key={business.imagen} src={business.imagen} alt={`Fachada de ${business.nombre}`} /> : <span>Tu negocio en Navishop</span>}</div>
        <div className="my-business-identity">{business.logo && <img className="my-business-logo" src={business.logo} alt={`Logo de ${business.nombre}`} onError={(e) => { e.currentTarget.style.display = "none"; }} />}<div><span className="my-business-category">{business.categoria}</span><h2>{business.nombre}</h2><p>{business.direccion}</p></div><button disabled={archived || busy} onClick={() => edit()}>Editar datos del negocio</button></div>
      </section>
      {business.estado !== "activo" && <section className="my-business-state"><h2>{archived ? "Negocio archivado · solo lectura" : "Tu negocio está suspendido"}</h2><p>{decision?.motivo || "Consulta el historial para conocer el motivo de esta decisión."}</p><p>{archived ? "Tus datos se conservan. Solicita restauración para volver a administrarlos." : "Puedes corregir la información y solicitar una revisión."}</p><Link to="/estado-negocio">{archived ? "Solicitar restauración" : "Solicitar revisión"} →</Link></section>}
      {error && <p className="my-business-feedback" role="alert">{error}</p>}
      {notice && <p className="my-business-feedback" role="status">{notice}</p>}
      {editing && !archived && <section className="my-business-section" ref={editor}><h2>Editar mi negocio</h2><p>Puedes actualizar los datos, las fotos, la ubicación y los horarios.</p><EntityForm key={business.id} kind="negocios" initial={business} onCancel={() => setEditing("")} onSaved={() => { setEditing(""); setNotice("Los datos de tu negocio se guardaron correctamente."); }} /></section>}
      <div className="my-business-grid">
        <section className="my-business-section"><div className="my-business-section-heading"><h2>Información del negocio</h2>{editButton("descripcion")}</div><p className="my-business-description">{business.descripcion}</p><dl><div><dt>Categoría</dt><dd>{business.categoria}</dd></div><div><dt>Nombre comercial</dt><dd>{business.nombre}</dd></div></dl></section>
        <section className="my-business-section"><div className="my-business-section-heading"><h2>Contacto</h2>{editButton("telefono")}</div><dl><div><dt>Teléfono / WhatsApp</dt><dd>{business.telefono || "Sin registrar"}</dd></div><div><dt>Correo electrónico</dt><dd>{business.correo_contacto || "Sin registrar"}</dd></div></dl></section>
        <section className="my-business-section"><div className="my-business-section-heading"><h2>Dirección y ubicación</h2>{editButton("direccion")}</div><p>{business.direccion}</p>{business.enlace_mapa && <a href={business.enlace_mapa} target="_blank" rel="noreferrer">Abrir enlace del mapa </a>}<LocationMap latitud={business.latitud} longitud={business.longitud} /></section>
        <section className="my-business-section"><div className="my-business-section-heading"><h2>Horario de atención</h2>{editButton("hora_apertura")}</div><p>{formatBusinessDays(business.dias_atencion)}</p><div className="my-business-hours"><div><span>Apertura</span><strong>{business.hora_apertura || "Sin registrar"}</strong></div><span aria-hidden="true">—</span><div><span>Cierre</span><strong>{business.hora_cierre || "Sin registrar"}</strong></div></div><p>Mantén el horario actualizado para que tus clientes sepan cuándo visitarte.</p></section>
      </div>
      <section className="my-business-section"><div className="my-business-section-heading"><h2>Contenido de mi negocio</h2><span>{count} productos</span></div><div className="my-business-content-links"><Link to="/administrar-productos"><strong>Mis productos</strong><span>Consulta y organiza tu catálogo →</span></Link><Link to="/administrar-promociones"><strong>Mis promociones</strong><span>Gestiona los productos destacados →</span></Link><Link to="/administrar-videos"><strong>Mis videos</strong><span>Administra tus enlaces de video →</span></Link></div></section>
      <section className="my-business-danger"><div><h2>Eliminar mi negocio</h2><p>La eliminación es definitiva. Primero debes retirar todos los productos y videos. Tu cuenta volverá a personal y tendrás que esperar 15 días para registrar otro negocio.</p>{business.estado !== "activo" && <p>Un negocio suspendido o archivado solo puede eliminarlo la administración.</p>}</div><button disabled={busy || business.estado !== "activo"} onClick={remove}>{busy ? "Eliminando…" : "Eliminar mi negocio"}</button></section>
    </main>
  );
}
