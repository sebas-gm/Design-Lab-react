import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useLab } from "../context";
import VideoCard from "../components/VideoCard";
import "../styles/videos.css";

export default function Videos({ manage = false }) {
  const { negocios, user } = useLab();
  const mine = negocios.filter((n) => n.owner_id === user?.id);
  const [videos, setVideos] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const business = searchParams.get("negocio") || "";
  const setBusiness = (value) =>
    setSearchParams(value ? { negocio: value } : {});

  useEffect(() => {
    let active = true;
    const path = manage
      ? "/mis-videos"
      : `/videos${business ? `?negocio_id=${business}` : ""}`;
    api(path)
      .then((items) => {
        if (active) {
          setVideos(items);
          setMore(!manage && items.length === 12);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [manage, business]);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    values.negocioId = Number(values.negocioId);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const item = await api(`/videos${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PUT" : "POST",
        body: values,
      });
      setVideos((previous) =>
        editing
          ? previous.map((v) => (v.id === item.id ? item : v))
          : [item, ...previous],
      );
      setEditing(null);
      form.reset();
      setNotice("Video guardado. Ya aparece en la pestaña Videos.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(video) {
    if (
      !window.confirm(
        `¿Quitar “${video.titulo}” de Design Lab? El video original seguirá en su plataforma.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(`/videos/${video.id}`, { method: "DELETE" });
      setVideos((previous) => previous.filter((v) => v.id !== video.id));
      if (editing?.id === video.id) setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function loadMore() {
    setBusy(true);
    setError("");
    try {
      const items = await api(
        `/videos?offset=${videos.length}${business ? `&negocio_id=${business}` : ""}`,
      );
      setVideos((previous) => [...previous, ...items]);
      setMore(items.length === 12);
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
          <span className="eyebrow">Design Lab · En movimiento</span>
          <h1>{manage ? "Mis videos" : "Conoce los negocios en video"}</h1>
          <p>
            {manage
              ? "Comparte lo que hace especial a tu negocio."
              : "Un vistazo a sus productos, su gente y sus historias."}
          </p>
        </div>
        <Link
          className="purple-link"
          to={manage ? "/videos" : user ? "/administrar-videos" : "/login"}
        >
          {manage ? "Explorar videos" : "Compartir un video"} ↗
        </Link>
      </div>
      {manage ? (
        mine.length ? (
          <form
            key={editing?.id || "new"}
            className="video-form entity-form"
            onSubmit={submit}
          >
            <h2>{editing ? "Editar video" : "Publicar un video"}</h2>
            <label>
              Negocio
              <select
                name="negocioId"
                defaultValue={editing?.negocioId || ""}
                required
              >
                <option value="">Selecciona tu negocio</option>
                {mine.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Título
              <input
                name="titulo"
                maxLength="160"
                defaultValue={editing?.titulo}
                placeholder="Ej: Así preparamos tu café favorito"
                required
              />
            </label>
            <label>
              Enlace del video
              <input
                name="url"
                type="url"
                maxLength="2048"
                defaultValue={editing?.url}
                placeholder="https://www.youtube.com/watch?v=…"
                required
              />
            </label>
            <small>
              YouTube, Shorts o TikTok. Para TikTok copia el enlace completo del
              video abierto, no el enlace corto. Solo guardamos el enlace; el
              video permanece en su plataforma.
            </small>
            <div>
              <button disabled={busy}>
                {busy
                  ? "Guardando…"
                  : editing
                    ? "Guardar cambios"
                    : "Publicar video"}
              </button>
              {editing && (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="empty-state">
            <h2>Tu negocio tiene una historia</h2>
            <p>Registra primero tu negocio para compartir sus videos.</p>
            <Link to="/registrar-negocio">Registrar negocio ↗</Link>
          </div>
        )
      ) : (
        <label className="video-filter">
          Filtrar por negocio
          <select
            value={business}
            onChange={(e) => {
              setBusiness(e.target.value);
              setLoading(true);
              setVideos([]);
            }}
          >
            <option value="">Todos los negocios</option>
            {negocios.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nombre}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => window.location.reload()}>Reintentar</button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {loading ? (
        <p role="status">Cargando videos…</p>
      ) : (
        !videos.length &&
        !error && (
          <div className="empty-state">
            <span className="empty-play">▷</span>
            <h2>Aún no hay videos publicados</h2>
            <p>
              Los videos de los negocios aparecerán aquí cuando los compartan.
            </p>
          </div>
        )
      )}
      <div className="videos-grid">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            nombreNegocio={
              negocios.find((n) => n.id === video.negocioId)?.nombre
            }
          >
            {manage && (
              <div className="video-actions">
                <button
                  disabled={busy}
                  onClick={() => {
                    setEditing(video);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Editar
                </button>
                <button
                  disabled={busy}
                  className="secondary-button"
                  onClick={() => remove(video)}
                >
                  Quitar enlace
                </button>
              </div>
            )}
          </VideoCard>
        ))}
      </div>
      {!manage && more && (
        <button disabled={busy} onClick={loadMore}>
          {busy ? "Cargando…" : "Ver más videos"}
        </button>
      )}
    </main>
  );
}
