import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLab } from '../context';
import { api } from '../api';
import HomeIcon from '../components/HomeIcon';
import DiscountTagIllustration from '../components/DiscountTagIllustration';
import EntityForm from '../components/EntityForm';
import FormModal from '../components/FormModal';
import '../styles/ownerProducts.css';
import '../styles/ownerPromotions.css';

const normalize = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function PromotionImage({ src, name }) {
  const [failed, setFailed] = useState(false);
  return <div className="owner-promo-photo">{src && !failed ? <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)}/> : <span className="owner-promo-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m12 2 9 5v10l-9 5-9-5V7l9-5ZM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5"/></svg><small>Sin imagen</small></span>}</div>;
}

export default function AdministrarPromociones() {
  const { user, negocios, productos, loading, error: catalogError, refresh } = useLab();
  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('recent');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const tabRefs = useRef([]);
  const business = negocios.find(n => n.owner_id === user.id);
  const items = productos.filter(p => p.negocioId === business?.id);
  const activeCount = items.filter(p => p.promocion).length;
  const readOnly = !business || business.estado === 'archivado' || Boolean(business.eliminacion_programada);
  const canCreate = !readOnly && user.puede_registrar !== false;
  const matchingTab = items.filter(p => Boolean(p.promocion) === (tab === 'active'));
  const visible = matchingTab.filter(p => normalize(p.nombre).includes(normalize(search))).sort((a, b) => {
    if (order === 'name') return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) || a.id - b.id;
    if (order === 'price-low') return Number(a.precio) - Number(b.precio) || b.id - a.id;
    if (order === 'price-high') return Number(b.precio) - Number(a.precio) || b.id - a.id;
    return b.id - a.id;
  });
  async function toggle(item) {
    if (readOnly || busyId !== null) return;
    setBusyId(item.id); setError(''); setNotice('');
    try {
      await api(`/productos/${item.id}/promocion`, { method: 'PATCH', body: { promocion: !item.promocion } });
      await refresh();
      setNotice(`Promoción ${item.promocion ? 'desactivada' : 'activada'} para “${item.nombre}”.`);
    } catch (e) { setError(e.message); } finally { setBusyId(null); }
  }
  function tabKey(event, index) {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = 1 - index;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 1;
    else return;
    event.preventDefault(); setTab(next === 0 ? 'active' : 'inactive'); tabRefs.current[next]?.focus();
  }
  return <main className="owner-products-page owner-promotions-page">
    <header className="owner-products-hero"><svg className="owner-products-waves" viewBox="0 0 1200 150" preserveAspectRatio="none" aria-hidden="true"><path d="M0 145c170-25 310 20 500-55s250 100 440-15 220-25 260-30v105H0Z" fill="#e8d6fb"/><path d="M0 149c220-10 310 25 520-28s230 80 420-10 230-35 260-20v59H0Z" fill="#d9baf4" fillOpacity=".65"/></svg><div><span>Mi negocio › Promociones</span><h1>Mis promociones</h1><p>Gestiona las promociones de tus productos y destaca lo que ofrece tu negocio.</p></div><DiscountTagIllustration/></header>

    {loading ? <section className="owner-products-state" role="status"><span className="owner-products-spinner"/>Cargando tus promociones…</section> : catalogError ? <section className="owner-products-state"><h2>No pudimos cargar tus promociones</h2><p role="alert">{catalogError}</p><button type="button" onClick={refresh}>Reintentar</button></section> : !business ? <section className="owner-products-state"><DiscountTagIllustration/><h2>Primero necesitas registrar tu negocio</h2><p>Las promociones se administran sobre los productos de tu negocio.</p><Link to="/registrar-negocio">Registrar mi negocio →</Link></section> : <>
      <div className="owner-promotion-tabs" role="tablist" aria-label="Estado de promoción">{[['active', 'Promociones activas', activeCount], ['inactive', 'Sin promoción', items.length - activeCount]].map(([value, label, count], index) => <button type="button" key={value} id={`owner-promo-tab-${value}`} role="tab" aria-selected={tab === value} aria-controls="owner-promo-panel" tabIndex={tab === value ? 0 : -1} ref={node => { tabRefs.current[index] = node; }} onClick={() => setTab(value)} onKeyDown={event => tabKey(event, index)}><HomeIcon name={value === 'active' ? 'tag' : 'shop'}/>{label} ({count})</button>)}</div>
      {readOnly && <div className="owner-products-readonly" role="status">{business.eliminacion_programada ? 'Tu negocio tiene una eliminación pendiente. Restáuralo antes de modificar sus promociones.' : 'Tu negocio está archivado. Sus promociones son de solo lectura.'}<Link to="/estado-negocio">Estado y solicitudes →</Link></div>}
      {error && <p className="owner-products-feedback" role="alert">{error}</p>}{notice && <p className="owner-products-feedback is-success" role="status">{notice}</p>}
      {items.length > 0 && <div className="owner-promotion-toolbar"><label className="owner-products-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input autoComplete="off" type="search" aria-label="Buscar en mis promociones" placeholder="Buscar producto…" value={search} onChange={event => setSearch(event.target.value)}/></label><label className="owner-products-sort"><span>Ordenar por</span><select aria-label="Ordenar mis promociones" value={order} onChange={event => setOrder(event.target.value)}><option value="recent">Más recientes</option><option value="name">Nombre A–Z</option><option value="price-low">Precio: menor a mayor</option><option value="price-high">Precio: mayor a menor</option></select></label></div>}
      <section id="owner-promo-panel" role="tabpanel" aria-labelledby={`owner-promo-tab-${tab}`} tabIndex={0}>
        {items.length === 0 ? <div className="owner-products-state"><DiscountTagIllustration/><h2>Aún no tienes productos para promocionar</h2><p>Agrega tu primer producto y luego activa su promoción desde aquí.</p>{canCreate && <button type="button" className="owner-products-add" onClick={() => setCreating(true)}>+ Agregar producto</button>}</div> : visible.length > 0 ? <div className="owner-promotion-grid">{visible.map(item => <article className="owner-promotion-card" key={item.id}><div className="owner-promotion-card-main"><PromotionImage key={`${item.id}:${item.imagen}`} src={item.imagen} name={item.nombre}/><div className="owner-promotion-copy"><h2>{item.nombre}</h2><strong>Bs. {item.precio}</strong>{item.descripcion && <p>{item.descripcion}</p>}<span className={`owner-promotion-state${item.promocion ? ' is-active' : ''}`}><HomeIcon name="tag"/>{item.promocion ? 'Promoción activa' : 'Sin promoción'}</span></div></div><button type="button" className={`owner-promotion-toggle${item.promocion ? ' is-deactivate' : ''}`} disabled={readOnly || busyId !== null} onClick={() => toggle(item)}><HomeIcon name="tag"/>{busyId === item.id ? 'Guardando…' : item.promocion ? 'Desactivar promoción' : 'Activar promoción'}</button></article>)}</div> : <div className="owner-products-state owner-promotion-empty-tab"><HomeIcon name="tag"/><h2>{normalize(search) ? 'No encontramos productos con esa búsqueda' : tab === 'active' ? 'Todavía no tienes promociones activas' : 'Todos tus productos están en promoción'}</h2><p>{normalize(search) ? 'Prueba otro nombre o cambia de pestaña para seguir buscando.' : tab === 'active' ? 'Elige un producto de la pestaña Sin promoción para destacarlo.' : 'Puedes consultar y desactivar promociones desde Promociones activas.'}</p>{normalize(search) ? <button type="button" onClick={() => setSearch('')}>Limpiar búsqueda</button> : <button type="button" onClick={() => setTab(tab === 'active' ? 'inactive' : 'active')}>{tab === 'active' ? 'Ver productos sin promoción' : 'Ver promociones activas'}</button>}</div>}
      </section>
      {items.length > 0 && canCreate && <div className="owner-promotion-create"><button type="button" onClick={() => setCreating(true)}>+ Agregar producto</button><Link to="/administrar-productos">Administrar mis productos →</Link></div>}
    </>}
    {creating && !readOnly && <FormModal title="Agregar producto" onClose={() => setCreating(false)}>{close => <EntityForm kind="productos" onCancel={close} onSaved={() => { setCreating(false); setNotice('Producto registrado. Puedes encontrarlo en su pestaña de promoción.'); }}/>}</FormModal>}
  </main>;
}
