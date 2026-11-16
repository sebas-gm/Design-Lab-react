import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLab } from '../context';
import CardNegocio from '../components/CardNegocio';
import CardProducto from '../components/CardProducto';
import Buscador from '../components/Buscador';
import HomeIcon from '../components/HomeIcon';
import CatalogShopIllustration from '../components/CatalogShopIllustration';
import { orderBusinesses, businessOpening } from '../catalogOrder';
import { useCatalogTime } from '../useCatalogTime';
import '../styles/negocios.css';

const normalize = (value) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function Negocios() {
  const time = useCatalogTime();
  const [order, setOrder] = useState('open');
  const [promotionsOnly, setPromotionsOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [categoria, setCategoria] = useState('Todas');
  const [searchParams, setSearchParams] = useSearchParams();
  const busqueda = searchParams.get('q') || '';
  const setBusqueda = (value) => setSearchParams(value ? { q: value } : {}, { replace: true });
  const { negocios, productos, loading, error, refresh } = useLab();
  const query = normalize(busqueda);
  const active = orderBusinesses(negocios, order, time);
  const categories = [...new Set(active.map(n => n.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const filtered = active.filter(n => {
    const matchesSearch = normalize(`${n.nombre} ${n.categoria} ${n.descripcion || ''} ${n.direccion || ''}`).includes(query) || productos.some(p => p.negocioId === n.id && normalize(p.nombre).includes(query));
    return matchesSearch && (categoria === 'Todas' || n.categoria === categoria) && (!openOnly || businessOpening(n, time) === 'open') && (!promotionsOnly || productos.some(p => p.negocioId === n.id && p.promocion));
  });
  const byId = new Map(filtered.map(n => [n.id, n]));
  const catalog = productos.filter(p => byId.has(p.negocioId) && normalize(`${p.nombre} ${p.descripcion || ''}`).includes(query));
  const filtering = Boolean(busqueda) || categoria !== 'Todas' || openOnly || promotionsOnly;
  function reset() { setBusqueda(''); setCategoria('Todas'); setOpenOnly(false); setPromotionsOnly(false); setOrder('open'); }

  return <main className="pagina-negocios">
    <header className="catalog-header">
      <svg className="catalog-header-waves" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true"><path d="M0 150c200-10 340 20 530-55s240 80 390-10 240-85 280-75v150H0Z" fill="#e5d1fa"/><path d="M0 158c240-50 360 40 560-30s210 60 370-10 210-70 270-20v62H0Z" fill="#d6b8f3" fillOpacity=".65"/></svg>
      <div className="catalog-header-copy"><span className="catalog-title-icon"><HomeIcon name="shop"/></span><div><span className="catalog-eyebrow">Explora la comunidad</span><h1>Todos los negocios</h1><p>Descubre emprendimientos, productos y servicios cerca de ti.</p></div></div>
      <CatalogShopIllustration/>
    </header>

    <section className="catalog-controls" aria-label="Buscar y filtrar negocios">
      <Buscador busqueda={busqueda} setBusqueda={setBusqueda}/>
      <label className="catalog-select-label">Categoría<select aria-label="Filtrar por categoría" value={categoria} onChange={e => setCategoria(e.target.value)}><option value="Todas">Todas las categorías</option>{categories.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
      <label className="catalog-select-label catalog-sort-label">Ordenar por<select value={order} onChange={e => setOrder(e.target.value)}><option value="open">Abiertos primero · rotación diaria</option><option value="name">Nombre A–Z</option><option value="recent">Más recientes</option></select></label>
      <label className="catalog-checkbox"><input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.target.checked)}/>Solo abiertos ahora</label>
      <label className="catalog-checkbox"><input type="checkbox" checked={promotionsOnly} onChange={e => setPromotionsOnly(e.target.checked)}/>Con promociones</label>
    </section>

    {error ? <div className="catalog-load-state"><p role="alert">{error}</p><button onClick={refresh}>Reintentar</button></div> : loading ? <p className="catalog-load-state" role="status">Actualizando catálogo…</p> : <div className="catalog-results"><p role="status"><HomeIcon name="shop"/>{filtered.length} {filtered.length === 1 ? 'negocio encontrado' : 'negocios encontrados'}</p><span>Horarios de Bolivia{order === 'open' ? ' · Rotación diaria' : ''}</span>{filtering && <button type="button" onClick={reset}>Limpiar filtros</button>}</div>}

    <section aria-label="Negocios encontrados">
      {filtered.length > 0 ? <div className="catalog-business-grid">{filtered.map(n => <CardNegocio key={n.id} {...n} variant="catalog" opening={businessOpening(n, time)}/>)}</div> : !loading && !error && <div className="catalog-empty"><HomeIcon name="shop"/><h2>No se encontraron negocios</h2><p>{filtering ? 'Prueba otra búsqueda o combina menos filtros.' : 'Los negocios disponibles aparecerán aquí.'}</p>{filtering && <button type="button" onClick={reset}>Limpiar filtros</button>}</div>}
    </section>

    <section className="catalog-products-section" aria-labelledby="catalog-products-title">
      <div className="catalog-products-heading"><HomeIcon name="Tienda"/><div><h2 id="catalog-products-title">Catálogo de productos</h2><p>Explora los productos de los negocios que coinciden con tus filtros.</p></div><span>{catalog.length} {catalog.length === 1 ? 'producto' : 'productos'}</span></div>
      {catalog.length > 0 ? <div className="catalog-products-grid">{catalog.map(p => <CardProducto key={p.id} {...p} variant="catalog" nombreNegocio={byId.get(p.negocioId).nombre}/>)}</div> : !loading && !error && <div className="catalog-empty"><HomeIcon name="Tienda"/><h3>No hay productos para mostrar</h3><p>{filtering ? 'Cambia la búsqueda o los filtros para consultar otros productos.' : 'Aquí aparecerán los productos registrados por los negocios.'}</p></div>}
    </section>
  </main>;
}
