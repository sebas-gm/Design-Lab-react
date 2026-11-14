import { useState } from "react";
import { Link } from "react-router-dom";

export default function VideoCard({ video, nombreNegocio, children }) {
  const [playing, setPlaying] = useState(false);
  return (
    <article className="video-card">
      <div
        className={`video-player ${video.plataforma === "TikTok" ? "vertical" : ""}`}
      >
        {playing ? (
          <iframe
            title={video.titulo}
            src={video.embed_url}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button className="video-cover" onClick={() => setPlaying(true)}>
            <span className="play-circle">▶</span>
            <strong>Ver video</strong>
            <small>{video.plataforma}</small>
          </button>
        )}
      </div>
      <div className="video-info">
        <span className="platform-badge">{video.plataforma}</span>
        <h2>{video.titulo}</h2>
        <Link to={`/negocios/${video.negocioId}`}>
          {nombreNegocio || "Ver negocio"}
        </Link>
        <a
          className="video-original"
          href={video.url}
          target="_blank"
          rel="noreferrer"
        >
          Abrir en {video.plataforma} ↗
        </a>
        {playing && (
          <small>
            Si el video no está disponible, ábrelo en su plataforma.
          </small>
        )}
        {children}
      </div>
    </article>
  );
}
