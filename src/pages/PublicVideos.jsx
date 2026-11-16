import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useLab } from '../context';
import VideoCard from '../components/VideoCard';
import HomeIcon from '../components/HomeIcon';
import CatalogShopIllustration from '../components/CatalogShopIllustration';
import VideoPlatformIcon from '../components/VideoPlatformIcon';
import PublicVideoPlayer from '../components/PublicVideoPlayer';
import '../styles/publicVideos.css';

function VideoResults({ query, negocios, reset, filtered }) {
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    // Debounce typing; changing any filter unmounts the previous player immediately.
    const timer = setTimeout(() => {
      api(`/videos?${query}`, { signal: controller.signal }).then(items => {
        if (active) { setVideos(items); setMore(items.length === 12); setError(''); }
      }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [query, retry]);
  async function loadMore() {
    setBusy(true); setError('');
    try {
      const items = await api(`/videos?${query}&offset=${videos.length}`);
      setVideos(previous => [...previous, ...items]); setMore(items.length === 12);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="public-video-results" aria-labelledby="public-videos-title">
    <div className="public-videos-section-heading"><span><HomeIcon name="video"/></span><div><h2 id="public-videos-title">Videos disponibles</h2><p>Explora las historias y novedades de los negocios de Navishop.</p></div>{!loading && <small role="status">{videos.length} {videos.length === 1 ? 'video' : 'videos'}{more ? ' cargados' : ' encontrados'}</small>}</div>
    {loading && <div className="public-videos-loading" role="status">Buscando videos…</div>}
    {error && <div className="public-videos-error"><p role="alert">{error}</p><button type="button" disabled={busy} onClick={videos.length ? loadMore : () => { setLoading(true); setRetry(value => value + 1); }}>Reintentar</button></div>}
    {!loading && !error && !videos.length && <div className="public-videos-empty"><HomeIcon name="video"/><h3>{filtered ? 'No encontramos videos con esos filtros' : 'Pronto habrá nuevas historias'}</h3><p>{filtered ? 'Prueba otro título, negocio o plataforma para seguir descubriendo.' : 'Los videos aparecerán aquí cuando los negocios los compartan.'}</p>{filtered && <button type="button" onClick={reset}>Limpiar filtros</button>}</div>}
    <div className="public-videos-grid">{videos.map(video => {
      const business = negocios.find(n => n.id === video.negocioId);
      return <VideoCard key={`${video.id}:${video.embed_url}`} variant="public" video={video} nombreNegocio={business?.nombre} categoria={business?.categoria} onPlay={() => setSelected(video)}/>;
    })}</div>
    {more && <div className="public-videos-more"><button type="button" disabled={busy} onClick={loadMore}>{busy ? 'Cargando…' : 'Ver más videos'}</button></div>}
    {selected && <PublicVideoPlayer key={`${selected.id}:${selected.embed_url}`} video={selected} onClose={() => setSelected(null)}/>}
  </section>;
}

export default function PublicVideos() {
  const { negocios, user } = useLab();
  const [params, setParams] = useSearchParams();
  const business = params.get('negocio') || '';
  const search = params.get('q') || '';
  const platform = ['TikTok', 'YouTube'].includes(params.get('plataforma')) ? params.get('plataforma') : '';
  const available = negocios.filter(n => n.estado === 'activo');
  const canPublish = user?.tipo_cuenta === 'negocios' && negocios.some(n => n.owner_id === user.id && n.estado !== 'archivado' && !n.eliminacion_programada);
  function update(name, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value); else next.delete(name);
    setParams(next, { replace: true });
  }
  const query = new URLSearchParams();
  if (business) query.set('negocio_id', business);
  if (search.trim()) query.set('q', search.trim());
  if (platform) query.set('plataforma', platform);
  const reset = () => setParams({}, { replace: true });
  return <main className="public-videos-page">
    <header className="public-videos-hero"><svg className="public-videos-waves" viewBox="0 0 1200 150" preserveAspectRatio="none" aria-hidden="true"><path d="M0 130c210-60 300 60 520-30s220 90 420-5 220-35 260-45v100H0Z" fill="#e4cff9"/><path d="M0 150c240-20 310 25 530-30s220 60 410-5 210-20 260-20v55H0Z" fill="#d6b6f2" fillOpacity=".6"/></svg><div className="public-videos-hero-copy"><span>Navishop · Videos</span><h1>Conoce los negocios <em>en video</em></h1><p>Mira sus productos, promociones y experiencias. Descubre lo que hace especial a tu comunidad.</p></div><div className="public-videos-art" aria-hidden="true"><span className="public-videos-clap"><HomeIcon name="video"/></span><CatalogShopIllustration/></div></header>
    <section className="public-videos-toolbar" aria-label="Buscar y filtrar videos"><label className="public-videos-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input autoComplete="off" type="search" aria-label="Buscar videos por título o negocio" placeholder="Busca un título o negocio…" value={search} maxLength={160} onChange={event => update('q', event.target.value)}/></label><label className="public-videos-business-filter">Filtrar por negocio<select value={business} onChange={event => update('negocio', event.target.value)}><option value="">Todos los negocios</option>{available.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}</select></label>{canPublish && <Link className="public-videos-share" to="/administrar-videos"><HomeIcon name="video"/>Compartir un video</Link>}</section>
    <div className="public-videos-platforms" role="group" aria-label="Filtrar por plataforma">{['', 'TikTok', 'YouTube'].map(value => <button type="button" key={value} className={platform === value ? 'active' : ''} aria-pressed={platform === value} onClick={() => update('plataforma', value)}>{value ? <VideoPlatformIcon platform={value}/> : <HomeIcon name="grid"/>}{value || 'Todos'}</button>)}{(search || business || platform) && <button type="button" className="public-videos-clear" onClick={reset}>Limpiar filtros</button>}</div>
    <VideoResults key={query.toString()} query={query.toString()} negocios={negocios} reset={reset} filtered={Boolean(search || business || platform)}/>
  </main>;
}
