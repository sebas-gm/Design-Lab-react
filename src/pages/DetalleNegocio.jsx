import LocationMap from "../components/LocationMap";
import { useLab } from "../context";

import { useParams, Link } from "react-router-dom";

import CardProducto from "../components/CardProducto";
import "../styles/detalleNegocio.css";

function DetalleNegocio() {
  const { id } = useParams();

  const { negocios: todosLosNegocios, productos: todosLosProductos } = useLab();

  const negocio = todosLosNegocios.find((item) => item.id === Number(id));

  if (!negocio) {
    return (
      <main className="detalle-negocio">
        <h2>Negocio no encontrado</h2>
        <Link to="/negocios">Volver a negocios</Link>
      </main>
    );
  }

  const productosNegocio = todosLosProductos.filter(
    (producto) => producto.negocioId === negocio.id,
  );

  const imagenes = {
    Comida: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=1200",
    Librería:
      "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200",
    Tienda:
      "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200",
  };

  const imagenNegocio =
    negocio.imagen ||
    imagenes[negocio.categoria] ||
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200";

  return (
    <main className="detalle-negocio">
      <Link to="/negocios" className="volver-negocios">
        ← Volver a negocios
      </Link>

      <div className="detalle-portada">
        <img src={imagenNegocio} alt={negocio.nombre} />
      </div>

      <section className="detalle-informacion">
        <span className="detalle-categoria">{negocio.categoria}</span>

        <h1>{negocio.nombre}</h1>
        <p>
          <Link to={`/videos?negocio=${negocio.id}`}>
            Ver los videos de este negocio ↗
          </Link>
        </p>
        {negocio.logo && (
          <img
            src={negocio.logo}
            alt={`Logo de ${negocio.nombre}`}
            style={{ width: 90, height: 90, objectFit: "contain" }}
          />
        )}

        <p>{negocio.descripcion}</p>

        {negocio.direccion && (
          <p>
            <strong>Dirección:</strong> {negocio.direccion}
          </p>
        )}
        {negocio.telefono && (
          <p>
            <strong>Teléfono / WhatsApp:</strong>{" "}
            <a href={`tel:${negocio.telefono.replace(/[^+\d]/g, "")}`}>
              {negocio.telefono}
            </a>
          </p>
        )}
        {negocio.correo_contacto && (
          <p>
            <strong>Correo:</strong>{" "}
            <a href={`mailto:${negocio.correo_contacto}`}>
              {negocio.correo_contacto}
            </a>
          </p>
        )}
        {(negocio.hora_apertura || negocio.hora_cierre) && (
          <p>
            <strong>Horario:</strong> {negocio.hora_apertura || "Por confirmar"}{" "}
            – {negocio.hora_cierre || "Por confirmar"}
          </p>
        )}
        {negocio.enlace_mapa && (
          <p>
            <a href={negocio.enlace_mapa} target="_blank" rel="noreferrer">
              Ver dirección en el mapa ↗
            </a>
          </p>
        )}
      </section>

      <LocationMap latitud={negocio.latitud} longitud={negocio.longitud} />
      <section className="detalle-productos">
        <h2>Productos disponibles</h2>

        {productosNegocio.length === 0 ? (
          <p>Este negocio todavía no tiene productos registrados.</p>
        ) : (
          <div className="detalle-lista-productos">
            {productosNegocio.map((producto) => (
              <CardProducto
                key={producto.id}
                imagen={producto.imagen}
                nombre={producto.nombre}
                precio={producto.precio}
                descripcion={producto.descripcion}
                promocion={producto.promocion}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default DetalleNegocio;
