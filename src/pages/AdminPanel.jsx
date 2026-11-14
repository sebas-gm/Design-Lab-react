import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useConfirm } from "../confirmation";
import EntityForm from "../components/EntityForm";
import "../styles/admin.css";

function VideoEditor({ initial, businesses, onSaved, onCancel }) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    values.negocioId = Number(values.negocioId);
    if (
      !(await confirm(
        "Se guardará este enlace de video desde la administración.",
        "save",
      ))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(`/admin/videos${initial ? `/${initial.id}` : ""}`, {
        method: initial ? "PUT" : "POST",
        body: values,
      });
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="entity-form" onSubmit={save}>
      <label>
        Negocio
        <select
          name="negocioId"
          defaultValue={initial?.negocioId || ""}
          required
        >
          {!initial && <option value="">Selecciona un negocio</option>}
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Título
        <input
          name="titulo"
          defaultValue={initial?.titulo}
          maxLength="160"
          required
        />
      </label>
      <label>
        Enlace de YouTube o TikTok
        <input
          name="url"
          type="url"
          defaultValue={initial?.url}
          maxLength="2048"
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button disabled={busy}>Guardar video</button>
      <button type="button" disabled={busy} onClick={onCancel}>
        Cancelar
      </button>
    </form>
  );
}

const empty = {
  negocios: [],
  usuarios: [],
  productos: [],
  videos: [],
  historial: [],
};

