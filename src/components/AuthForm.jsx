import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useLab } from "../context";
import "../styles/login.css";
export default function AuthForm({ register = false }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
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
      setUser(
        await api(`/auth/${register ? "register" : "login"}`, {
          method: "POST",
          body,
        }),
      );
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <h1>{register ? "Crear una cuenta" : "Iniciar sesión"}</h1>
      <p>Administra tus negocios en Design Lab.</p>
      <form onSubmit={submit}>
        {register && (
          <label>
            Nombre completo
            <input
              name="nombre"
              autoComplete="name"
              minLength="2"
              maxLength="120"
              required
            />
          </label>
        )}
        <label>
          Correo electrónico
          <input
            name="correo"
            type="email"
            autoComplete="email"
            maxLength="254"
            required
          />
        </label>
        <label>
          Contraseña
          <input
            name="contrasena"
            type="password"
            minLength={register ? 12 : 1}
            maxLength="128"
            autoComplete={register ? "new-password" : "current-password"}
            required
          />
        </label>
        {register && (
          <>
            <small>Usa al menos 12 caracteres.</small>
            <label>
              Confirmar contraseña
              <input
                name="confirmar"
                type="password"
                autoComplete="new-password"
                required
              />
            </label>
          </>
        )}
        <button disabled={busy}>
          {busy ? "Procesando…" : register ? "Registrarse" : "Iniciar sesión"}
        </button>
        {message && <p role="alert">{message}</p>}
      </form>
      <p>
        <Link to={register ? "/login" : "/registro"}>
          {register ? "Ya tengo una cuenta" : "Crear una cuenta"}
        </Link>
      </p>
    </main>
  );
}
