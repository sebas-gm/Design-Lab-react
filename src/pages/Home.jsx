import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLab } from '../context';
import CardNegocio from '../components/CardNegocio';
import CardProducto from '../components/CardProducto';
import Buscador from '../components/Buscador';
import Hero from '../components/Hero';
import HomeIcon from '../components/HomeIcon';
import { orderBusinesses, businessOpening } from '../catalogOrder';
import { useCatalogTime } from '../useCatalogTime';
import '../styles/promociones.css';
import '../styles/home.css';

const normalize = (value) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function Home() {
  const time = useCatalogTime();
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const { negocios, productos, loading, error, refresh } = useLab();
  const activeBusinesses = orderBusinesses(negocios, 'open', time);
  const categories = [...new Set(activeBusinesses.map(n => n.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const query = normalize(busqueda);
  const matchesBusiness = (n) => normalize(`${n.nombre} ${n.categoria} ${n.descripcion || ''} ${n.direccion || ''}`).includes(query);
  const matchesCategory = (n) => categoria === 'Todas' || n.categoria === categoria;
  const filtered = activeBusinesses.filter(n => matchesCategory(n) && (matchesBusiness(n) || productos.some(p => p.negocioId === n.id && normalize(`${p.nombre} ${p.descripcion || ''}`).includes(query))));
  const byId = new Map(activeBusinesses.map(n => [n.id, n]));
  const promotions = productos.filter(p => {
    const business = byId.get(p.negocioId);
    return p.promocion === true && business && matchesCategory(business) && (matchesBusiness(business) || normalize(`${p.nombre} ${p.descripcion || ''}`).includes(query));
  }).sort((a, b) => b.id - a.id);
  const reset = () => { setBusqueda(''); setCategoria('Todas'); };
  const filtering = Boolean(query) || categoria !== 'Todas';

  return <main className="home">
    <Hero />
    <section className="home-shortcuts" aria-label="Descubre Navishop">
      {[
        ['shop', 'Negocios locales', 'Descubre emprendimientos de tu comunidad.', '/negocios'],
        ['tag', 'Promociones', 'Encuentra productos en promoción.', '/promociones'],
        ['video', 'Videos', 'Conoce los productos y novedades.', '/videos'],
      ].map(([icon, title, text, href]) => <Link key={href} to={href}><span className="home-shortcut-icon"><HomeIcon name={icon}/></span><span><strong>{title}</strong><small>{text}</small></span><span className="home-shortcut-arrow" aria-hidden="true">↗</span></Link>)}
    </section>

    <section className="home-discovery" aria-label="Buscar y filtrar el catálogo">
      <h2>Explora por categoría</h2>
      <div className="home-category-pills" role="group" aria-label="Filtrar por categoría">
        {['Todas', ...categories].map(name => <button key={name} type="button" className={categoria === name ? 'active' : ''} aria-pressed={categoria === name} onClick={() => setCategoria(name)}><HomeIcon name={name === 'Todas' ? 'grid' : name}/>{name}</button>)}
      </div>
      <Buscador busqueda={busqueda} setBusqueda={setBusqueda}/>
    </section>

    {error ? <div className="home-load-state"><p role="alert">{error}</p><button type="button" onClick={refresh}>Reintentar</button></div> : loading ? <p className="home-load-state" role="status">Actualizando catálogo…</p> : null}

    <section className="home-featured" aria-labelledby="home-businesses-title">
      <div className="home-section-heading"><div className="home-section-title"><HomeIcon name="shop"/><div><h2 id="home-businesses-title">Negocios destacados</h2><p>Abiertos primero, con rotación diaria. Horarios de Bolivia.</p></div></div><Link to="/negocios">Ver todos los negocios <span aria-hidden="true">→</span></Link></div>
      {!loading && !error && <p className="home-result-count" role="status">Mostrando {Math.min(filtered.length, 6)} de {filtered.length} negocios{filtering ? ' que coinciden con tus filtros' : ' disponibles'}</p>}
      {filtered.length > 0 ? <div className="home-business-grid">{filtered.slice(0, 6).map(n => <CardNegocio key={n.id} {...n} variant="compact" opening={businessOpening(n, time)}/>)}</div> : !loading && !error && <div className="home-empty"><HomeIcon name="shop"/><h3>{filtering ? 'No encontramos negocios con esos filtros' : 'Aún no hay negocios disponibles'}</h3><p>{filtering ? 'Prueba con otra categoría o una búsqueda diferente.' : 'Vuelve pronto para descubrir las novedades de tu comunidad.'}</p>{filtering && <button type="button" onClick={reset}>Limpiar filtros</button>}</div>}
    </section>

    <section className="home-promotions" aria-labelledby="home-promotions-title">
      <div className="home-section-heading"><div className="home-section-title"><HomeIcon name="tag"/><div><h2 id="home-promotions-title">Productos en promoción</h2><p>Descubre las promociones de los negocios de tu comunidad.</p></div></div><Link to="/promociones">Ver todas las promociones <span aria-hidden="true">→</span></Link></div>
      {promotions.length > 0 ? <div className="home-promotion-grid">{promotions.slice(0, 4).map(p => <CardProducto key={p.id} {...p} variant="promotion" nombreNegocio={byId.get(p.negocioId).nombre}/>)}</div> : !loading && !error && <div className="home-empty"><HomeIcon name="tag"/><h3>{filtering ? 'No hay promociones con esos filtros' : 'Actualmente no hay promociones disponibles'}</h3><p>{filtering ? 'Cambia tu búsqueda o consulta todas las categorías.' : 'Aquí aparecerán los productos que los negocios marquen en promoción.'}</p>{filtering && <button type="button" onClick={reset}>Limpiar filtros</button>}</div>}
    </section>
  </main>;
}
