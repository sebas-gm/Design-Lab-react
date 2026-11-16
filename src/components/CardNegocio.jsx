
import { Link } from 'react-router-dom';
import '../styles/cardNegocio.css';
import HomeIcon from './HomeIcon';

function CardNegocio({ id, nombre, categoria, descripcion, imagen, opening, hora_apertura, hora_cierre, variant }) {
  if (variant === 'catalog') return (
    <article className="catalog-business-card">
      <img className="catalog-business-image" src={imagen || '/product-placeholder.svg'} alt={nombre} loading="lazy" onError={(e) => { if (!e.currentTarget.src.endsWith('/product-placeholder.svg')) e.currentTarget.src = '/product-placeholder.svg'; }} />
      <div className="catalog-business-body">
        {categoria && <span className="catalog-business-category"><HomeIcon name={categoria}/>{categoria}</span>}
        <h3>{nombre}</h3>
        {descripcion && <p>{descripcion}</p>}
        <div className="catalog-business-footer">
          <div className="catalog-business-schedule">
            {hora_apertura && hora_cierre && <span className="catalog-business-hours"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v7l4 2"/></svg>{hora_apertura} – {hora_cierre}</span>}
            {(opening === 'open' || opening === 'closed') && <span className={`catalog-business-opening is-${opening}`}>{opening === 'open' ? 'Abierto ahora' : 'Cerrado ahora'}</span>}
          </div>
          <Link className="catalog-business-link" to={`/negocios/${id}`}>Ver negocio <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </article>
  );
  if (variant === 'compact') return (
    <article className="home-business-card">
      <img className="home-business-photo" src={imagen || '/product-placeholder.svg'} alt={nombre} loading="lazy" onError={(e) => { if (!e.currentTarget.src.endsWith('/product-placeholder.svg')) e.currentTarget.src = '/product-placeholder.svg'; }} />
      <div className="home-business-copy">
        {categoria && <span className="home-business-category">{categoria}</span>}
        <h3>{nombre}</h3>
        {descripcion && <p>{descripcion}</p>}
        {(opening === 'open' || opening === 'closed') && <div className="home-business-hours"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 6v7l4 2" /></svg>{hora_apertura} – {hora_cierre}</span><span className={`home-business-opening is-${opening}`}>{opening === 'open' ? 'Abierto ahora' : 'Cerrado ahora'}</span></div>}
        <Link to={`/negocios/${id}`} className="home-business-link">Ver negocio <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
  const imagenes = {
    Comida: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600',
    Librería: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600',
    Tienda: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600'
  };

  const imagenNegocio = imagen || imagenes[categoria] ||
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600';

  return (
    <div className="card-negocio">
      <img
        loading="lazy"
        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "/product-placeholder.svg"; }}
        src={imagenNegocio}
        alt={nombre}
        className="card-negocio-imagen"
      />

      <div className="card-negocio-contenido">
        <span className="card-negocio-categoria">
          {categoria}
        </span>

        <h3>{nombre}</h3>
        {opening && <span className={`business-opening opening-${opening}`}>{opening === 'open' ? 'Abierto ahora' : opening === 'closed' ? 'Cerrado ahora' : 'Horario sin especificar'}</span>}

        <p>{descripcion}</p>

        <Link to={`/negocios/${id}`} className="card-negocio-boton">
          Ver negocio
        </Link>
      </div>
    </div>
  );
}

export default CardNegocio;
