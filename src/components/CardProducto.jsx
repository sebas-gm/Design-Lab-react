
import { Link } from 'react-router-dom';
import '../styles/cardProducto.css';
import ReportLink from './ReportLink';

function CardProducto({ id, imagen, nombre, precio, descripcion, promocion, negocioId, nombreNegocio, hideBusinessLink = false, variant }) {
  if (variant === 'catalog') return (
    <article className="catalog-product-card">
      <div className="catalog-product-photo"><img src={imagen || '/icon-navishop.png'} alt={nombre} loading="lazy" onError={(e) => { if (!e.currentTarget.src.endsWith('/icon-navishop.png')) e.currentTarget.src = '/icon-navishop.png'; }}/>{promocion && <span className="catalog-product-promo">Promoción</span>}</div>
      <div className="catalog-product-body"><h3>{nombre}</h3>{descripcion && <p>{descripcion}</p>}<strong className="catalog-product-price">Bs. {precio}</strong>{nombreNegocio && <span className="catalog-product-business">{nombreNegocio}</span>}<Link className="catalog-product-link" to={`/negocios/${negocioId}`}>Ver negocio <span aria-hidden="true">→</span></Link><ReportLink tipo="producto" id={id} negocioId={negocioId} showIcon/></div>
    </article>
  );
  if (variant === 'promotion') return (
    <article className="promotion-card">
      <div className="promotion-card-photo"><img src={imagen || '/icon-navishop.png'} alt={nombre} loading="lazy" onError={(event) => { if (!event.currentTarget.src.endsWith('/icon-navishop.png')) event.currentTarget.src = '/icon-navishop.png'; }} /><span className="promotion-card-label"><span aria-hidden="true"></span> Promoción</span></div>
      <div className="promotion-card-body"><h2>{nombre}</h2><p>{descripcion}</p><strong className="promotion-card-price">Bs. {precio}</strong><div className="promotion-card-footer"><Link className="promotion-business" to={`/negocios/${negocioId}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 10v11h16V10M2 10l3-7h14l3 7H2ZM9 21v-7h6v7" /></svg><span>{nombreNegocio}</span></Link><Link className="promotion-card-arrow" to={`/negocios/${negocioId}`} aria-label={`Ver ${nombre} en ${nombreNegocio}`}>→</Link></div><ReportLink tipo="producto" id={id} negocioId={negocioId} /></div>
    </article>
  );
  if (variant === 'business') return (
    <article className="business-product-card">
      <div className="business-product-photo">
        <img src={imagen || '/icon-navishop.png'} alt={nombre} loading="lazy" onError={(event) => { if (!event.currentTarget.src.endsWith('/icon-navishop.png')) event.currentTarget.src = '/icon-navishop.png'; }} />
        {promocion && <span className="business-product-promo">Promoción</span>}
      </div>
      <div className="business-product-body"><h3>{nombre}</h3><p className="business-product-description">{descripcion}</p><div className="business-product-footer"><strong>Bs. {precio}</strong><ReportLink tipo="producto" id={id} negocioId={negocioId} showIcon /></div></div>
    </article>
  );
  return (
    <div className="card-producto">
      <img className="producto-imagen" src={imagen || "/icon-navishop.png"} alt={nombre} loading="lazy" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "/icon-navishop.png"; }} />
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

      {negocioId && !hideBusinessLink && (
        <Link to={`/negocios/${negocioId}`}>
          Ver negocio
        </Link>
      )}
      <ReportLink tipo="producto" id={id} negocioId={negocioId} />
    </div>
  );
}

export default CardProducto;
