import { Link } from 'react-router-dom';
import HomeIcon from './HomeIcon';
import '../styles/hero.css';

export default function Hero() {
  return <section className="home-hero" aria-labelledby="home-hero-title">
    <svg className="hero-waves" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true"><path d="M0 170C160 115 250 230 440 150s170 50 400-25 240-110 360-80v155H0Z" fill="#e4cffb"/><path d="M0 190c200-100 280 60 500-30s220 70 400-20 220-45 300-60v120H0Z" fill="#d5b5f5" fillOpacity=".6"/></svg>
    <div className="hero-contenido"><div className="hero-texto"><span className="hero-etiqueta">Descubre tu comunidad</span><h1 id="home-hero-title">Todo lo que necesitas, <span>en un solo lugar</span></h1><p>Encuentra negocios locales, productos, promociones y novedades cerca de ti.</p></div><div className="hero-botones"><Link to="/negocios" className="hero-btn-principal"><HomeIcon name="shop"/>Explorar negocios</Link><Link to="/registrar-negocio" className="hero-btn-secundario"><HomeIcon name="Tienda"/>Registrar mi negocio</Link></div></div>
  </section>;
}
