import { useLab } from "../context";

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import CardNegocio from "../components/CardNegocio";
import CardProducto from "../components/CardProducto";
import TecbaReference from "../components/TecbaReference";
import Buscador from "../components/Buscador";
import { orderBusinesses, businessOpening } from "../catalogOrder";
import { useCatalogTime } from "../useCatalogTime";

import "../styles/home.css";
import "../styles/negocios.css";

function Negocios() {
  const time = useCatalogTime();
  const [order, setOrder] = useState('open');
  const [promotionsOnly, setPromotionsOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const busqueda = searchParams.get("q") || "";
  const setBusqueda = (value) =>
    setSearchParams(value ? { q: value } : {}, { replace: true });
  const [categoria, setCategoria] = useState("Todas");

  const { negocios: todosLosNegocios, productos } = useLab();
  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const query = normalize(busqueda);

  const negociosFiltrados = orderBusinesses(todosLosNegocios, order, time).filter((negocio) => {
    const coincideBusqueda =
      normalize(
        `${negocio.nombre} ${negocio.categoria} ${negocio.descripcion} ${negocio.direccion}`,
      ).includes(query) ||
      productos.some(
        (p) =>
          p.negocioId === negocio.id && normalize(p.nombre).includes(query),
      );

    const coincideCategoria =
      categoria === "Todas" || negocio.categoria === categoria;

    return coincideBusqueda && coincideCategoria && (!openOnly || businessOpening(negocio, time) === 'open') && (!promotionsOnly || productos.some((p) => p.negocioId === negocio.id && p.promocion));
  });

  return (
    <main className="pagina-negocios">
      <h1>Todos los negocios</h1>
      <p>Explora los emprendimientos cercanos a TECBA.</p>
      <TecbaReference />

      <Buscador busqueda={busqueda} setBusqueda={setBusqueda} />

      <div className="catalog-controls">
      <select
        aria-label="Filtrar por categoría"
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
      >
        <option value="Todas">Todas las categorías</option>
        <option value="Comida">Comida</option>
        <option value="Librería">Librería</option>
        <option value="Tienda">Tienda</option>
        <option value="Servicios">Servicios</option>
        <option value="Otros">Otros</option>
      </select>
      <label>Ordenar por<select value={order} onChange={(e) => setOrder(e.target.value)}><option value="open">Abiertos primero · rotación diaria</option><option value="name">Nombre A–Z</option><option value="recent">Más recientes</option></select></label>
      <label className="catalog-checkbox"><input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />Solo abiertos ahora</label>
      <label className="catalog-checkbox"><input type="checkbox" checked={promotionsOnly} onChange={(e) => setPromotionsOnly(e.target.checked)} />Con promociones</label>
      </div>
      <p className="catalog-order-note">{negociosFiltrados.length} negocios · Horarios de Bolivia. La rotación cambia cada día.</p>

      <section className="contenedor-negocios">
        {negociosFiltrados.map((negocio) => (
          <CardNegocio
            key={negocio.id}
            opening={businessOpening(negocio, time)}
            imagen={negocio.imagen}
            id={negocio.id}
            nombre={negocio.nombre}
            categoria={negocio.categoria}
            descripcion={negocio.descripcion}
          />
        ))}
      </section>

      {negociosFiltrados.length === 0 && <p>No se encontraron negocios.</p>}
      <h2>Catálogo de productos</h2>
      <section className="contenedor-negocios">
        {productos
          .filter(
            (p) =>
              negociosFiltrados.some((n) => n.id === p.negocioId) &&
              normalize(`${p.nombre} ${p.descripcion}`).includes(query),
          )
          .map((p) => (
            <CardProducto
              key={p.id}
              {...p}
              nombreNegocio={
                todosLosNegocios.find((n) => n.id === p.negocioId)?.nombre
              }
            />
          ))}
      </section>
    </main>
  );
}

export default Negocios;
