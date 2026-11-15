import { useState } from "react";
import { api } from "../api";
import { useConfirm } from "../confirmation";

export default function AdminUserForm({ onSaved, onCancel }) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const { repetir, ...body } = Object.fromEntries(new FormData(form));
    setError("");
    if (body.contrasena !== repetir) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      if (!(await confirm(`¿Quieres guardar la nueva cuenta de ${body.nombre}?`, "save"))) return;
      await api("/admin/usuarios", { method: "POST", body });
      form.reset();
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-editor">
      <h2>Agregar usuario</h2>
      <p>La cuenta será personal. Podrás asignarle un negocio desde Negocios.</p>
      <form className="entity-form" onSubmit={save}>
        <fieldset disabled={busy} className="admin-user-fields">
          <label>Nombre<input name="nombre" autoComplete="off" required minLength={2} maxLength={120} /></label>
          <label>Correo electrónico<input name="correo" type="email" autoComplete="off" required maxLength={254} /></label>
          <label>Contraseña<input name="contrasena" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
          <small>Usa al menos 12 caracteres. Comunica la contraseña al titular por un medio privado.</small>
          <label>Repetir contraseña<input name="repetir" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
          {error && <p role="alert">{error}</p>}
          <div className="admin-actions">
            <button type="submit">{busy ? "Guardando…" : "Guardar usuario"}</button>
            <button type="button" onClick={onCancel}>Cancelar</button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
