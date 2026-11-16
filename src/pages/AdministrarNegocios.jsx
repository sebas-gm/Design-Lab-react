import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLab } from "../context";
import { useConfirm } from "../confirmation";
import { api } from "../api";
import EntityForm from "../components/EntityForm";
import FormModal from "../components/FormModal";
import LocationMap from "../components/LocationMap";
import FacadeImage from "../components/FacadeImage";
import { formatBusinessDays } from "../businessDays";
import RegistrationWait from "../components/RegistrationWait";
import { registrationWaiting } from "../registration";
import "../styles/myBusiness.css";
import PendingBusinessDeletion from '../components/PendingBusinessDeletion';

export default function AdministrarNegocios() {
  const { user, negocios, productos, loading, error: catalogError, refresh, moderation, publication } = useLab();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [editing, setEditing] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const business = negocios.find((n) => n.owner_id === user.id);
  const editableBusiness = business && publication?.negocio_id === business.id && ['pendiente', 'correcciones', 'rechazado'].includes(publication.estado) ? { ...business, ...publication.propuesta } : business;
  const archived = business?.estado === "archivado";

  async function edit(field = "nombre") {
    if (archived || busy) return;
    if (await confirm("¿Quieres editar la información de tu negocio?", "edit")) {
      setNotice("");
      setEditing(field);
    }
  }
  async function remove() {
    if (business.eliminacion_programada || busy) return;
    if (!(await confirm(`“${business.nombre}” se ocultará junto con su contenido. Tendrás 15 días para restaurarlo; después se eliminará definitivamente. Durante ese plazo no podrás editarlo ni crear otro negocio.`, "delete"))) return;
    setBusy(true);
    setError("");
    try {
      await api(`/negocios/${business.id}`, { method: "DELETE" });
      await refresh();
      navigate("/estado-negocio", { replace: true });
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if (loading && !business) return <main className="my-business"><p role="status">Cargando tu negocio…</p></main>;
  if (catalogError) return <main className="my-business"><p role="alert">{catalogError}</p><button onClick={refresh}>Reintentar</button></main>;
  if (!business) return <main className="my-business"><header className="my-business-heading"><h1>Mi negocio</h1><p>El espacio para administrar tu negocio en Navishop.</p></header>{registrationWaiting(user) ? <RegistrationWait account={user} /> : <section className="my-business-section"><h2>{user.puede_registrar === false ? "Registro pendiente de autorización" : "Aún no tienes un negocio"}</h2><p>{user.puede_registrar === false ? "Consulta la decisión administrativa y solicita autorización para registrar otro negocio." : "Completa los datos de tu negocio para comenzar a publicar productos, promociones y videos."}</p><Link to={user.puede_registrar === false ? "/estado-negocio" : "/registrar-negocio"}>{user.puede_registrar === false ? "Estado y solicitudes →" : "Registrar mi negocio →"}</Link></section>}</main>;

  if (business.eliminacion_programada) return <main className="my-business"><PendingBusinessDeletion business={business}/></main>;
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
      {["suspendido", "archivado"].includes(business.estado) && <section className="my-business-state"><h2>{archived ? "Negocio archivado · solo lectura" : "Tu negocio está suspendido"}</h2><p>{decision?.motivo || "Consulta el historial para conocer el motivo de esta decisión."}</p><p>{archived ? "Tus datos se conservan. Solicita restauración para volver a administrarlos." : "Puedes corregir la información y solicitar una revisión."}</p><Link to="/estado-negocio">{archived ? "Solicitar restauración" : "Solicitar revisión"} →</Link></section>}
      {error && <p className="my-business-feedback" role="alert">{error}</p>}
      {notice && <p className="my-business-feedback" role="status">{notice}</p>}
      {editing && !archived && <FormModal title="Editar mi negocio" initialField={editing} onClose={() => setEditing('')}>
        {(close) => <EntityForm key={business.id} kind="negocios" initial={editableBusiness} onCancel={close} onSaved={() => { setEditing(''); setNotice('Datos guardados. Si cambiaste nombre, dirección o fachada, espera la aprobación antes de verlos publicados.'); }} />}
      </FormModal>}
      <div className="my-business-grid">
        <section className="my-business-section"><div className="my-business-section-heading"><h2>Información del negocio</h2>{editButton("descripcion")}</div><p className="my-business-description">{business.descripcion}</p><dl><div><dt>Categoría</dt><dd>{business.categoria}</dd></div><div><dt>Nombre comercial</dt><dd>{business.nombre}</dd></div></dl></section>
        <section className="my-business-section"><div className="my-business-section-heading"><h2>Contacto</h2>{editButton("telefono")}</div><dl><div><dt>Teléfono / WhatsApp</dt><dd>{business.telefono || "Sin registrar"}</dd></div><div><dt>Correo electrónico</dt><dd>{business.correo_contacto || "Sin registrar"}</dd></div></dl></section>
        <section className="my-business-section"><div className="my-business-section-heading"><h2>Dirección y ubicación</h2>{editButton("direccion")}</div><p>{business.direccion}</p>{business.enlace_mapa && <a href={business.enlace_mapa} target="_blank" rel="noreferrer">Abrir enlace del mapa </a>}<LocationMap latitud={business.latitud} longitud={business.longitud} mapaEmbed={business.mapa_embed} /></section>
        <section className="my-business-section"><div className="my-business-section-heading"><h2>Horario de atención</h2>{editButton("hora_apertura")}</div><p>{formatBusinessDays(business.dias_atencion)}</p><div className="my-business-hours"><div><span>Apertura</span><strong>{business.hora_apertura || "Sin registrar"}</strong></div><span aria-hidden="true">—</span><div><span>Cierre</span><strong>{business.hora_cierre || "Sin registrar"}</strong></div></div><p>Mantén el horario actualizado para que tus clientes sepan cuándo visitarte.</p></section>
      </div>
      <section className="my-business-section"><div className="my-business-section-heading"><h2>Contenido de mi negocio</h2><span>{count} productos</span></div><div className="my-business-content-links"><Link to="/administrar-productos"><strong>Mis productos</strong><span>Consulta y organiza tu catálogo →</span></Link><Link to="/administrar-promociones"><strong>Mis promociones</strong><span>Gestiona los productos destacados →</span></Link><Link to="/administrar-videos"><strong>Mis videos</strong><span>Administra tus enlaces de video →</span></Link></div></section>
      <section className="my-business-danger"><div><h2>Eliminar mi negocio</h2><p>Tu negocio y su contenido se ocultarán durante 15 días. Podrás restaurarlos desde Estado y solicitudes. Al vencer el plazo se eliminarán definitivamente y tu cuenta volverá a personal, sin un segundo periodo de espera.</p></div><button disabled={busy} onClick={remove}>{busy ? "Solicitando…" : "Eliminar mi negocio"}</button></section>
    </main>
  );
}
