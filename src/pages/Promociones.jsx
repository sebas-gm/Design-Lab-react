import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLab } from '../context';
import CardProducto from '../components/CardProducto';
import '../styles/promociones.css';

function CategoryIcon({ category }) {
  const paths = {
    Todas: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    Comida: 'M4 3v6c0 3 6 3 6 0V3M7 3v18M17 21V3c-4 1-4 9 0 9h3V3',
    Librería: 'M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Zm0 0v16',
    Tienda: 'M4 10v11h16V10M2 10l3-7h14l3 7H2ZM9 21v-7h6v7',
    Servicios: 'm14 5 5 5M4 20l4-1L21 6l-3-3L5 16l-1 4Z',
    Otros: 'M12 2 3 7v10l9 5 9-5V7l-9-5ZM3 7l9 5 9-5M12 12v10',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[category] || paths.Otros} /></svg>;
}

function PromotionIllustration() {
  return <svg className="promotions-illustration" viewBox="0 0 230 185" aria-hidden="true">
    <defs><linearGradient id="promo-tag-body" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#cb9dff"/><stop offset=".5" stopColor="#a062ef"/><stop offset="1" stopColor="#7030c5"/></linearGradient><linearGradient id="promo-tag-edge" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a669ed"/><stop offset="1" stopColor="#4d1895"/></linearGradient><filter id="promo-tag-shadow"><feDropShadow dx="0" dy="5" stdDeviation="3" floodColor="#612a93" floodOpacity=".22"/></filter></defs>
    <g transform="rotate(21 136 90)" filter="url(#promo-tag-shadow)"><path d="M110 28h51l32 38v84a14 14 0 0 1-14 14H102a14 14 0 0 1-14-14V67l22-39Z" fill="url(#promo-tag-edge)"/><path d="M103 21h51l32 38v84a14 14 0 0 1-14 14H95a14 14 0 0 1-14-14V60l22-39Z" fill="url(#promo-tag-body)"/><circle cx="131" cy="48" r="8" fill="#6630ac"/><path d="M130 47c-16-25-3-39 11-36 14 3 16 16 10 23" fill="none" stroke="#e6c7ff" strokeWidth="9" strokeLinecap="round"/><path d="m111 125 44-46" stroke="#6630ac" strokeWidth="8" strokeLinecap="round"/><path d="m108 122 44-46" stroke="#fbf2ff" strokeWidth="8" strokeLinecap="round"/><ellipse cx="107" cy="84" rx="11" ry="14" fill="none" stroke="#f5e5ff" strokeWidth="7"/><ellipse cx="153" cy="120" rx="11" ry="14" fill="none" stroke="#f5e5ff" strokeWidth="7"/></g>
    <path d="m51 33-9-17M37 56l-16-5M64 14l-2-10" stroke="#ffce4d" strokeWidth="8" strokeLinecap="round"/>
  </svg>;
}

export default function Promociones() {
  const { productos, negocios, loading, error, refresh } = useLab();
  const [category, setCategory] = useState('Todas');
  const [order, setOrder] = useState('recent');
  const businesses = new Map(negocios.filter((b) => b.estado === 'activo').map((b) => [b.id, b]));
  const all = productos.filter((p) => p.promocion && businesses.has(p.negocioId));
  const categories = ['Todas', ...['Comida', 'Librería', 'Tienda', 'Servicios', 'Otros'].filter((c) => all.some((p) => businesses.get(p.negocioId).categoria === c))];
  const visible = all.filter((p) => category === 'Todas' || businesses.get(p.negocioId).categoria === category).sort((a, b) => {
    if (order === 'price-low') return Number(a.precio) - Number(b.precio) || b.id - a.id;
    if (order === 'price-high') return Number(b.precio) - Number(a.precio) || b.id - a.id;
    if (order === 'name') return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) || b.id - a.id;
    return b.id - a.id;
  });
  return <main className="promotions-page">
    <header className="promotions-hero"><svg className="promotions-hero-waves" viewBox="0 0 1200 150" preserveAspectRatio="none" aria-hidden="true"><path d="M300 140c180-100 230-45 370-75S900 10 1030 60s100-35 170-45v135H300Z" fill="#ede0ff"/><path d="M570 150c110-80 200-95 300-52s200-40 330-65v117H570Z" fill="#d9b8f7" fillOpacity=".7"/></svg><div className="promotions-hero-copy"><span className="promotions-tag-outline" aria-hidden="true"><svg viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="3"><path d="M8 29 30 7h16l8 8v16L31 54a5 5 0 0 1-7 0L8 38a6 6 0 0 1 0-9Z"/><circle cx="41" cy="19" r="4"/></svg></span><div><span className="promotions-eyebrow">Aprovecha lo que está cerca</span><h1>Promociones</h1><p>Descubre los productos destacados de los negocios de tu comunidad.</p></div></div><PromotionIllustration /></header>
    <div className="promotions-toolbar"><div className="promotions-categories" role="group" aria-label="Filtrar promociones por categoría">{categories.map((item) => <button key={item} type="button" aria-pressed={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}><CategoryIcon category={item} />{item}</button>)}</div><label className="promotions-sort">Ordenar por:<select value={order} onChange={(e) => setOrder(e.target.value)}><option value="recent">Más recientes</option><option value="price-low">Menor precio</option><option value="price-high">Mayor precio</option><option value="name">Nombre A–Z</option></select></label></div>
    {loading ? <p className="promotions-status" role="status">Cargando promociones…</p> : error ? <div className="promotions-empty" role="alert"><p>{error}</p><button onClick={refresh}>Reintentar</button></div> : <><p className="promotions-result-count" role="status">{visible.length} {visible.length === 1 ? 'promoción disponible' : 'promociones disponibles'}{category !== 'Todas' ? ` en ${category}` : ''}</p><section className="promotions-grid" aria-label="Productos en promoción">{visible.map((p) => <CardProducto key={p.id} {...p} variant="promotion" nombreNegocio={businesses.get(p.negocioId).nombre} />)}</section>{!visible.length && <section className="promotions-empty"><CategoryIcon category="Otros"/><h2>{all.length ? 'No hay promociones en esta categoría' : 'Pronto habrá novedades'}</h2><p>{all.length ? 'Elige otra categoría para seguir explorando.' : 'Los negocios publicarán aquí sus productos destacados.'}</p>{all.length ? <button onClick={() => setCategory('Todas')}>Ver todas las promociones</button> : <Link to="/negocios">Explorar negocios →</Link>}</section>}</>}
    <svg className="promotions-footer-waves" viewBox="0 0 1200 75" preserveAspectRatio="none" aria-hidden="true"><path d="M0 50c100-80 150 35 320 7s300 35 460-10 260 55 420-10v38H0Z" fill="#ead7fc"/><path d="M0 68c180-25 180-8 360 7h410c180-70 260-80 430-55v55H0Z" fill="#dbb8f6" fillOpacity=".65"/></svg>
  </main>;
}
