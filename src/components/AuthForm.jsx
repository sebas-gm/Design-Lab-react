import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useLab } from "../context";
import { accountHome } from "../navigation";
import NavishopIcon from "./NavishopIcon";
import "../styles/login.css";
export default function AuthForm({ register = false }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { setUser } = useLab();
  const navigate = useNavigate(),
    location = useLocation();
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (register && form.get("contrasena") !== form.get("confirmar")) {
      setMessage("Las contraseñas no coinciden");
      return;
    }
    setBusy(true);
    setMessage("");
    const body = {
      correo: form.get("correo"),
      contrasena: form.get("contrasena"),
    };
    if (register) body.nombre = form.get("nombre");
    try {
      const account = await api(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body,
      });
      setUser(account);
      navigate(location.state?.from || accountHome(account), { replace: true });
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <Link to="/" className="auth-brand" aria-label="Navishop, volver a la bienvenida">
        <NavishopIcon className="auth-brand-icon" />
        <span><strong>Navishop</strong><small>Conecta con tu comunidad</small></span>
      </Link>
      <section className="login" aria-labelledby="auth-title">
      <Link to="/" className="entry-back">
        <AuthIcon name="back" /> Volver a la bienvenida
      </Link>
      <h1 id="auth-title">{register ? "Crear una cuenta" : "Iniciar sesión"}</h1>
      <p>{register ? "Únete a Navishop y descubre lo mejor de tu comunidad." : "Descubre negocios, videos y promociones."}</p>
      <form onSubmit={submit} aria-busy={busy}>
        {register && (
          <label htmlFor="auth-name">
            Nombre completo
            <span className="auth-field"><AuthIcon name="user" />
            <input
              id="auth-name"
              name="nombre"
              autoComplete="name"
              minLength="2"
              maxLength="120"
              required
              disabled={busy}
              placeholder="Tu nombre completo"
            />
            </span>
          </label>
        )}
        <label htmlFor="auth-email">
          Correo electrónico
          <span className="auth-field"><AuthIcon name="mail" />
          <input
            id="auth-email"
            name="correo"
            type="email"
            autoComplete="email"
            maxLength="254"
            required
            disabled={busy}
            placeholder="tucorreo@ejemplo.com"
          />
          </span>
        </label>
        <label htmlFor="auth-password">
          Contraseña
          <span className="auth-field"><AuthIcon name="lock" />
          <input
            id="auth-password"
            name="contrasena"
            type={showPassword ? "text" : "password"}
            minLength={register ? 12 : 1}
            maxLength="128"
            autoComplete={register ? "new-password" : "current-password"}
            required
            disabled={busy}
            placeholder={register ? "Crea una contraseña segura" : "Tu contraseña"}
            aria-describedby={register ? 'auth-password-help' : undefined}
          />
          <button className="auth-reveal" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} aria-controls="auth-password"><AuthIcon name={showPassword ? 'eye-off' : 'eye'} /></button>
          </span>
        </label>
        {register && (
          <>
            <small className="auth-password-help" id="auth-password-help"><AuthIcon name="info" />Usa al menos 12 caracteres.</small>
            <label htmlFor="auth-confirmation">
              Confirmar contraseña
              <span className="auth-field"><AuthIcon name="lock" />
              <input
                id="auth-confirmation"
                name="confirmar"
                type={showConfirmation ? 'text' : 'password'}
                maxLength="128"
                autoComplete="new-password"
                required
                disabled={busy}
                placeholder="Repite tu contraseña"
              />
              <button className="auth-reveal" type="button" onClick={() => setShowConfirmation(!showConfirmation)} aria-label={showConfirmation ? 'Ocultar confirmación' : 'Mostrar confirmación'} aria-pressed={showConfirmation} aria-controls="auth-confirmation"><AuthIcon name={showConfirmation ? 'eye-off' : 'eye'} /></button>
              </span>
            </label>
          </>
        )}
        <button className="auth-submit" disabled={busy}>
          {busy ? "Procesando…" : register ? "Registrarse" : "Iniciar sesión"}
        </button>
        {message && <p className="auth-error" role="alert">{message}</p>}
      </form>
      <div className="auth-switch">
        <p>{register ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?'}</p>
        <Link className={register ? 'auth-login-link' : 'auth-register-link'} to={register ? "/login" : "/registro"} state={location.state}>
          {register ? "Iniciar sesión" : "Crear una cuenta"}
        </Link>
      </div>
      </section>
    </main>
  );
}

function AuthIcon({ name }) {
  const paths = {
    back: 'M19 12H5m6-6-6 6 6 6',
    mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
    lock: 'M5 10h14v11H5V10Zm3 0V6a4 4 0 0 1 8 0v4m-4 4v3',
    user: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    'eye-off': 'm3 3 18 18M9 5.5A10 10 0 0 1 12 5c6 0 10 7 10 7a21 21 0 0 1-3 4M6 6a21 21 0 0 0-4 6s4 7 10 7a11 11 0 0 0 5-1M10 10a3 3 0 0 0 4 4',
    info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
