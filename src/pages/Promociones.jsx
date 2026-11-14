import { Link } from "react-router-dom";
import { useLab } from "../context";
import CardProducto from "../components/CardProducto";
export default function Promociones() {
  const { productos, negocios } = useLab();
  const items = productos.filter((p) => p.promocion);
  return (
    <main className="videos-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Aprovecha lo que está cerca</span>
          <h1>Promociones</h1>
          <p>
            Descubre los productos destacados de los negocios de tu comunidad.
          </p>
        </div>
      </div>
      <div className="videos-grid">
        {items.map((p) => (
          <CardProducto
            key={p.id}
            {...p}
            nombreNegocio={negocios.find((n) => n.id === p.negocioId)?.nombre}
          />
        ))}
      </div>
      {!items.length && (
        <div className="empty-state">
          <h2>Pronto habrá novedades</h2>
          <p>Todavía no hay promociones activas.</p>
          <Link to="/negocios">Explorar negocios ↗</Link>
        </div>
      )}
    </main>
  );
}
