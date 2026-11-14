import { Navigate, useLocation } from 'react-router-dom';
import { useLab } from '../context';
export default function ProtectedRoute({ children }) {
  const { user, ready } = useLab();
  const location = useLocation();
  if (!ready) return <main>Cargando sesión…</main>;
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
