
import { useState } from 'react';
import CardNegocio from '../components/CardNegocio';
import CardProducto from '../components/CardProducto';
import Buscador from '../components/Buscador';
import { negocios } from '../data/negocios';
import { productos } from '../data/productos';
import '../styles/home.css';
import Hero from '../components/Hero';

function Home() {
  const [busqueda, setBusqueda] = useState('');

  const negociosGuardados = JSON.parse(
    localStorage.getItem('negociosRegistrados') || '[]'
  );

  const productosGuardados = JSON.parse(
    localStorage.getItem('productosRegistrados') || '[]'
  );

  const todosLosNegocios = [...negocios, ...negociosGuardados];
  const todosLosProductos = [...productos, ...productosGuardados];

  const negociosFiltrados = todosLosNegocios.filter((negocio) =>
    negocio.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    negocio.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  const promociones = todosLosProductos.filter(
    (producto) =>
      producto.promocion === true &&
      todosLosNegocios.some(
        (negocio) => negocio.id === producto.negocioId
      )
  );

  return (
    <main className="home">
      <Hero />

      <Buscador busqueda={busqueda} setBusqueda={setBusqueda} />

      <h2>Negocios disponibles</h2>

      <section className="contenedor-negocios">
        {negociosFiltrados.map((negocio) => (
          <CardNegocio
            key={negocio.id}
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
