import { Link } from "react-router-dom";
import { useLab } from "../context";

export default function Welcome() {
  const { user, ready } = useLab();
  return (
    <main className="welcome-screen">
      <header className="welcome-header">
        <Link to="/" className="welcome-wordmark">
          Design Lab<span>Hecho para descubrir</span>
        </Link>
        <span className="welcome-location">Tu comunidad, más cerca.</span>
      </header>
      <section className="welcome-content" aria-labelledby="welcome-title">
        <span className="welcome-badge">
          DESCUBRE · CONECTA · APOYA LO LOCAL
        </span>
        <div className="welcome-mark" aria-hidden="true">
          <svg viewBox="0 0 80 80" fill="none">
            <path
              d="M40 69S17 49 17 30a23 23 0 0 1 46 0C63 49 40 69 40 69Z"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle
              cx="40"
              cy="30"
              r="11"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M40 12v6m0 24v6M22 30h6m24 0h6"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 id="welcome-title">
          Design <span>Lab</span>
        </h1>
        <h2>
          Lo mejor de tu barrio.
          <br />
          Más cerca de ti.
        </h2>
        <p>
          Negocios, productos e historias por descubrir.
          <br />
          Conecta con tu comunidad cerca de TECBA.
        </p>
        <Link className="welcome-login" to="/login">
          Iniciar sesión
        </Link>
        <p className="welcome-register">
          ¿Es tu primera visita? <Link to="/registro">Crea tu cuenta</Link>
        </p>
        {ready && user && (
          <small className="welcome-session">
            Tu sesión sigue activa. Al continuar entrarás con tu cuenta.
          </small>
        )}
      </section>
      <footer className="welcome-footer">
        <span>© {new Date().getFullYear()} Design Lab</span>
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
