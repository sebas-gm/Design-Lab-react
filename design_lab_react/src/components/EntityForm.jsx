import { useState } from "react";
import { api } from "../api";
import { useLab } from "../context";
import "../styles/registrarNegocio.css";
export default function EntityForm({ kind, initial, onSaved, onCancel }) {
  const business = kind === "negocios";
  const { negocios, user, refresh } = useLab();
  const mine = negocios.filter((n) => n.owner_id === user.id);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (business) {
      values.latitud = values.latitud === "" ? null : Number(values.latitud);
      values.longitud = values.longitud === "" ? null : Number(values.longitud);
    } else {
      values.negocioId = Number(values.negocioId);
      values.promocion = values.promocion === "on";
    }
    try {
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
      {!business && (
        <label>
          Negocio
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
      <label>
        Nombre
        <input
          name="nombre"
          defaultValue={initial?.nombre}
          maxLength="120"
          required
        />
      </label>
      {business ? (
        <>
          <label>
            Categoría
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
          <label>
            Dirección
            <input
              name="direccion"
              defaultValue={initial?.direccion}
              maxLength="255"
              required
            />
          </label>
          <div className="coordinate-fields">
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
          <small>
            Coordenadas opcionales: copia ambas desde OpenStreetMap.
          </small>
        </>
      ) : (
        <label>
          Precio (Bs.)
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
        Descripción
        <textarea
          name="descripcion"
          defaultValue={initial?.descripcion}
          rows="4"
          maxLength="5000"
          required
        />
      </label>
      <label>
        Imagen (URL)
        <input
          name="imagen"
          type="url"
          maxLength="2048"
          placeholder="https://…"
          defaultValue={initial?.imagen}
        />
      </label>
      {!business && (
        <label className="checkbox-label">
          <input
            name="promocion"
            type="checkbox"
            defaultChecked={initial?.promocion}
          />{" "}
          En promoción
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      <button disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
      {onCancel && (
        <button type="button" onClick={onCancel}>
          Cancelar
        </button>
      )}
    </form>
  );
}
