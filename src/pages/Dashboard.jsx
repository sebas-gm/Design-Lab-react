import LegacyImport from "../components/LegacyImport";
import { useLab } from "../context";

import { Link } from "react-router-dom";
import "../styles/dashboard.css";

function Dashboard() {
  const { negocios, user } = useLab();
  const hasBusiness = negocios.some((n) => n.owner_id === user.id);
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
          <p>Administra la información de tu único negocio.</p>

          {!hasBusiness && (
            <Link to="/registrar-negocio">
              <button>Registrar negocio</button>
            </Link>
          )}

          <Link to="/administrar-negocios">
            <button>Administrar mi negocio</button>
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
