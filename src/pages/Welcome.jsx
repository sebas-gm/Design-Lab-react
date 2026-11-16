import { Link } from "react-router-dom";
import { useLab } from "../context";
import NavishopIcon from "../components/NavishopIcon";

export default function Welcome() {
  const { user, ready } = useLab();
  return (
    <main className="welcome-screen">
      <header className="welcome-header">
        <Link to="/" className="welcome-wordmark">
          Navishop<span>Hecho para descubrir</span>
        </Link>
        <span className="welcome-location">Tu comunidad, más cerca de ti</span>
      </header>
      <section className="welcome-content" aria-labelledby="welcome-title">
        <span className="welcome-badge">
          DESCUBRE · CONECTA · APOYA LO LOCAL
        </span>
        <NavishopIcon className="welcome-mark" alt="Icono de Navishop" />
        <h1 id="welcome-title">
          Navi<span>shop</span>
        </h1>
        <h2>
          Lo mejor de tu barrio.
          <br />
          Más cerca de ti.
        </h2>
        <p>
          Negocios, productos e historias por descubrir.
          <br />
          Conecta con tu comunidad.
        </p>
        <div className="welcome-actions">
          <Link className="welcome-login" to="/login">
            Iniciar sesión
          </Link>
          <p className="welcome-register">
            ¿Es tu primera visita? <Link to="/registro">Crea tu cuenta</Link>
          </p>
        </div>
        {ready && user && (
          <small className="welcome-session">
            Tu sesión sigue activa. Al continuar entrarás con tu cuenta.
          </small>
        )}
      </section>
      <footer className="welcome-footer">
        <span>© {new Date().getFullYear()} Navishop</span>
        <a
          href="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab"
          target="_blank"
          rel="noreferrer"
        >
          Fotografía urbana · Unsplash
        </a>
      </footer>
    </main>
  );
}
