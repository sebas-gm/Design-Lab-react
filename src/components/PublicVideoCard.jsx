import { useState } from 'react';
import { Link } from 'react-router-dom';
import HomeIcon from './HomeIcon';
import VideoPlatformIcon from './VideoPlatformIcon';

export default function PublicVideoCard({ video, nombreNegocio, categoria, onPlay, children }) {
  const [failed, setFailed] = useState(false);
  const youtubeId = video.plataforma === 'YouTube' && /^https:\/\/www\.youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})$/.exec(video.embed_url || '')?.[1];
  const thumbnail = video.thumbnail_url?.startsWith('https://') ? video.thumbnail_url : youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : null;
  return <article className="public-video-card">
    <button type="button" className={`public-video-preview${thumbnail && !failed ? ' has-thumbnail' : ''}`} aria-label={`Ver video: ${video.titulo}`} onClick={onPlay}>
      {thumbnail && !failed ? <img src={thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : <span className="public-video-placeholder"><VideoPlatformIcon platform={video.plataforma}/><span>Descubre este video en {video.plataforma}</span></span>}
      <span className="public-video-play"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m9 5 11 7-11 7V5Z"/></svg></span>
      <span className="public-video-platform"><VideoPlatformIcon platform={video.plataforma}/>{video.plataforma}</span>
    </button>
    <div className="public-video-body">{categoria && <span className="public-video-category">{categoria}</span>}<h3 title={video.titulo}>{video.titulo}</h3>{video.descripcion && <p>{video.descripcion}</p>}<Link className="public-video-business" to={`/negocios/${video.negocioId}`}><HomeIcon name="shop"/><span>{nombreNegocio || 'Ver negocio'}</span></Link>{children || <div className="public-video-actions"><button type="button" onClick={onPlay}>Reproducir <span aria-hidden="true">▷</span></button><a href={video.url} target="_blank" rel="noreferrer">Ver en {video.plataforma} ↗</a></div>}</div>
  </article>;
}
