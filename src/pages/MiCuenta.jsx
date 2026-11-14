import { Link } from "react-router-dom";
import { useLab } from "../context";
import LegacyImport from "../components/LegacyImport";

export default function MiCuenta() {
  const { user } = useLab();
  const business = user.tipo_cuenta === "negocios";
  return (
    <main className="videos-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Tu espacio en Design Lab</span>
          <h1>Mi cuenta</h1>
          <p>Hola, {user.nombre}. Aquí puedes consultar tu cuenta.</p>
        </div>
      </div>
      <section className="migration-panel">
        <h2>{user.nombre}</h2>
        <p>{user.correo}</p>
        <span className="platform-badge">
          Cuenta {business ? "de negocios" : "personal"}
        </span>
        <p>
          {business
            ? "Tu cuenta tiene acceso a las herramientas para administrar tus negocios."
            : "Puedes explorar todo Design Lab. Si tienes un emprendimiento, activa tu cuenta de negocios cuando quieras."}
        </p>
        <Link
          className="purple-link"
          to={business ? "/dashboard" : "/activar-negocio"}
        >
          {business ? "Ir a mi panel" : "Registrar mi negocio"} ↗
        </Link>
      </section>
      <LegacyImport />
    </main>
  );
}
