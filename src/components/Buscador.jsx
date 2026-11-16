import '../styles/buscador.css';
function Buscador({ busqueda, setBusqueda }) {
  return (
    <div className="buscador">
      <input
        autoComplete="off"
        type="text"
        aria-label="Buscar negocios y productos"
        placeholder="Buscar negocios y productos..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
    </div>
  );
}

export default Buscador;
