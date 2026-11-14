
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/registrarNegocio.css';

function RegistrarNegocio() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [direccion, setDireccion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagen, setImagen] = useState('');

  function registrarNegocio(e) {
    e.preventDefault();

    if (!nombre || !categoria || !direccion || !descripcion) {
      alert('Completa todos los campos obligatorios.');
      return;
    }

    const nuevoNegocio = {
      id: Date.now(),
      nombre,
      categoria,
      direccion,
      descripcion,
      imagen
    };

    const negociosGuardados = JSON.parse(
      localStorage.getItem('negociosRegistrados') || '[]'
    );

    negociosGuardados.push(nuevoNegocio);

    localStorage.setItem(
      'negociosRegistrados',
      JSON.stringify(negociosGuardados)
    );

    alert('Negocio registrado correctamente.');
    navigate('/dashboard');
  }

  return (
    <main className="registrar-negocio">
      <h1>Registrar negocio</h1>

      <p>Completa los datos de tu negocio.</p>

      <form onSubmit={registrarNegocio}>
        <label>Nombre del negocio</label>
        <input
          type="text"
          placeholder="Ej: Cafetería Central"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <label>Categoría</label>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          required
        >
          <option value="">Selecciona una categoría</option>
          <option value="Comida">Comida</option>
          <option value="Librería">Librería</option>
          <option value="Tienda">Tienda</option>
          <option value="Servicios">Servicios</option>
          <option value="Otros">Otros</option>
        </select>

        <label>Dirección</label>
        <input
          type="text"
          placeholder="Ej: Av. Principal #123"
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          required
        />

        <label>Descripción</label>
        <textarea
          placeholder="Describe brevemente tu negocio"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          required
        />

        <label>Imagen del negocio (URL)</label>
        <input
          type="url"
          placeholder="https://ejemplo.com/imagen.jpg"
          value={imagen}
          onChange={(e) => setImagen(e.target.value)}
        />

        <button type="submit">
          Registrar negocio
        </button>
      </form>
    </main>
  );
}

export default RegistrarNegocio;