export default function AdminPanel() {
  const section = useParams()["*"] || "";
  const confirm = useConfirm();
  const [data, setData] = useState(empty);
  const [editor, setEditor] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const names = ["negocios", "usuarios", "productos", "videos", "historial"];
    const results = await Promise.all(
      names.map((name) => api(`/admin/${name}`)),
    );
    setData(
      Object.fromEntries(names.map((name, index) => [name, results[index]])),
    );
    setError("");
  }, []);
  useEffect(() => {
    Promise.resolve()
      .then(load)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [load]);
  async function saved() {
    setEditor(null);
    await load();
    setNotice("Datos guardados. La acción quedó registrada en el historial.");
  }
  async function edit(kind, item) {
    if (
      await confirm(
        `Vas a editar “${item.nombre || item.titulo}” como administrador.`,
        "edit",
      )
    ) {
      setEditor({ kind, item });
      setNotice("");
    }
  }
  async function changeStatus(item, estado) {
    if (
      !(await confirm(
        `El negocio “${item.nombre}” pasará a estado ${estado}. Sus datos y contenidos se conservarán.`,
        "save",
      ))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(`/admin/negocios/${item.id}/estado`, {
        method: "PATCH",
        body: { estado },
      });
      await load();
      setNotice("Estado actualizado.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(kind, item) {
    if (
      !(await confirm(
        `Se eliminará definitivamente “${item.nombre || item.titulo}”. Esta acción no se puede deshacer.`,
        "delete",
      ))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(`/admin/${kind}/${item.id}`, { method: "DELETE" });
      await load();
      setNotice("Registro eliminado. La acción quedó en el historial.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function promotion(item) {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/productos/${item.id}/promocion`, {
        method: "PATCH",
        body: { promocion: !item.promocion },
      });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const matches = (item) =>
    `${item.nombre || item.titulo || ""} ${item.correo || ""}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase());
  const businessName = (id) =>
    data.negocios.find((b) => b.id === id)?.nombre || `Negocio ${id}`;
  const ownerName = (id) =>
    data.usuarios.find((u) => u.id === id)?.correo || `Cuenta ${id}`;
  const titles = {
    "": "Panel del sistema",
    negocios: "Todos los negocios",
    usuarios: "Usuarios",
    contenido: "Contenido",
    historial: "Historial de administración",
  };

  return (
    <main className="admin-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Navishop · Administración general</span>
          <h1>{titles[section] || titles[""]}</h1>
          <p>Gestiona la plataforma con permisos de administrador.</p>
        </div>
        <button
          disabled={busy || loading}
          onClick={() => load().catch((e) => setError(e.message))}
        >
          Actualizar
        </button>
      </div>
      <nav className="admin-tabs" aria-label="Secciones administrativas">
        {[
          ["", "Resumen"],
          ["negocios", "Negocios"],
          ["usuarios", "Usuarios"],
          ["contenido", "Contenido"],
          ["historial", "Historial"],
        ].map(([path, label]) => (
          <Link
            key={path}
            className={section === path ? "active" : ""}
            onClick={() => {
              setEditor(null);
              setQuery("");
            }}
            to={`/admin${path ? `/${path}` : ""}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {error && (
        <p className="profile-feedback" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {loading ? (
        <p role="status">Cargando administración…</p>
      ) : (
        <>
          {!section && (
            <>
              <div className="admin-stats">
                {[
                  ["Negocios", data.negocios.length],
                  [
                    "Activos",
                    data.negocios.filter((b) => b.estado === "activo").length,
                  ],
                  ["Usuarios", data.usuarios.length],
                  ["Productos", data.productos.length],
                  ["Videos", data.videos.length],
                ].map(([label, count]) => (
                  <article key={label}>
                    <strong>{count}</strong>
                    <span>{label}</span>
                  </article>
                ))}
              </div>
              <section className="migration-panel">
                <h2>Gestiona primero, conserva siempre</h2>
                <p>
                  Suspender o archivar un negocio lo oculta del catálogo para
                  otros usuarios y conserva su contenido. El borrado definitivo
                  exige archivarlo y retirar sus productos y videos primero.
                </p>
                <Link className="purple-link" to="/admin/negocios">
                  Administrar negocios ↗
                </Link>
              </section>
            </>
          )}
          {["negocios", "usuarios", "contenido"].includes(section) && (
            <label className="admin-search">
              Buscar
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, título o correo…"
              />
            </label>
          )}
          {section === "negocios" && (
            <button onClick={() => setEditor({ kind: "negocios", item: null })}>
              Agregar negocio
            </button>
          )}
          {section === "contenido" && (
            <div className="admin-actions">
              <button
                onClick={() => setEditor({ kind: "productos", item: null })}
              >
                Agregar producto
              </button>
              <button onClick={() => setEditor({ kind: "videos", item: null })}>
                Agregar video
              </button>
            </div>
          )}
          {editor && ["negocios", "contenido"].includes(section) && (
            <section
              className="admin-editor"
              key={`${editor.kind}-${editor.item?.id || "new"}`}
            >
              <h2>
                {editor.item ? "Editar" : "Agregar"}{" "}
                {editor.kind === "negocios"
                  ? "negocio"
                  : editor.kind === "productos"
                    ? "producto"
                    : "video"}
              </h2>
              {editor.kind === "videos" ? (
                <VideoEditor
                  initial={editor.item}
                  businesses={data.negocios}
                  onSaved={saved}
                  onCancel={() => setEditor(null)}
                />
              ) : (
                <EntityForm
                  adminMode
                  kind={editor.kind}
                  initial={editor.item}
                  owners={data.usuarios}
                  availableBusinesses={data.negocios}
                  onSaved={saved}
                  onCancel={() => setEditor(null)}
                />
              )}
            </section>
          )}
          {section === "negocios" && (
            <div className="admin-list">
              {data.negocios.filter(matches).map((b) => (
                <article key={b.id}>
                  <div>
                    <span className={`admin-status status-${b.estado}`}>
                      {b.estado}
                    </span>
                    <h2>{b.nombre}</h2>
                    <p>{b.direccion}</p>
                    <small>Propietario: {ownerName(b.owner_id)}</small>
                  </div>
                  <div className="admin-actions">
                    <button disabled={busy} onClick={() => edit("negocios", b)}>
                      Editar / asignar propietario
                    </button>
                    {b.estado !== "activo" && (
                      <button
                        disabled={busy}
                        onClick={() => changeStatus(b, "activo")}
                      >
                        Restaurar
                      </button>
                    )}
                    {b.estado === "activo" && (
                      <button
                        disabled={busy}
                        onClick={() => changeStatus(b, "suspendido")}
                      >
                        Suspender
                      </button>
                    )}
                    {b.estado !== "archivado" && (
                      <button
                        disabled={busy}
                        onClick={() => changeStatus(b, "archivado")}
                      >
                        Archivar
                      </button>
                    )}
                    <button
                      className="admin-delete"
                      disabled={busy || b.estado !== "archivado"}
                      onClick={() => remove("negocios", b)}
                    >
                      Borrado definitivo
                    </button>
                  </div>
                </article>
              ))}
              {!data.negocios.length && <p>No hay negocios registrados.</p>}
            </div>
          )}
          {section === "usuarios" && (
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Cuenta</th>
                    <th>Negocio</th>
                  </tr>
                </thead>
                <tbody>
                  {data.usuarios.filter(matches).map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.nombre}
                        {u.is_admin && (
                          <span className="platform-badge"> Administrador</span>
                        )}
                      </td>
                      <td>{u.correo}</td>
                      <td>{u.tipo_cuenta}</td>
                      <td>
                        {u.negocio_id
                          ? businessName(u.negocio_id)
                          : "Sin negocio"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {section === "contenido" && (
            <>
              <h2 className="admin-subtitle">Productos y promociones</h2>
              <div className="admin-list">
                {data.productos.filter(matches).map((p) => (
                  <article key={p.id}>
                    <div>
                      <h3>{p.nombre}</h3>
                      <p>
                        {businessName(p.negocioId)} · Bs. {p.precio}
                      </p>
                      <small>
                        {p.promocion ? "Promoción activa" : "Sin promoción"}
                      </small>
                    </div>
                    <div className="admin-actions">
                      <button
                        disabled={busy}
                        onClick={() => edit("productos", p)}
                      >
                        Editar
                      </button>
                      <button disabled={busy} onClick={() => promotion(p)}>
                        {p.promocion ? "Desactivar" : "Activar"} promoción
                      </button>
                      <button
                        className="admin-delete"
                        disabled={busy}
                        onClick={() => remove("productos", p)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <h2 className="admin-subtitle">Videos</h2>
              <div className="admin-list">
                {data.videos.filter(matches).map((v) => (
                  <article key={v.id}>
                    <div>
                      <h3>{v.titulo}</h3>
                      <p>
                        {businessName(v.negocioId)} · {v.plataforma}
                      </p>
                      <a href={v.url} target="_blank" rel="noreferrer">
                        Ver en su plataforma ↗
                      </a>
                    </div>
                    <div className="admin-actions">
                      <button disabled={busy} onClick={() => edit("videos", v)}>
                        Editar
                      </button>
                      <button
                        className="admin-delete"
                        disabled={busy}
                        onClick={() => remove("videos", v)}
                      >
                        Eliminar enlace
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {section === "historial" && (
            <>
              <p>
                Últimas 100 acciones administrativas. Las operaciones fallidas
                no se registran como realizadas.
              </p>
              <div className="admin-list">
                {data.historial.map((log) => (
                  <article key={log.id}>
                    <div>
                      <h3>
                        {log.accion.replaceAll("_", " ")} · {log.recurso} #
                        {log.recurso_id}
                      </h3>
                      <p>
                        {log.administrador} ·{" "}
                        {new Date(`${log.fecha}Z`).toLocaleString()}
                      </p>
                      <pre>{JSON.stringify(log.detalle, null, 2)}</pre>
                    </div>
                  </article>
                ))}
                {!data.historial.length && (
                  <p>Aún no hay acciones administrativas.</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
