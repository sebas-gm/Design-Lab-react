
import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/administrarProductos.css';

function AdministrarProductos() {
  const [productos, setProductos] = useState(() =>
    JSON.parse(localStorage.getItem('productosRegistrados') || '[]')
  );

  const [editando, setEditando] = useState(null);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');

  function eliminarProducto(id) {
    if (!window.confirm('¿Deseas eliminar este producto?')) {
      return;
    }

    const nuevosProductos = productos.filter(
      (producto) => producto.id !== id
    );

    setProductos(nuevosProductos);

    localStorage.setItem(
      'productosRegistrados',
      JSON.stringify(nuevosProductos)
    );
  }

  function editarProducto(producto) {
    setEditando(producto.id);
    setNombre(producto.nombre);
    setPrecio(producto.precio);
    setDescripcion(producto.descripcion);
  }

  function guardarCambios(e) {
    e.preventDefault();

    const nuevosProductos = productos.map((producto) =>
      producto.id === editando
        ? {
            ...producto,
            nombre: nombre,
            precio: Number(precio),
            descripcion: descripcion
          }
        : producto
    );

    setProductos(nuevosProductos);

    localStorage.setItem(
      'productosRegistrados',
      JSON.stringify(nuevosProductos)
    );

    setEditando(null);
  }

  return (
    <main className="administrar-productos">
      <h1>Administrar productos</h1>
      <p>Consulta, modifica o elimina los productos registrados.</p>

      <Link to="/registrar-producto">
        <button className="btn-agregar">Agregar producto</button>
      </Link>

      {productos.length === 0 && (
        <p>No tienes productos registrados.</p>
      )}

      <div className="lista-productos">
        {productos.map((producto) => (
          <div className="producto-admin" key={producto.id}>
            <h3>{producto.nombre}</h3>
            <p>{producto.descripcion}</p>
            <p><strong>Precio:</strong> Bs. {producto.precio}</p>
            <p>
              <strong>Promoción:</strong>{' '}
              {producto.promocion ? 'Sí' : 'No'}
            </p>

            <button onClick={() => editarProducto(producto)}>
              Editar
            </button>

            <button
              className="btn-eliminar"
              onClick={() => eliminarProducto(producto.id)}
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      {editando !== null && (
        <form className="form-editar" onSubmit={guardarCambios}>
          <h2>Editar producto</h2>

          <label>Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />

          <label>Precio</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            required
          />

          <label>Descripción</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />

          <button type="submit">Guardar cambios</button>

          <button
            type="button"
            className="btn-cancelar"
            onClick={() => setEditando(null)}
          >
            Cancelar
          </button>
        </form>
      )}
    </main>
  );
}

export default AdministrarProductos;
