import { useState } from "react";
import { api } from "../api";
import { useConfirm } from "../confirmation";

export default function AdminDecision({ decision, onSaved, onCancel }) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { type, item } = decision;
  async function save(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    let path,
      method = "PATCH",
      body;
    if (type === "status") {
      path = `/admin/negocios/${item.id}/estado`;
      body = { ...values, estado: decision.estado };
    }
    if (type === "delete") {
      path = `/admin/negocios/${item.id}`;
      method = "DELETE";
      body = values;
    }
    if (type === "permission") {
      path = `/admin/usuarios/${item.id}/registro-negocio`;
      body = { motivo: values.motivo, permitir: !item.puede_registrar };
    }
    if (type === "review") {
      path = `/admin/solicitudes/${item.id}`;
      body = {
        respuesta: values.respuesta,
        decision: decision.approve ? "aprobar" : "rechazar",
      };
    }
    if (
      !(await confirm(
        type === "delete"
          ? "El borrado será definitivo y esta cuenta necesitará autorización para registrar otro negocio. Se conservará la decisión en su historial."
          : "Se guardará esta decisión y el propietario recibirá una notificación.",
        type === "delete" ? "delete" : "save",
      ))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(path, { method, body });
      window.dispatchEvent(new Event("navishop:moderation-changed"));
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const title =
    type === "status"
      ? `Cambiar a ${decision.estado}`
      : type === "delete"
        ? "Eliminación definitiva"
        : type === "permission"
          ? "Permiso para registrar negocio"
          : decision.approve
            ? "Aprobar solicitud"
            : "Rechazar solicitud";
  return (
    <section className="admin-editor">
      <h2>{title}</h2>
      <p>{item.nombre || item.nombre_negocio || item.correo}</p>
      <form className="entity-form" onSubmit={save}>
        {type === "review" ? (
          <>
            <p>
              <strong>Mensaje del propietario:</strong> {item.mensaje}
            </p>
            <p>
              <strong>Motivo original:</strong> {item.motivo}
            </p>
            {item.nota_interna && (
              <p>
                <strong>Nota interna:</strong> {item.nota_interna}
              </p>
            )}
            <label>
              Respuesta al propietario *
              <textarea
                name="respuesta"
                minLength="5"
                maxLength="2000"
                rows="4"
                required
              />
            </label>
            <small>
              Si apruebas: se reactivará el negocio; si fue eliminado, solo se
              autorizará un registro nuevo.
            </small>
          </>
        ) : (
          <>
            <label>
              Motivo visible para el propietario *
              <textarea
                name="motivo"
                minLength="5"
                maxLength="2000"
                rows="4"
                required
              />
            </label>
            {type !== "permission" && (
              <label>
                Nota interna (solo administración)
                <textarea name="nota_interna" maxLength="2000" rows="2" />
              </label>
            )}
          </>
        )}
        {error && <p role="alert">{error}</p>}
        <button disabled={busy}>
          {busy ? "Guardando…" : "Guardar decisión"}
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
      </form>
    </section>
  );
}
