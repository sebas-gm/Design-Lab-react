import { Link } from "react-router-dom";

export default function RegistrationWait({ account }) {
  return (
    <section className="moderation-card" role="status">
      <h2>Espera para registrar otro negocio</h2>
      <p>Tras eliminar voluntariamente tu negocio, debes esperar 15 días.</p>
      <p>Podrás registrar otro desde el <strong>{new Date(`${account.registro_disponible_desde}Z`).toLocaleString("es")}</strong> (hora local).</p>
      <p>Mientras tanto puedes explorar negocios, videos y promociones con tu cuenta personal.</p>
      <Link to="/inicio">Ir al inicio</Link>
    </section>
  );
}
