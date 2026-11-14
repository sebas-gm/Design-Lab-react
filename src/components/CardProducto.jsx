
import { Link } from 'react-router-dom';
import '../styles/cardProducto.css';

function CardProducto({ imagen, nombre, precio, descripcion, promocion, negocioId, nombreNegocio }) {
  return (
    <div className="card-producto">
      <img className="producto-imagen" src={imagen || "/product-placeholder.svg"} alt={nombre} loading="lazy" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "/product-placeholder.svg"; }} />
      {promocion && (
        <span className="etiqueta-promo">Promoción</span>
      )}

      <h3>{nombre}</h3>
      <p>{descripcion}</p>
      <h4>Bs. {precio}</h4>

      {nombreNegocio && (
        <p>
          <strong>Negocio:</strong> {nombreNegocio}
        </p>
      )}

      {negocioId && (
        <Link to={`/negocios/${negocioId}`}>
          Ver negocio
        </Link>
      )}
    </div>
  );
}

export default CardProducto;
