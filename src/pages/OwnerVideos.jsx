import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useLab } from '../context';
import { useConfirm } from '../confirmation';
import VideoCard from '../components/VideoCard';
import PublicVideoPlayer from '../components/PublicVideoPlayer';
import VideoClapIllustration from '../components/VideoClapIllustration';
import FormModal from '../components/FormModal';
import '../styles/ownerProducts.css';
import '../styles/publicVideos.css';
import '../styles/ownerVideos.css';

const normalize = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function VideoActionIcon({ remove = false }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={remove ? 'm3 3 18 18M10 5l2-2a5 5 0 0 1 7 7l-2 2M7 12l-2 2a5 5 0 0 0 7 7l2-2M9 15l6-6' : 'm15 3 6 6-12 12H3v-6L15 3ZM12 6l6 6'}/></svg>;
}

export default function OwnerVideos() {
  const { negocios, user, loading: catalogLoading, error: catalogError, refresh } = useLab();
  const confirm = useConfirm();
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editor, setEditor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('recent');
  const [retry, setRetry] = useState(0);
  const business = negocios.find(n => n.owner_id === user.id);
  const readOnly = !business || business.estado === 'archivado' || Boolean(business.eliminacion_programada);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api('/mis-videos', { signal: controller.signal }).then(items => { if (active) { setVideos(items); setLoadError(''); } }).catch(e => { if (active) setLoadError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [retry]);
  const items = videos.filter(v => v.negocioId === business?.id);
  const visible = items.filter(v => normalize(v.titulo).includes(normalize(search))).sort((a, b) => order === 'oldest' ? a.id - b.id : b.id - a.id);
  async function edit(video) {
    if (readOnly || busy) return;
    if (await confirm(`Vas a editar “${video.titulo}”.`, 'edit')) { setError(''); setNotice(''); setSelected(null); setEditor({ initial: video }); }
  }
  async function remove(video) {
    if (readOnly || busy) return;
    if (!(await confirm(`Se quitará “${video.titulo}” de Navishop. El video original seguirá en su plataforma.`, 'delete'))) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api(`/videos/${video.id}`, { method: 'DELETE' });
      setVideos(previous => previous.filter(v => v.id !== video.id));
      setSelected(null); setNotice('Enlace retirado de Navishop. El video original no fue eliminado.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault();
    if (readOnly || busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!(await confirm(editor.initial ? 'Se guardarán los cambios de este video.' : 'Se guardará el enlace de este video en Navishop.', 'save'))) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const item = await api(`/videos${editor.initial ? `/${editor.initial.id}` : ''}`, { method: editor.initial ? 'PUT' : 'POST', body: { ...values, negocioId: Number(values.negocioId) } });
      setVideos(previous => editor.initial ? previous.map(v => v.id === item.id ? item : v) : [item, ...previous]);
      setEditor(null); setNotice('Enlace de video guardado correctamente.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function create() { setSelected(null); setError(''); setNotice(''); setEditor({ initial: null }); }
  function addButton() { return <button type="button" className="owner-products-add" disabled={busy} onClick={create}><span aria-hidden="true">＋</span>Publicar un video</button>; }
  function reload() { setLoading(true); setRetry(value => value + 1); if (catalogError) refresh(); }
  return <main className="owner-products-page owner-videos-page">
    <header className="owner-products-hero"><svg className="owner-products-waves" viewBox="0 0 1200 150" preserveAspectRatio="none" aria-hidden="true"><path d="M0 145c170-25 310 20 500-55s250 100 440-15 220-25 260-30v105H0Z" fill="#e8d6fb"/><path d="M0 149c220-10 310 25 520-28s230 80 420-10 230-35 260-20v59H0Z" fill="#d9baf4" fillOpacity=".65"/></svg><div><span>Mi negocio › Videos</span><h1>Mis videos</h1><p>Gestiona los videos de tu negocio y comparte lo mejor de tus productos o servicios.</p></div><VideoClapIllustration/></header>
    {readOnly && business && <div className="owner-products-readonly" role="status">{business.eliminacion_programada ? 'Tu negocio tiene una eliminación pendiente. Restáuralo para modificar sus videos.' : 'Tu negocio está archivado. Puedes ver los videos, pero no modificar sus enlaces.'}<Link to="/estado-negocio">Estado y solicitudes →</Link></div>}
    {!loading && !catalogLoading && !loadError && !catalogError && business && <div className="owner-products-toolbar">{!readOnly && addButton()}{items.length > 0 && <div className="owner-products-filters"><label className="owner-products-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input autoComplete="off" type="search" aria-label="Buscar en mis videos" placeholder="Buscar video…" value={search} onChange={e => setSearch(e.target.value)}/></label><label className="owner-products-sort"><span>Ordenar por</span><select aria-label="Ordenar mis videos" title="Orden de registro de los enlaces en Navishop" value={order} onChange={e => setOrder(e.target.value)}><option value="recent">Más recientes</option><option value="oldest">Más antiguos</option></select></label></div>}</div>}
    {error && !editor && <p className="owner-products-feedback" role="alert">{error}</p>}{notice && <p className="owner-products-feedback is-success" role="status">{notice}</p>}
    {loading || catalogLoading ? <section className="owner-products-state" role="status"><span className="owner-products-spinner"/>Cargando tus videos…</section> : loadError || catalogError ? <section className="owner-products-state"><h2>No pudimos cargar tus videos</h2><p role="alert">{loadError || catalogError}</p><button type="button" onClick={reload}>Reintentar</button></section> : !business ? <section className="owner-products-state"><VideoClapIllustration/><h2>Tu negocio tiene una historia</h2><p>Registra primero tu negocio para compartir sus videos.</p><Link to="/registrar-negocio">Registrar mi negocio →</Link></section> : items.length === 0 ? <section className="owner-products-state"><VideoClapIllustration/><h2>Aún no tienes videos publicados</h2><p>Comparte un enlace de TikTok o YouTube y muestra lo que hace especial a tu negocio.</p>{!readOnly && addButton()}</section> : <section aria-label="Videos de mi negocio"><p className="owner-products-results" role="status">{visible.length} de {items.length} {items.length === 1 ? 'video' : 'videos'}</p>{visible.length > 0 ? <div className="owner-videos-grid">{visible.map(video => <VideoCard key={`${video.id}:${video.embed_url}`} variant="public" video={video} nombreNegocio={business.nombre} onPlay={() => setSelected(video)}><div className="owner-video-card-actions"><a href={video.url} target="_blank" rel="noreferrer">Abrir en {video.plataforma} ↗</a><div><button type="button" disabled={busy || readOnly} onClick={() => edit(video)}><VideoActionIcon/>Editar</button><button type="button" className="owner-video-remove" disabled={busy || readOnly} onClick={() => remove(video)}><VideoActionIcon remove/>Quitar enlace</button></div></div></VideoCard>)}</div> : <div className="owner-products-state"><h2>No encontramos videos con ese título</h2><p>Prueba otra búsqueda o consulta todos los videos de tu negocio.</p><button type="button" onClick={() => setSearch('')}>Ver todos mis videos</button></div>}</section>}
    {!loading && items.length > 0 && <Link className="owner-videos-explore" to="/videos">Explorar videos de Navishop →</Link>}
    {selected && <PublicVideoPlayer key={`${selected.id}:${selected.embed_url}`} video={selected} onClose={() => setSelected(null)}/>}
    {editor && !readOnly && <FormModal title={editor.initial ? 'Editar video' : 'Publicar un video'} onClose={() => { setEditor(null); setError(''); }}>{close => <form autoComplete="off" className="entity-form" onSubmit={submit}><fieldset disabled={busy} className="owner-video-form-fields"><label>Negocio<select name="negocioId" defaultValue={editor.initial?.negocioId || business.id} required><option value={business.id}>{business.nombre}</option></select></label><label>Título<input name="titulo" maxLength={160} defaultValue={editor.initial?.titulo} placeholder="Ej: Así preparamos tu café favorito" required/></label><label>Enlace del video<input name="url" type="url" maxLength={2048} defaultValue={editor.initial?.url} placeholder="https://www.youtube.com/watch?v=…" required/></label><small>YouTube, Shorts o TikTok. Usa el enlace completo del video. Solo guardamos el enlace; el video permanece en su plataforma.</small>{error && <p role="alert">{error}</p>}<div className="action-row"><button>{busy ? 'Guardando…' : editor.initial ? 'Guardar cambios' : 'Publicar video'}</button><button type="button" className="secondary-button" disabled={busy} onClick={close}>Cancelar</button></div></fieldset></form>}</FormModal>}
  </main>;
}
