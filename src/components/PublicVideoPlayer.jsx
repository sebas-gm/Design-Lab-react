import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import VideoPlatformIcon from './VideoPlatformIcon';

export default function PublicVideoPlayer({ video, onClose }) {
  const dialog = useRef(null);
  const frame = useRef(null);
  const [failed, setFailed] = useState(!video.embed_url);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const element = dialog.current;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => { element.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => {
    if (failed || loaded) return;
    const timer = setTimeout(() => setFailed(true), 15000);
    return () => clearTimeout(timer);
  }, [failed, loaded]);
  useEffect(() => {
    // Only trust errors sent by this exact TikTok iframe, never other windows.
    function message(event) {
      if (video.plataforma !== 'TikTok' || event.origin !== 'https://www.tiktok.com' || event.source !== frame.current?.contentWindow) return;
      if (event.data?.['x-tiktok-player'] === true && event.data.type === 'onPlayerError' && event.data.value?.errorCode !== 3002) setFailed(true);
    }
    window.addEventListener('message', message);
    return () => window.removeEventListener('message', message);
  }, [video.plataforma]);
  return createPortal(<dialog ref={dialog} className="public-video-dialog" aria-label={video.titulo} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="public-video-dialog-panel"><header><div><span>{video.plataforma}</span><h2>{video.titulo}</h2></div><button type="button" onClick={onClose} autoFocus aria-label="Cerrar video">×</button></header>
      {failed ? <div className="public-video-unavailable" role="status"><VideoPlatformIcon platform={video.plataforma}/><h3>Continúa en {video.plataforma}</h3><p>La vista incrustada no está disponible. Puedes abrir el video original en su plataforma.</p><a href={video.url} target="_blank" rel="noreferrer" onClick={onClose}>Ver en {video.plataforma} ↗</a></div> : <div className={`public-video-frame${video.plataforma === 'TikTok' ? ' is-vertical' : ''}`}><iframe ref={frame} src={video.embed_url} title={video.titulo} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setLoaded(true)} onError={() => setFailed(true)}/></div>}
      <div className="public-video-dialog-help">{!failed && <><p>¿El video no se muestra o tiene restricciones?</p><button type="button" onClick={() => setFailed(true)}>Mostrar alternativa</button></>}<a href={video.url} target="_blank" rel="noreferrer" onClick={onClose}>Ver en {video.plataforma} ↗</a></div>
    </div>
  </dialog>, document.body);
}
