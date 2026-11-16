import { Navigate, useLocation } from "react-router-dom";
import { useLab } from "../context";
import { accountHome } from "../navigation";
export default function ProtectedRoute({
  children,
  business = false,
  admin = false,
}) {
  const { user, ready, negocios, moderation } = useLab();
  const location = useLocation();
  if (!ready) return <main>Cargando sesión…</main>;
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (admin && !user.is_admin)
    return <Navigate to={accountHome(user)} replace />;
  const own = negocios.find(n => n.owner_id === user.id) || moderation?.negocio;
  if (own?.eliminacion_programada && !user.is_admin && (business || location.pathname === '/registrar-negocio') && location.pathname !== '/administrar-negocios') return <Navigate to="/estado-negocio" replace />;
  if (business && user.tipo_cuenta !== "negocios")
    return <Navigate to="/activar-negocio" replace />;
  return children;
}
