import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import LocationMap from '../components/LocationMap';
import FacadeImage from '../components/FacadeImage';
import ReportLink from '../components/ReportLink';
import CardProducto from '../components/CardProducto';
import { formatBusinessDays } from '../businessDays';
import { businessOpening } from '../catalogOrder';
import { useCatalogTime } from '../useCatalogTime';
import { useLab } from '../context';
import { googleMapsEmbed } from '../googleMapsEmbed';
import '../styles/detalleNegocio.css';

function BusinessIcon({ name }) {
  const paths = {
    pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    phone: 'M7 3H3v4c0 8 6 14 14 14h4v-4l-5-2-2 2c-3-1-6-4-7-7l2-2-2-5Z',
    mail: 'M3 5h18v14H3V5Zm0 0 9 8 9-8',
    calendar: 'M3 5h18v16H3V5Zm4-3v6m10-6v6M3 10h18M7 14h2m4 0h2m-8 4h2',
    clock: 'M12 7v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    shop: 'M4 10v11h16V10M2 10l3-7h14l3 7H2ZM9 21v-7h6v7',
    play: 'M8 4v16l12-8L8 4Z',
    box: 'M12 2 3 7v10l9 5 9-5V7l-9-5ZM3 7l9 5 9-5M12 12v10',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function DetalleNegocio() {
  const { id } = useParams();
  const { negocios, productos, loading, error, refresh } = useLab();
  const time = useCatalogTime();
  const [search, setSearch] = useState('');
  const [onlyPromos, setOnlyPromos] = useState(false);
  const business = negocios.find((item) => item.id === Number(id));
  if (loading && !business) return <main className="detalle-negocio"><p role="status">Cargando negocio…</p></main>;
  if (error) return <main className="detalle-negocio"><p role="alert">{error}</p><button onClick={refresh}>Reintentar</button></main>;
  if (!business) return <main className="detalle-negocio"><h1>Negocio no encontrado</h1><p>Puede que ya no esté disponible en el catálogo.</p><Link className="volver-negocios" to="/negocios">⬅ Volver a negocios</Link></main>;

  const catalog = productos.filter((p) => p.negocioId === business.id);
  const normalize = (text) => (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visible = catalog.filter((p) => (!onlyPromos || p.promocion) && normalize(`${p.nombre} ${p.descripcion}`).includes(normalize(search)));
  const promotions = catalog.filter((p) => p.promocion).length;
  const opening = businessOpening(business, time);
  const hasMap = Boolean(googleMapsEmbed(business.mapa_embed || '')) || (business.latitud != null && business.longitud != null);
  const info = [
    ['pin', 'Dirección', business.direccion || 'Sin especificar'],
    ['phone', 'Teléfono / WhatsApp', business.telefono || 'Sin especificar', business.telefono ? `tel:${business.telefono.replace(/[^+\d]/g, '')}` : null],
    ['mail', 'Correo', business.correo_contacto || 'Sin especificar', business.correo_contacto ? `mailto:${business.correo_contacto}` : null],
    ['calendar', 'Días de atención', formatBusinessDays(business.dias_atencion)],
    ['clock', 'Horario', business.hora_apertura || business.hora_cierre ? `${business.hora_apertura || 'Por confirmar'} – ${business.hora_cierre || 'Por confirmar'}` : 'Sin especificar'],
  ];
  return (
    <main className="detalle-negocio business-public-page">
      <Link to="/negocios" className="volver-negocios">⬅ Volver a negocios</Link>
      <section className="business-public-profile" aria-label={`Información de ${business.nombre}`}>
        <div className="business-public-cover">
          {business.imagen ? <FacadeImage key={business.imagen} src={business.imagen} alt={`Fachada de ${business.nombre}`} /> : <div className="business-public-no-photo"><BusinessIcon name="shop" /><span>Conoce nuestro negocio</span></div>}
          <svg className="business-public-wave" viewBox="0 0 1200 85" preserveAspectRatio="none" aria-hidden="true"><path d="M0 50C160-20 220 90 440 45S760 55 920 20s170-30 280 10v55H0Z" fill="#c9a1ef" fillOpacity=".85"/><path d="M0 66C200 25 260 77 450 53s300 43 500 1 190-22 250 1v30H0Z" fill="#fcfaff"/></svg>
        </div>
        <div className="business-public-summary">
          <div className="business-public-brand">
            <span className="business-public-logo"><span aria-hidden="true">{business.nombre[0]}</span>{business.logo && <img src={business.logo} alt={`Logo de ${business.nombre}`} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}</span>
            <div className="business-public-copy"><div className="business-public-badges"><span className="business-public-category"><BusinessIcon name="shop" />{business.categoria}</span><span className={`business-opening opening-${opening}`}>{opening === 'open' ? 'Abierto ahora' : opening === 'closed' ? 'Cerrado ahora' : 'Horario sin especificar'}</span></div><h1>{business.nombre}</h1><p>{business.descripcion}</p></div>
          </div>
          <div className="business-public-actions"><Link className="business-public-videos" to={`/videos?negocio=${business.id}`}><BusinessIcon name="play" />Ver videos del negocio</Link><ReportLink tipo="negocio" id={business.id} /></div>
        </div>
        {business.estado !== 'activo' && <p className="business-public-private-notice" role="status">Este negocio está {business.estado}. Esta vista es privada para su propietario.</p>}
        <div className="business-public-contact">
          {info.map(([icon, label, text, href]) => <div className={`business-contact-item contact-${icon}`} key={label}><BusinessIcon name={icon} /><div><strong>{label}</strong>{href ? <a href={href}>{text}</a> : <span>{text}</span>}</div></div>)}
          {hasMap ? <a className="business-map-link" href="#mapa-negocio"><BusinessIcon name="pin" />Ver en el mapa</a> : business.enlace_mapa ? <a className="business-map-link" href={business.enlace_mapa} target="_blank" rel="noreferrer"><BusinessIcon name="pin" />Cómo llegar ↗</a> : null}
        </div>
      </section>

      <section className="detalle-productos" aria-labelledby="business-products-title">
        <div className="business-products-heading"><div className="business-products-title"><span><BusinessIcon name="box" /></span><div><h2 id="business-products-title">Productos disponibles</h2><p>Conoce nuestros productos y elige tu favorito.</p></div></div><span className="business-products-count">{catalog.length} productos · {promotions} en promoción</span></div>
        {catalog.length > 0 && <div className="business-products-controls"><div className="business-product-tabs" aria-label="Filtrar productos"><button type="button" aria-pressed={!onlyPromos} className={!onlyPromos ? 'active' : ''} onClick={() => setOnlyPromos(false)}>Todos</button><button type="button" aria-pressed={onlyPromos} className={onlyPromos ? 'active' : ''} onClick={() => setOnlyPromos(true)}>En promoción ({promotions})</button></div><input type="search" aria-label="Buscar productos de este negocio" placeholder="Busca un producto…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>}
        {visible.length ? <div className="detalle-lista-productos">{visible.map((p) => <CardProducto key={p.id} {...p} hideBusinessLink />)}</div> : <div className="business-products-empty"><BusinessIcon name="box" /><p>{catalog.length ? 'No hay productos que coincidan con tu búsqueda.' : 'Este negocio todavía no tiene productos registrados.'}</p>{catalog.length > 0 && <button onClick={() => { setSearch(''); setOnlyPromos(false); }}>Ver todos los productos</button>}</div>}
      </section>

      {(hasMap || business.enlace_mapa) && <section className="business-public-location" id="mapa-negocio" aria-label="Ubicación del negocio"><div className="business-products-heading"><div className="business-products-title"><span><BusinessIcon name="pin" /></span><div><h2>Encuéntranos</h2><p>{business.direccion}</p></div></div>{business.enlace_mapa && <a href={business.enlace_mapa} target="_blank" rel="noreferrer">Cómo llegar ↗</a>}</div><LocationMap latitud={business.latitud} longitud={business.longitud} mapaEmbed={business.mapa_embed} /></section>}
    </main>
  );
}
