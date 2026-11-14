import { useState } from "react";
import { api } from "../api";
import { useLab } from "../context";
import { negocios as ejemplosNegocios } from "../data/negocios";
import { productos as ejemplosProductos } from "../data/productos";

function readLocalBusinesses() {
  try {
    const value = JSON.parse(
      localStorage.getItem("negociosRegistrados") || "[]",
    );
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export default function LegacyImport() {
  const { refresh, user } = useLab();
  const [locals] = useState(readLocalBusinesses);
  const [localId, setLocalId] = useState("");
  const [exampleId, setExampleId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function importar(ejemplos) {
    setBusy(true);
    setMessage("");
    try {
      const allBusinesses = ejemplos
        ? ejemplosNegocios.map((n) => ({
            ...n,
            direccion: "Dirección pendiente de verificar",
          }))
        : JSON.parse(localStorage.getItem("negociosRegistrados") || "[]");
      const allProducts = ejemplos
        ? ejemplosProductos
        : JSON.parse(localStorage.getItem("productosRegistrados") || "[]");
      if (!Array.isArray(allBusinesses) || !Array.isArray(allProducts))
        throw new Error(
          "Los datos locales no tienen el formato esperado. Los originales se han conservado.",
        );
      const id = ejemplos ? exampleId : localId;
      if (allBusinesses.length > 1 && !id)
        throw new Error("Selecciona el único negocio que quieres importar.");
      const negocio =
        allBusinesses.length === 1
          ? allBusinesses[0]
          : allBusinesses.find((n) => String(n.id) === id);
      if (!negocio)
        throw new Error("No hay un negocio seleccionado para importar.");
      const productos = allProducts.filter(
        (p) => String(p.negocioId) === String(negocio.id),
      );
      if (
        !window.confirm(
          `Se importará “${negocio.nombre}” con ${productos.length} productos. Tu cuenta tendrá un solo negocio. Los datos originales seguirán en el navegador. ¿Continuar?`,
        )
      )
        return;
      const result = await api("/importar", {
        method: "POST",
        body: { negocios: [negocio], productos },
      });
      setMessage(result.message);
      await refresh();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="migration-panel">
      <h2>Conservar datos anteriores</h2>
      <p>
        Cada cuenta puede tener un solo negocio. Elige cuál importar con sus
        productos; los demás registros se conservan en el navegador.
      </p>
      {user.tipo_cuenta === "personal" && (
        <p>Importar un negocio activa tu cuenta de negocios.</p>
      )}
      {locals.length > 1 && (
        <label>
          Negocio guardado en este navegador
          <select
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
            disabled={busy}
          >
            <option value="">Selecciona un negocio</option>
            {locals.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      <button disabled={busy} onClick={() => importar(false)}>
        Importar mi negocio local
      </button>
      <label>
        Negocio de ejemplo
        <select
          value={exampleId}
          onChange={(e) => setExampleId(e.target.value)}
          disabled={busy}
        >
          <option value="">Selecciona un ejemplo</option>
          {ejemplosNegocios.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nombre}
            </option>
          ))}
        </select>
      </label>
      <button disabled={busy} onClick={() => importar(true)}>
        Importar ejemplo seleccionado
      </button>
      <p role="status">{message}</p>
    </section>
  );
}
