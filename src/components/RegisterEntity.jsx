import { useNavigate, Navigate, Link } from "react-router-dom";
import EntityForm from "./EntityForm";
import { useLab } from "../context";
import RegistrationWait from "./RegistrationWait";
import { registrationWaiting } from "../registration";
export default function RegisterEntity({ kind }) {
  const navigate = useNavigate();
  const { user, negocios, loading, error, refresh } = useLab();
  if (kind === "negocios" && registrationWaiting(user))
    return <main className="registrar-negocio"><RegistrationWait account={user} /></main>;
  if (kind === "negocios" && user.puede_registrar === false)
    return (
      <main className="registrar-negocio">
        <h1>Registro pendiente de autorización</h1>
        <p>
          La administración debe autorizarte antes de registrar otro negocio.
        </p>
        <Link to="/estado-negocio">Ver decisión y solicitar autorización</Link>
      </main>
    );
  if (
    kind === "productos" &&
    negocios.some((n) => n.owner_id === user.id && n.estado === "archivado")
  )
    return (
      <main className="registrar-negocio">
        <h1>Negocio archivado</h1>
        <p>
          El catálogo es de solo lectura hasta que se apruebe su restauración.
        </p>
        <Link to="/estado-negocio">Solicitar restauración</Link>
      </main>
    );
  if (kind === "negocios" && loading)
    return <main className="registrar-negocio">Comprobando tu negocio…</main>;
  if (kind === "negocios" && error)
    return (
      <main className="registrar-negocio">
        <p role="alert">{error}</p>
        <button onClick={refresh}>Reintentar</button>
      </main>
    );
  if (kind === "negocios" && negocios.some((n) => n.owner_id === user.id))
    return <Navigate to="/administrar-negocios" replace />;
  return (
    <main className="registrar-negocio">
      <h1>Registrar {kind === "negocios" ? "negocio" : "producto"}</h1>
      {kind === "negocios" && user.tipo_cuenta === "personal" && (
        <p>
          Al guardar tu primer negocio se activará tu cuenta de negocios. Podrás
          seguir explorando Navishop como siempre.
        </p>
      )}
      <p>
        {kind === "negocios"
          ? "Haz que más personas descubran tu negocio."
          : "Agrega un producto a tu catálogo."}
      </p>
      <EntityForm kind={kind} onSaved={() => navigate("/dashboard")} />
    </main>
  );
}
