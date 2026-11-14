
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/registrarNegocio.css';

function RegistrarProducto() {
  const navigate = useNavigate();

  const negociosGuardados = JSON.parse(
    localStorage.getItem('negociosRegistrados') || '[]'
  );

  const [negocioId, setNegocioId] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [promocion, setPromocion] = useState(false);

  function guardarProducto(e) {
    e.preventDefault();

    const productosGuardados = JSON.parse(
      localStorage.getItem('productosRegistrados') || '[]'
    );

    const nuevoProducto = {
      id: Date.now(),
      negocioId: Number(negocioId),
      nombre: nombre,
      precio: Number(precio),
      descripcion: descripcion,
      promocion: promocion
    };

    productosGuardados.push(nuevoProducto);

    localStorage.setItem(
      'productosRegistrados',
      JSON.stringify(productosGuardados)
    );

    alert('Producto registrado correctamente');
    navigate('/dashboard');
  }

  return (
    <main className="registrar-negocio">
      <h1>Registrar producto</h1>
      <p>Agrega un producto a tu negocio.</p>

      {negociosGuardados.length === 0 ? (
        <p>Primero debes registrar un negocio.</p>
      ) : (
        <form onSubmit={guardarProducto}>

          <label>Seleccionar negocio</label>
          <select
            value={negocioId}
            onChange={(e) => setNegocioId(e.target.value)}
            required
          >
            <option value="">Selecciona un negocio</option>
            {negociosGuardados.map((negocio) => (
              <option key={negocio.id} value={negocio.id}>
                {negocio.nombre}
              </option>
            ))}
          </select>

          <label>Nombre del producto</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />

          <label>Precio (Bs.)</label>
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
            rows="4"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />

          <label>
            <input
              type="checkbox"
              checked={promocion}
              onChange={(e) => setPromocion(e.target.checked)}
            />
            {' '}¿Está en promoción?
          </label>

          <button type="submit">Guardar producto</button>
        </form>
      )}
    </main>
  );
}

export default RegistrarProducto;
