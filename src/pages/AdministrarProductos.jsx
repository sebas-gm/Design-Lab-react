import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLab } from '../context';
import { api } from '../api';
import { useConfirm } from '../confirmation';
import EntityForm from '../components/EntityForm';
import FormModal from '../components/FormModal';
import ProductBoxIllustration from '../components/ProductBoxIllustration';
import '../styles/ownerProducts.css';

const normalize = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function ActionIcon({ name }) {
  const paths = { plus: 'M12 4v16M4 12h16', search: 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z', edit: 'm15 3 6 6-12 12H3v-6L15 3ZM12 6l6 6', delete: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7' };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}

export default function AdministrarProductos() {
  const { user, negocios, productos, loading, error: catalogError, refresh } = useLab();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('recent');
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const business = negocios.find(n => n.owner_id === user.id);
  const items = productos.filter(p => p.negocioId === business?.id);
  const readOnly = !business || business.estado === 'archivado' || Boolean(business.eliminacion_programada);
  const canCreate = !readOnly && user.puede_registrar !== false;
  const visible = items.filter(p => normalize(p.nombre).includes(normalize(search))).sort((a, b) => {
    if (order === 'name') return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) || a.id - b.id;
    if (order === 'price-low') return Number(a.precio) - Number(b.precio) || b.id - a.id;
    if (order === 'price-high') return Number(b.precio) - Number(a.precio) || b.id - a.id;
    return b.id - a.id;
  });
  function create() { setError(''); setNotice(''); setEditor({ initial: null }); }
  async function edit(item) {
    if (readOnly || busy) return;
    if (await confirm(`Vas a editar “${item.nombre}”.`, 'edit')) { setError(''); setNotice(''); setEditor({ initial: item }); }
  }
  async function remove(item) {
    if (readOnly || busy) return;
    if (!(await confirm(`Se eliminará “${item.nombre}” de tu negocio. Esta acción no se puede deshacer.`, 'delete'))) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api(`/productos/${item.id}`, { method: 'DELETE' });
      await refresh();
      setNotice('Producto eliminado correctamente.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const addButton = () => <button type="button" className="owner-products-add" disabled={busy} onClick={create}><ActionIcon name="plus"/>Agregar producto</button>;
  return <main className="owner-products-page">
    <header className="owner-products-hero"><svg className="owner-products-waves" viewBox="0 0 1200 150" preserveAspectRatio="none" aria-hidden="true"><path d="M0 145c170-25 310 20 500-55s250 100 440-15 220-25 260-30v105H0Z" fill="#e8d6fb"/><path d="M0 149c220-10 310 25 520-28s230 80 420-10 230-35 260-20v59H0Z" fill="#d9baf4" fillOpacity=".65"/></svg><div><span>Mi negocio › Productos</span><h1>Administrar productos</h1><p>Gestiona, edita y muestra los productos de tu negocio en Navishop.</p></div><ProductBoxIllustration/></header>

    {!loading && !catalogError && business && <div className="owner-products-toolbar">{canCreate && addButton()}{items.length > 0 && <div className="owner-products-filters"><label className="owner-products-search"><ActionIcon name="search"/><input autoComplete="off" type="search" aria-label="Buscar en mis productos" placeholder="Buscar en mis productos…" value={search} onChange={e => setSearch(e.target.value)}/></label><label className="owner-products-sort"><span>Ordenar por</span><select aria-label="Ordenar mis productos" value={order} onChange={e => setOrder(e.target.value)}><option value="recent">Más recientes</option><option value="name">Nombre A–Z</option><option value="price-low">Precio: menor a mayor</option><option value="price-high">Precio: mayor a menor</option></select></label></div>}</div>}
    {readOnly && business && <div className="owner-products-readonly" role="status">{business.eliminacion_programada ? 'Tu negocio tiene una eliminación pendiente. Restáuralo para modificar sus productos.' : 'Tu negocio está archivado. Puedes consultar los productos, pero no modificarlos.'}<Link to="/estado-negocio">Estado y solicitudes →</Link></div>}
    {error && <p className="owner-products-feedback" role="alert">{error}</p>}
    {notice && <p className="owner-products-feedback is-success" role="status">{notice}</p>}

    {loading ? <section className="owner-products-state" role="status"><span className="owner-products-spinner"/>Cargando tus productos…</section> : catalogError ? <section className="owner-products-state"><h2>No pudimos cargar tus productos</h2><p role="alert">{catalogError}</p><button type="button" onClick={refresh}>Reintentar</button></section> : !business ? <section className="owner-products-state"><ProductBoxIllustration/><h2>Primero necesitas registrar tu negocio</h2><p>Los productos que administres estarán vinculados a tu negocio.</p><Link to="/registrar-negocio">Registrar mi negocio →</Link></section> : items.length === 0 ? <section className="owner-products-state owner-products-empty"><ProductBoxIllustration/><h2>Aún no tienes productos registrados</h2><p>Agrega tu primer producto y comienza a mostrarlo en Navishop</p>{canCreate && addButton()}</section> : <section aria-label="Productos de mi negocio"><p className="owner-products-results" role="status">{visible.length} de {items.length} {items.length === 1 ? 'producto' : 'productos'}</p>{visible.length ? <div className="owner-products-grid">{visible.map(item => <article className="owner-product-card" key={item.id}><div className="owner-product-photo"><img src={item.imagen || '/icon-navishop.png'} alt={item.nombre} loading="lazy" onError={e => { if (!e.currentTarget.src.endsWith('/icon-navishop.png')) e.currentTarget.src = '/icon-navishop.png'; }}/>{item.promocion && <span className="owner-product-promo">Promoción</span>}</div><div className="owner-product-body"><h2>{item.nombre}</h2>{item.descripcion && <p>{item.descripcion}</p>}<strong>Bs. {item.precio}</strong><div className="owner-product-actions"><button type="button" disabled={busy || readOnly} onClick={() => edit(item)}><ActionIcon name="edit"/>Editar</button><button type="button" className="owner-product-delete" disabled={busy || readOnly} onClick={() => remove(item)}><ActionIcon name="delete"/>Eliminar</button></div></div></article>)}</div> : <div className="owner-products-state owner-products-no-match"><ActionIcon name="search"/><h2>No encontramos productos con ese nombre</h2><p>Prueba otra búsqueda o vuelve a consultar tu catálogo completo.</p><button type="button" onClick={() => setSearch('')}>Ver todos mis productos</button></div>}</section>}

    {editor && !readOnly && <FormModal title={editor.initial ? 'Editar producto' : 'Agregar producto'} onClose={() => setEditor(null)}>{close => <EntityForm kind="productos" initial={editor.initial} onCancel={close} onSaved={() => { setEditor(null); setNotice(editor.initial ? 'Producto actualizado correctamente.' : 'Producto registrado correctamente.'); }}/>}</FormModal>}
  </main>;
}
