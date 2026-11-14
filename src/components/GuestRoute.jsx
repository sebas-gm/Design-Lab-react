import { Navigate } from "react-router-dom";
import { useLab } from "../context";
export default function GuestRoute({ children }) {
  const { user, ready } = useLab();
  if (!ready) return <main>Cargando sesión…</main>;
  return user ? <Navigate to="/" replace /> : children;
}
