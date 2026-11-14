import { useLab } from '../context';

import { useState } from 'react';
import CardNegocio from '../components/CardNegocio';
import CardProducto from '../components/CardProducto';
import TecbaReference from '../components/TecbaReference';
import Buscador from '../components/Buscador';

import '../styles/home.css';
import '../styles/negocios.css';

function Negocios() {
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');

  const { negocios: todosLosNegocios, productos } = useLab();
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const query = normalize(busqueda);

  const negociosFiltrados = todosLosNegocios.filter((negocio) => {
    const coincideBusqueda =
      normalize(`${negocio.nombre} ${negocio.categoria} ${negocio.descripcion} ${negocio.direccion}`).includes(query) ||
      productos.some(p => p.negocioId === negocio.id && normalize(p.nombre).includes(query));

    const coincideCategoria =
      categoria === 'Todas' || negocio.categoria === categoria;

    return coincideBusqueda && coincideCategoria;
  });

  return (
    <main className="pagina-negocios">
      <h1>Todos los negocios</h1>
      <p>Explora los emprendimientos cercanos a TECBA.</p>
      <TecbaReference />

      <Buscador busqueda={busqueda} setBusqueda={setBusqueda} />

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

      <section className="contenedor-negocios">
        {negociosFiltrados.map((negocio) => (
          <CardNegocio
            key={negocio.id}
            imagen={negocio.imagen}
            id={negocio.id}
            nombre={negocio.nombre}
            categoria={negocio.categoria}
            descripcion={negocio.descripcion}
          />
        ))}
      </section>

      {negociosFiltrados.length === 0 && (
        <p>No se encontraron negocios.</p>
      )}
      <h2>Catálogo de productos</h2>
      <section className="contenedor-negocios">
        {productos.filter(p => negociosFiltrados.some(n => n.id === p.negocioId) && normalize(`${p.nombre} ${p.descripcion}`).includes(query)).map(p =>
          <CardProducto key={p.id} {...p} nombreNegocio={todosLosNegocios.find(n => n.id === p.negocioId)?.nombre} />)}
      </section>
    </main>
  );
}

export default Negocios;
