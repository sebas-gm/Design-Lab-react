import { useState } from "react";
import { api } from "../api";
import { useLab } from "../context";
import ImagePicker from "./ImagePicker";
import { useConfirm } from "../confirmation";
import "../styles/registrarNegocio.css";

async function upload(file) {
  const body = new FormData();
  body.append("file", file);
  return (await api("/imagenes", { method: "POST", body })).url;
}

export default function EntityForm({ kind, initial, onSaved, onCancel }) {
  const confirm = useConfirm();
  const business = kind === "negocios";
  const { negocios, user, refresh } = useLab();
  const mine = negocios.filter((n) => n.owner_id === user.id);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [logo, setLogo] = useState(null);
  const [uploaded, setUploaded] = useState({});

  async function submit(event) {
    event.preventDefault();
    const entity = business ? "negocio" : "producto";
    const question = initial
      ? `¿Quieres guardar los cambios de este ${entity}?`
      : `¿Quieres registrar y publicar este ${entity}?${business && user.tipo_cuenta === "personal" ? " Se activará tu cuenta de negocios." : ""}`;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!(await confirm(question, "save"))) return;
    setError("");
    setBusy(true);
    // File controls have no name: only their validated server paths enter the JSON.
    values.imagen = initial?.imagen || "";
    if (business) {
      values.logo = initial?.logo || "";
      values.latitud = values.latitud === "" ? null : Number(values.latitud);
      values.longitud = values.longitud === "" ? null : Number(values.longitud);
    } else {
      values.negocioId = Number(values.negocioId);
      values.promocion = values.promocion === "on";
    }
    try {
      if (photo) {
        const url =
          uploaded.photo?.file === photo
            ? uploaded.photo.url
            : await upload(photo);
        setUploaded((previous) => ({
          ...previous,
          photo: { file: photo, url },
        }));
        values.imagen = url;
      }
      if (business && logo) {
        const url =
          uploaded.logo?.file === logo ? uploaded.logo.url : await upload(logo);
        setUploaded((previous) => ({ ...previous, logo: { file: logo, url } }));
        values.logo = url;
      }
      await api(`/${kind}${initial ? `/${initial.id}` : ""}`, {
        method: initial ? "PUT" : "POST",
        body: values,
      });
      await refresh();
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="entity-form" onSubmit={submit}>
      <fieldset disabled={busy} className="form-section">
        <legend>
          {business ? "1. Datos principales" : "Datos del producto"}
        </legend>
        {!business && (
          <label>
            Negocio *
            <select
              name="negocioId"
              defaultValue={initial?.negocioId || ""}
              required
            >
              <option value="">Selecciona un negocio</option>
              {mine.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className={business ? "form-two-columns" : ""}>
          <label>
            {business ? "Nombre del negocio" : "Nombre del producto"} *
            <input
              name="nombre"
              defaultValue={initial?.nombre}
              maxLength="120"
              placeholder={
                business ? "Ej: Cafetería Central" : "Ej: Café con leche"
              }
              required
            />
          </label>
          {business && (
            <label>
              Tipo o categoría *
              <select
                name="categoria"
                defaultValue={initial?.categoria || ""}
                required
              >
                <option value="">Selecciona una categoría</option>
                {["Comida", "Librería", "Tienda", "Servicios", "Otros"].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </label>
          )}
        </div>
        {business ? (
          <>
            <div className="form-two-columns">
              <label>
                Teléfono / WhatsApp *
                <input
                  name="telefono"
                  type="tel"
                  maxLength="30"
                  placeholder="Ej: 71234567"
                  defaultValue={initial?.telefono}
                  required
                />
              </label>
              <label>
                Correo electrónico *
                <input
                  name="correo_contacto"
                  type="email"
                  maxLength="254"
                  placeholder="contacto@negocio.com"
                  defaultValue={initial?.correo_contacto}
                  required
                />
              </label>
            </div>
            <label>
              Dirección física *
              <input
                name="direccion"
                maxLength="255"
                placeholder="Calle o avenida, número, zona o barrio"
                defaultValue={initial?.direccion}
                required
              />
            </label>
            <label>
              Enlace a Google Maps (opcional)
              <input
                name="enlace_mapa"
                type="url"
                maxLength="2048"
                placeholder="https://maps.app.goo.gl/…"
                defaultValue={initial?.enlace_mapa}
              />
            </label>
          </>
        ) : (
          <label>
            Precio (Bs.) *
            <input
              name="precio"
              type="number"
              min="0.01"
              max="99999999.99"
              step="0.01"
              defaultValue={initial?.precio}
              required
            />
          </label>
        )}
        <label>
          Descripción *
          <textarea
            name="descripcion"
            defaultValue={initial?.descripcion}
            rows="3"
            maxLength="5000"
            placeholder="Cuéntanos qué ofrece tu negocio"
            required
          />
        </label>
        {business && (
          <details className="location-details">
            <summary>Ubicación en el mapa (opcional)</summary>
            <p>
              Indica ambas coordenadas para mostrar el mapa dentro de Design
              Lab.
            </p>
            <div className="form-two-columns">
              <label>
                Latitud
                <input
                  name="latitud"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  defaultValue={initial?.latitud ?? ""}
                />
              </label>
              <label>
                Longitud
                <input
                  name="longitud"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  defaultValue={initial?.longitud ?? ""}
                />
              </label>
            </div>
          </details>
        )}
      </fieldset>

      {business && (
        <fieldset disabled={busy} className="form-section">
          <legend>2. Horario de atención</legend>
          <div className="form-two-columns">
            <label>
              Hora de apertura
              <input
                name="hora_apertura"
                type="time"
                defaultValue={initial?.hora_apertura}
              />
            </label>
            <label>
              Hora de cierre
              <input
                name="hora_cierre"
                type="time"
                defaultValue={initial?.hora_cierre}
              />
            </label>
          </div>
        </fieldset>
      )}

      <fieldset disabled={busy} className="form-section">
        <legend>
          {business ? "3. Fotos del negocio" : "Imagen del producto"}
        </legend>
        <div className={business ? "form-two-columns" : ""}>
          <ImagePicker
            label={business ? "Foto de fachada" : "Foto del producto"}
            value={photo}
            onChange={setPhoto}
            existing={initial?.imagen}
            required={business && !initial}
            disabled={busy}
          />
          {business && (
            <ImagePicker
              label="Logo del comercio (opcional)"
              value={logo}
              onChange={setLogo}
              existing={initial?.logo}
              disabled={busy}
            />
          )}
        </div>
        <small>
          Elige una imagen de tu PC. JPG, PNG o WebP · Hasta 5 MB por imagen.
        </small>
      </fieldset>
      {!business && (
        <label className="checkbox-label">
          <input
            name="promocion"
            type="checkbox"
            defaultChecked={initial?.promocion}
            disabled={busy}
          />{" "}
          En promoción
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      <button className="publish-button" disabled={busy}>
        {busy
          ? "Guardando imágenes y datos…"
          : initial
            ? "Guardar cambios"
            : business
              ? "Registrar y publicar negocio"
              : "Guardar producto"}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
      )}
    </form>
  );
}
