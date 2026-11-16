import { Link } from "react-router-dom";
import { useLab } from "../context";
import "../styles/moderation.css";
import { deletionDate } from '../businessDeletion';

export default function BusinessNotice() {
  const { user, moderation } = useLab();
  if (user?.is_admin || !moderation) return null;
  if (moderation.negocio?.eliminacion_programada) return <section className="business-notice" role="status"><div><strong>Tu negocio tiene una eliminación pendiente</strong><p>Puedes restaurarlo antes del {deletionDate(moderation.negocio.eliminacion_programada)} (hora de Bolivia).</p></div><Link to="/estado-negocio">Restaurar negocio →</Link></section>;
  const state =
    moderation.negocio?.estado ||
    (!moderation.puede_registrar
      ? moderation.historial[0]?.estado === "eliminado"
        ? "eliminado"
        : "restringido"
      : "activo");
  if (['activo', 'pendiente', 'correcciones', 'rechazado'].includes(state)) return null;
  const event = moderation.historial.find(
    (e) => !moderation.negocio || e.negocio_id === moderation.negocio.id,
  );
  return (
    <section className={`business-notice notice-${state}`} role="status">
      <div>
        <strong>
          {state === "restringido"
            ? "Registro de negocios restringido"
            : `Tu negocio está ${state}`}
        </strong>
        <p>
          {event?.motivo ||
            "Consulta el historial de moderación para conocer los detalles."}
        </p>
        {event?.fecha && (
          <p>
            <small>
              Registrado el {new Date(`${event.fecha}Z`).toLocaleString()}
            </small>
          </p>
        )}
        <small>
          {state === "suspendido"
            ? "Puedes corregir tu información y solicitar revisión."
            : state === "archivado"
              ? "Tus datos se conservan en modo de solo lectura. Puedes solicitar restauración."
              : state === "eliminado"
                ? "No se puede recuperar el negocio eliminado. Necesitas autorización para registrar otro."
                : "Puedes solicitar autorización desde Estado y solicitudes."}
        </small>
      </div>
      <Link to="/estado-negocio">Ver decisión y solicitudes ↗</Link>
    </section>
  );
}
