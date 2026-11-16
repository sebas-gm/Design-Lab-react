import { Link, Navigate } from "react-router-dom";
import { useLab } from "../context";
import RegistrationWait from "../components/RegistrationWait";
import { registrationWaiting } from "../registration";

export default function ActivarNegocio() {
  const { user } = useLab();
  if (registrationWaiting(user)) return <main className="videos-page"><RegistrationWait account={user} /></main>;
  if (user.puede_registrar === false) return <Navigate to="/estado-negocio" replace />;
  if (user.tipo_cuenta === "negocios")
    return <Navigate to="/dashboard" replace />;
  return (
    <main className="videos-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            El siguiente paso para tu emprendimiento
          </span>
          <h1>Tu negocio también tiene un lugar aquí</h1>
          <p>Activa tu cuenta de negocios con tu misma cuenta de Navishop.</p>
        </div>
      </div>
      <section className="migration-panel activation-panel">
        <h2>Comparte lo que haces con tu comunidad</h2>
        <p>
          Publica tu negocio y administra sus productos,
          promociones, horarios y videos desde un solo lugar.
        </p>
        <ol>
          <li>Completa los datos y las fotos de tu negocio.</li>
          <li>
            Al guardarlo, tu cuenta personal se convierte en cuenta de negocios.
          </li>
          <li>
            Accede a Mi negocio, Mis productos, Mis promociones y Mis videos.
          </li>
        </ol>
        <p>
          La activación es gratuita. La administración revisará tu negocio antes
          de publicarlo. Si cancelas antes de guardar, tu cuenta seguirá siendo personal.
        </p>
        <Link className="purple-link" to="/registrar-negocio">
          Completar datos de mi negocio 
        </Link>
        <Link className="activation-back" to="/">
          Seguir explorando
        </Link>
      </section>
    </main>
  );
}
