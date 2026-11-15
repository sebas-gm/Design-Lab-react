import { useState } from "react";
import { Link } from "react-router-dom";
import { useLab } from "../context";
import { api } from "../api";
import { useConfirm } from "../confirmation";
import "../styles/moderation.css";
import RegistrationWait from "../components/RegistrationWait";
import { registrationWaiting } from "../registration";

export default function BusinessStatus() {
  const { moderation, moderationError } = useLab();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  if (!moderation && moderationError)
    return (
      <main className="videos-page">
        <p role="alert">{moderationError}</p>
        <button
          onClick={() =>
            window.dispatchEvent(new Event("navishop:moderation-changed"))
          }
        >
          Reintentar
        </button>
      </main>
    );
  if (!moderation)
    return (
      <main className="videos-page">
        <p role="status">Cargando estado del negocio…</p>
      </main>
    );
  const { negocio, historial, solicitudes, puede_registrar } = moderation;
  const eligible = negocio
    ? ["suspendido", "archivado"].includes(negocio.estado)
    : !puede_registrar;
  const pending = solicitudes.some((r) => r.estado === "pendiente");
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const mensaje = new FormData(form).get("mensaje");
    if (
      !(await confirm(
        "Se enviará tu solicitud a la administración de Navishop.",
        "save",
      ))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(
        negocio
          ? `/negocios/${negocio.id}/solicitudes`
          : "/mi-moderacion/contacto",
        { method: "POST", body: { mensaje } },
      );
      window.dispatchEvent(new Event("navishop:moderation-changed"));
      form.reset();
      setNotice(
        "Solicitud enviada. Recibirás una notificación con la respuesta.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="videos-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Tu negocio y la administración</span>
          <h1>Estado y solicitudes</h1>
          <p>
            {negocio
              ? `${negocio.nombre} · ${negocio.estado}`
              : registrationWaiting(moderation)
                ? "Registro temporalmente en espera tras eliminar tu negocio."
                : puede_registrar
                ? "Puedes registrar un negocio."
                : "Registro de nuevos negocios pendiente de autorización."}
          </p>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!negocio && registrationWaiting(moderation) && <RegistrationWait account={moderation} />}
      {eligible && (
        <section className="moderation-card">
          <h2>
            {negocio?.estado === "suspendido"
              ? "Solicitar revisión"
              : negocio
                ? "Solicitar restauración"
                : "Solicitar autorización para otro negocio"}
          </h2>
          <p>
            {negocio?.estado === "suspendido"
              ? "Corrige la información de tu negocio y explica qué cambiaste."
              : negocio
                ? "El negocio archivado conserva sus datos. Explica por qué solicitas restaurarlo."
                : "Explica por qué solicitas autorización para registrar un negocio. Si el anterior fue eliminado, no se recuperarán sus datos."}
          </p>
          {pending ? (
            <p>
              Ya tienes una solicitud pendiente. Espera la respuesta de
              administración.
            </p>
          ) : (
            <form className="entity-form" onSubmit={submit}>
              <label>
                Tu mensaje
                <textarea
                  name="mensaje"
                  minLength="10"
                  maxLength="3000"
                  rows="4"
                  required
                  disabled={busy}
                />
              </label>
              <button disabled={busy}>
                {busy ? "Enviando…" : "Enviar solicitud"}
              </button>
            </form>
          )}
        </section>
      )}
      {!negocio && puede_registrar && (
        <Link className="purple-link" to="/registrar-negocio">
          Registrar mi negocio ↗
        </Link>
      )}
      <h2 className="moderation-heading">Tus solicitudes</h2>
      {!solicitudes.length && <p>No has enviado solicitudes.</p>}
      {solicitudes.map((r) => (
        <article key={r.id} className="moderation-card">
          <span className="platform-badge">{r.estado}</span>
          <p>{r.mensaje}</p>
          <small>{new Date(`${r.fecha}Z`).toLocaleString()}</small>
          {r.respuesta && (
            <p>
              <strong>Respuesta:</strong> {r.respuesta}
            </p>
          )}
        </article>
      ))}
      <h2 className="moderation-heading">Historial de decisiones</h2>
      {!historial.length && (
        <p>No hay decisiones de moderación para tu cuenta.</p>
      )}
      {historial.map((e) => (
        <article key={e.id} className="moderation-card">
          <span className="platform-badge">{e.estado}</span>
          <h3>{e.nombre_negocio}</h3>
          <p>{e.motivo}</p>
          <small>{new Date(`${e.fecha}Z`).toLocaleString()}</small>
        </article>
      ))}
    </main>
  );
}
