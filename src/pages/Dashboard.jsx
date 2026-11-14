import LegacyImport from "../components/LegacyImport";

import { Link } from "react-router-dom";
import "../styles/dashboard.css";

function Dashboard() {
  return (
    <main className="dashboard">
      <h1>Panel de administración</h1>
      <p>Bienvenido al panel de Design Lab.</p>

      <LegacyImport />
      <div className="dashboard-contenedor">
        <div className="dashboard-card">
          <h2>Mis videos</h2>
          <p>Comparte enlaces de YouTube y TikTok para mostrar tu negocio.</p>
          <Link to="/administrar-videos">
            <button>Administrar videos</button>
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Mi negocio</h2>
          <p>Registra y administra la información de tus negocios.</p>

          <Link to="/registrar-negocio">
            <button>Registrar negocio</button>
          </Link>

          <Link to="/administrar-negocios">
            <button>Administrar negocios</button>
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Mis productos</h2>
          <p>Registra y administra los productos de tu negocio.</p>

          <Link to="/registrar-producto">
            <button>Registrar producto</button>
          </Link>

          <Link to="/administrar-productos">
            <button>Administrar productos</button>
          </Link>
        </div>

        <div className="dashboard-card">
          <h2>Promociones</h2>
          <p>Activa o desactiva las promociones de tus productos.</p>

          <Link to="/administrar-promociones">
            <button>Administrar promociones</button>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default Dashboard;
