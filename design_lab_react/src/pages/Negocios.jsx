
import { useState } from 'react';
import CardNegocio from '../components/CardNegocio';
import Buscador from '../components/Buscador';
import { negocios } from '../data/negocios';
import '../styles/home.css';
import '../styles/negocios.css';

function Negocios() {
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todas');

  const negociosGuardados = JSON.parse(
    localStorage.getItem('negociosRegistrados') || '[]'
  );

  const todosLosNegocios = [...negocios, ...negociosGuardados];

  const negociosFiltrados = todosLosNegocios.filter((negocio) => {
    const coincideBusqueda =
      negocio.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      negocio.categoria.toLowerCase().includes(busqueda.toLowerCase());

    const coincideCategoria =
      categoria === 'Todas' || negocio.categoria === categoria;

    return coincideBusqueda && coincideCategoria;
  });

  return (
    <main className="pagina-negocios">
      <h1>Todos los negocios</h1>
      <p>Explora los emprendimientos cercanos a TECBA.</p>

      <Buscador busqueda={busqueda} setBusqueda={setBusqueda} />

      <select
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
    </main>
  );
}

export default Negocios;
