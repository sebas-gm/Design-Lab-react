
import { NavLink } from 'react-router-dom';
import '../styles/navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-logo">
        Design Lab
      </NavLink>

      <div className="navbar-links">
        <NavLink to="/" end>Inicio</NavLink>
        <NavLink to="/negocios">Negocios</NavLink>
        <NavLink to="/login">Iniciar sesión</NavLink>
        <NavLink to="/registro" className="btn-registro">
          Registrarse
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
