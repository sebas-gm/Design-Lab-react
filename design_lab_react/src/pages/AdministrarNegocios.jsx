
import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/administrarNegocios.css';

function AdministrarNegocios() {
  const [negocios, setNegocios] = useState(() =>
    JSON.parse(localStorage.getItem('negociosRegistrados') || '[]')
  );

  const [editando, setEditando] = useState(null);

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [direccion, setDireccion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagen, setImagen] = useState('');

  function editarNegocio(negocio) {
    setEditando(negocio.id);
    setNombre(negocio.nombre);
    setCategoria(negocio.categoria);
    setDireccion(negocio.direccion);
    setDescripcion(negocio.descripcion);
    setImagen(negocio.imagen || '');
  }

  function guardarCambios(id) {
    const nuevosNegocios = negocios.map((negocio) =>
      negocio.id === id
        ? { ...negocio, nombre, categoria, direccion, descripcion, imagen }
        : negocio
    );

    setNegocios(nuevosNegocios);
    localStorage.setItem('negociosRegistrados', JSON.stringify(nuevosNegocios));

    setEditando(null);
    alert('Negocio actualizado correctamente.');
  }

  function eliminarNegocio(id) {
    if (!window.confirm('¿Estás seguro de eliminar este negocio?')) {
      return;
    }

    const nuevosNegocios = negocios.filter((negocio) => negocio.id !== id);

    setNegocios(nuevosNegocios);
    localStorage.setItem('negociosRegistrados', JSON.stringify(nuevosNegocios));

    const productos = JSON.parse(
      localStorage.getItem('productosRegistrados') || '[]'
    );

    const nuevosProductos = productos.filter(
      (producto) => producto.negocioId !== id
    );

    localStorage.setItem('productosRegistrados', JSON.stringify(nuevosProductos));
  }

  return (
    <main className="administrar-negocios">
      <h1>Administrar negocios</h1>
      <p>Modifica o elimina los negocios que registraste.</p>

      <Link to="/registrar-negocio">
        Registrar nuevo negocio
      </Link>

      {negocios.length === 0 && (
        <p>No tienes negocios registrados.</p>
      )}

      <div className="lista-negocios">
        {negocios.map((negocio) => (
          <div className="negocio-admin-card" key={negocio.id}>
            {editando === negocio.id ? (
              <div className="formulario-edicion">
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre"
                />

                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="Comida">Comida</option>
                  <option value="Librería">Librería</option>
                  <option value="Tienda">Tienda</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Otros">Otros</option>
                </select>

                <input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Dirección"
                />

                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción"
                />

                <label>Imagen del negocio (URL)</label>
                <input
                  type="url"
                  value={imagen}
                  onChange={(e) => setImagen(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />

                <button onClick={() => guardarCambios(negocio.id)}>
                  Guardar cambios
                </button>

                <button onClick={() => setEditando(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                {negocio.imagen && (
                  <img
                    src={negocio.imagen}
                    alt={negocio.nombre}
                    className="imagen-negocio-admin"
                  />
                )}

                <h3>{negocio.nombre}</h3>
                <p><strong>Categoría:</strong> {negocio.categoria}</p>
                <p><strong>Dirección:</strong> {negocio.direccion}</p>
                <p><strong>Descripción:</strong> {negocio.descripcion}</p>

                <button onClick={() => editarNegocio(negocio)}>
                  Editar
                </button>

                <button onClick={() => eliminarNegocio(negocio.id)}>
                  Eliminar
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

export default AdministrarNegocios;
