import { useLab } from '../context';

import { useState } from 'react';
import CardNegocio from '../components/CardNegocio';
import CardProducto from '../components/CardProducto';
import Buscador from '../components/Buscador';


import '../styles/home.css';
import Hero from '../components/Hero';
import { orderBusinesses, businessOpening } from '../catalogOrder';
import { useCatalogTime } from '../useCatalogTime';

function Home() {
  const time = useCatalogTime();
  const [busqueda, setBusqueda] = useState('');

  const { negocios: todosLosNegocios, productos: todosLosProductos } = useLab();

  const activeBusinesses = orderBusinesses(todosLosNegocios, 'open', time);
  const negociosFiltrados = activeBusinesses.filter((negocio) =>
    negocio.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    negocio.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  const promociones = todosLosProductos.filter(
    (producto) =>
      producto.promocion === true &&
      activeBusinesses.some(
        (negocio) => negocio.id === producto.negocioId
      )
  );

  return (
    <main className="home">
      <Hero />

      <Buscador busqueda={busqueda} setBusqueda={setBusqueda} />

      <h2>Negocios disponibles</h2>
      <p className="catalog-order-note">Abiertos primero, con rotación diaria. Horarios de Bolivia.</p>

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

      {negociosFiltrados.length === 0 && (
        <p>No se encontraron negocios.</p>
      )}

      <h2>Productos en promoción</h2>

      <section className="contenedor-negocios">
        {promociones.map((producto) => {
          const negocio = todosLosNegocios.find(
            (negocio) => negocio.id === producto.negocioId
          );

          return (
            <CardProducto
              key={producto.id}
              id={producto.id}
              imagen={producto.imagen}
              nombre={producto.nombre}
              precio={producto.precio}
              descripcion={producto.descripcion}
              promocion={producto.promocion}
              negocioId={producto.negocioId}
              nombreNegocio={negocio.nombre}
            />
          );
        })}
      </section>

      {promociones.length === 0 && (
        <p>Actualmente no hay promociones disponibles.</p>
      )}
    </main>
  );
}

export default Home;
