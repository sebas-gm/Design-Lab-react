
import { useState } from 'react';
import '../styles/administrarPromociones.css';

function AdministrarPromociones() {
  const [productos, setProductos] = useState(() =>
    JSON.parse(localStorage.getItem('productosRegistrados') || '[]')
  );

  function cambiarPromocion(id) {
    const nuevosProductos = productos.map((producto) =>
      producto.id === id
        ? { ...producto, promocion: !producto.promocion }
        : producto
    );

    setProductos(nuevosProductos);

    localStorage.setItem(
      'productosRegistrados',
      JSON.stringify(nuevosProductos)
    );
  }

  return (
    <main className="administrar-promociones">
      <h1>Administrar promociones</h1>
      <p>Activa o desactiva las promociones de tus productos.</p>

      {productos.length === 0 && (
        <p>No tienes productos registrados.</p>
      )}

      <div className="lista-promociones">
        {productos.map((producto) => (
          <div className="promocion-card" key={producto.id}>
            <h3>{producto.nombre}</h3>

            <p><strong>Precio:</strong> Bs. {producto.precio}</p>

            <p>
              <strong>Estado:</strong>{' '}
              {producto.promocion ? 'En promoción' : 'Sin promoción'}
            </p>

            <button
              onClick={() => cambiarPromocion(producto.id)}
            >
              {producto.promocion
                ? 'Desactivar promoción'
                : 'Activar promoción'}
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

export default AdministrarPromociones;
