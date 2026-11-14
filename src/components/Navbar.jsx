import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useLab } from "../context";
import { api } from "../api";
import "../styles/navbar.css";
export default function Navbar() {
  const { user, setUser } = useLab();
  const [error, setError] = useState("");
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <nav className="navbar" aria-label="Navegación principal">
        <NavLink to="/" className="navbar-logo">
          Design Lab
        </NavLink>
        <div className="navbar-links">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          <NavLink to="/negocios">Negocios</NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard">Mi panel</NavLink>
              <button onClick={logout}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Iniciar sesión</NavLink>
              <NavLink to="/registro" className="btn-registro">
                Registrarse
              </NavLink>
            </>
          )}
        </div>
      </nav>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
