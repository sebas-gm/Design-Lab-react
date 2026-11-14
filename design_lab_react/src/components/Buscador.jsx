import '../styles/buscador.css';
function Buscador({ busqueda, setBusqueda }) {
  return (
    <div className="buscador">
      <input
        type="text"
        placeholder="Buscar negocios..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
    </div>
  );
}

export default Buscador;
