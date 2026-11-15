
import { Link } from 'react-router-dom';
import '../styles/cardNegocio.css';

function CardNegocio({ id, nombre, categoria, descripcion, imagen, opening }) {
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
