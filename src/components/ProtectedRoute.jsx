import { Navigate, useLocation } from "react-router-dom";
import { useLab } from "../context";
import { accountHome } from "../navigation";
export default function ProtectedRoute({
  children,
  business = false,
  admin = false,
}) {
  const { user, ready } = useLab();
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
  if (business && user.tipo_cuenta !== "negocios")
    return <Navigate to="/activar-negocio" replace />;
  return children;
}
