import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useLab } from "../context";
import EntityForm from "./EntityForm";
import { useConfirm } from "../confirmation";
import "../styles/administrarNegocios.css";
import "../styles/administrarProductos.css";
import "../styles/administrarPromociones.css";
export default function ManageEntities({ kind, promotions = false }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user, negocios, productos, refresh } = useLab();
  const [editing, setEditing] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const mine = negocios.filter((n) => n.owner_id === user.id);
  const archived = mine.some((n) => n.estado === "archivado");
  const items =
    kind === "negocios"
      ? mine
      : productos.filter((p) => mine.some((n) => n.id === p.negocioId));
  async function mutate(item, promotion) {
    if (
      !promotion &&
      !(await confirm(
        `Se eliminará “${item.nombre}”. Esta acción no se puede deshacer.${kind === "negocios" ? " Tu cuenta volverá a ser personal y deberás esperar 15 días para registrar otro negocio." : ""}`,
        "delete",
      ))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(`/${kind}/${item.id}${promotion ? "/promocion" : ""}`, {
        method: promotion ? "PATCH" : "DELETE",
        ...(promotion ? { body: { promocion: !item.promocion } } : {}),
      });
      if (kind === "negocios" && !promotion) navigate("/inicio", { replace: true });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`administrar-${promotions ? "promociones" : kind}`}>
      <h1>Administrar {promotions ? "promociones" : kind}</h1>
      <p>Administra los registros que pertenecen a tu cuenta.</p>
      {!archived &&
        user.puede_registrar !== false &&
        (kind !== "negocios" || !mine.length) && (
          <Link
            to={
              kind === "negocios" ? "/registrar-negocio" : "/registrar-producto"
            }
          >
            Agregar {kind === "negocios" ? "negocio" : "producto"}
          </Link>
        )}
      {kind === "negocios" && mine.length > 0 && (
        <p>
          Tu cuenta puede tener un solo negocio. Aquí puedes actualizar su
          información.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {!items.length && <p>Aún no tienes registros.</p>}
      <div className="lista-negocios">
        {items.map((item) => (
          <article className="negocio-admin" key={item.id}>
            {editing?.id === item.id && !archived ? (
              <EntityForm
                kind={kind}
                initial={item}
                onSaved={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                {item.imagen && (
                  <img
                    className="imagen-negocio-admin"
                    src={item.imagen}
                    alt={item.nombre}
                  />
                )}
                <h2>{item.nombre}</h2>
                <p>{item.descripcion}</p>
                <p>
                  {kind === "negocios" ? item.direccion : `Bs. ${item.precio}`}
                </p>
                {kind === "productos" && (
                  <p>{item.promocion ? "En promoción" : "Sin promoción"}</p>
                )}
                {promotions ? (
                  <button
                    disabled={busy || archived}
                    onClick={() => mutate(item, true)}
                  >
                    {item.promocion ? "Desactivar" : "Activar"} promoción
                  </button>
                ) : (
                  <div className="action-row">
                    <button
                      disabled={busy || archived}
                      onClick={async () => {
                        if (
                          await confirm(
                            `Vas a editar “${item.nombre}”.`,
                            "edit",
                          )
                        )
                          setEditing(item);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      disabled={busy || archived}
                      onClick={() => mutate(item, false)}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
