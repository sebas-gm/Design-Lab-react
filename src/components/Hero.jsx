
import { Link } from 'react-router-dom';
import '../styles/hero.css';

function Hero() {
  return (
    <section className="hero">
      <div className="hero-contenido">
        <span className="hero-etiqueta">
          Descubre negocios locales
        </span>

        <h1>Todo lo que necesitas, en un solo lugar</h1>

        <p>
          Descubre emprendimientos, productos y promociones más cerca de ti.
        </p>

        <div className="hero-botones">
          <Link to="/negocios" className="hero-btn-principal">
            Explorar negocios
          </Link>

          <Link to="/registrar-negocio" className="hero-btn-secundario">
            Registrar mi negocio
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Hero;
