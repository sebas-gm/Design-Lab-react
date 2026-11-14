import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLab } from "../context";
import { api } from "../api";
import ImagePicker from "../components/ImagePicker";
import { useConfirm } from "../confirmation";
import LegacyImport from "../components/LegacyImport";
import "../styles/profile.css";

function ProfileIcon({ name }) {
  const paths = {
    user: "M20 21v-2a7 7 0 0 0-14 0v2M17 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    edit: "m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z",
    camera: "M3 7h5l2-3h5l2 3h4v14H3V7Zm13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    preferences: "M3 6h7m5 0h6M3 12h12m5 0h1M3 18h2m5 0h11M10 3v6m5 0v6M5 15v6",
    privacy: "M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Zm-4 10 3 3 5-6",
    security: "M6 10V7a6 6 0 0 1 12 0v3M3 10h18v12H3V10Zm9 4v4",
    shop: "M4 10v11h16V10M2 10l3-7h14l3 7M8 21v-7h8v7M2 10h20",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function Setting({ icon, title, description, children }) {
  return (
    <details className="profile-setting">
      <summary>
        <span className="setting-icon">
          <ProfileIcon name={icon} />
        </span>
        <span className="setting-copy">
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <span className="setting-arrow" aria-hidden="true">
          ›
        </span>
      </summary>
      <div className="setting-content">{children}</div>
    </details>
  );
}

export default function MiCuenta() {
  const confirm = useConfirm();
  const { user, setUser } = useLab();
  const business = user.tipo_cuenta === "negocios";
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  async function saveProfile(event) {
    event.preventDefault();
    const nombre = new FormData(event.currentTarget).get("nombre");
    if (
      !(await confirm("Se guardarán el nombre y la foto de tu perfil.", "save"))
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let avatar = user.avatar || "";
      if (photo) {
        const body = new FormData();
        body.append("file", photo);
        avatar = (await api("/imagenes", { method: "POST", body })).url;
      }
      setUser(
        await api("/auth/profile", {
          method: "PATCH",
          body: { nombre, avatar },
        }),
      );
      setPhoto(null);
      setEditing(false);
      setNotice("Tu perfil se actualizó correctamente.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function preference(value) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setUser(
        await api("/auth/profile", {
          method: "PATCH",
          body: { reducir_movimiento: value },
        }),
      );
      setNotice("Preferencia guardada en tu cuenta.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (!(await confirm('Tendrás que iniciar sesión de nuevo para volver a tu cuenta.', 'logout'))) return;
    setBusy(true);
    setError("");
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <main className="profile-page">
      <header className="profile-heading">
        <span className="profile-title-icon">
          <ProfileIcon name="user" />
        </span>
        <div>
          <h1>Mi cuenta</h1>
          <p>Gestiona tu información personal, seguridad y preferencias.</p>
        </div>
      </header>
      <section className="profile-banner" aria-label="Tu perfil">
        <div className="profile-photo">
          <span className="avatar-frame">
            {user.avatar ? (
              <img src={user.avatar} alt={`Foto de ${user.nombre}`} />
            ) : (
              <svg viewBox="0 0 80 80" aria-hidden="true">
                <circle cx="40" cy="27" r="14" fill="currentColor" />
                <path
                  d="M14 70c0-17 10-26 26-26s26 9 26 26"
                  fill="currentColor"
                />
              </svg>
            )}
          </span>
          <button
            className="avatar-camera"
            onClick={async () => {
              if (
                !editing &&
                !(await confirm("Vas a editar tu foto de perfil.", "edit"))
              )
                return;
              setEditing(true);
              setError("");
            }}
            aria-label="Cambiar foto de perfil"
          >
            <ProfileIcon name="camera" />
          </button>
        </div>
        <div className="profile-identity">
          <h2>{user.nombre}</h2>
          <p>{user.correo}</p>
          <span className="account-type">
            <ProfileIcon name={business ? "shop" : "user"} />
            Cuenta {business ? "de negocios" : "personal"}
          </span>
        </div>
        <button
          className="edit-profile-button"
          aria-expanded={editing}
          aria-controls="profile-editor"
          onClick={async () => {
            if (
              !editing &&
              !(await confirm(
                "Vas a editar la información de tu perfil.",
                "edit",
              ))
            )
              return;
            setEditing(!editing);
            setPhoto(null);
            setError("");
          }}
          disabled={busy}
        >
          <ProfileIcon name="edit" />
          Editar perfil
        </button>
      </section>

      {editing && (
        <section id="profile-editor" className="profile-editor">
          <h2>Editar perfil</h2>
          <form className="entity-form" onSubmit={saveProfile}>
            <label>
              Nombre
              <input
                name="nombre"
                defaultValue={user.nombre}
                minLength="2"
                maxLength="120"
                autoComplete="name"
                disabled={busy}
                required
              />
            </label>
            <label>
              Correo electrónico
              <input type="email" value={user.correo} readOnly />
            </label>
            <small>
              El correo identifica tu cuenta. Esta edición permite cambiar tu
              nombre y tu foto.
            </small>
            <ImagePicker
              label="Foto de perfil"
              value={photo}
              onChange={setPhoto}
              existing={user.avatar}
              disabled={busy}
            />
            <small>JPG, PNG o WebP · Hasta 5 MB.</small>
            <div className="profile-form-actions">
              <button disabled={busy}>
                {busy ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setPhoto(null);
                  setError("");
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}
      {error && (
        <p className="profile-feedback" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="profile-feedback" role="status">
          {notice}
        </p>
      )}

      <section className="profile-settings" aria-labelledby="settings-title">
        <h2 id="settings-title">Configuración de la cuenta</h2>
        <Setting
          icon="preferences"
          title="Preferencias"
          description="Personaliza tu experiencia en Design Lab."
        >
          <label className="motion-preference">
            <input
              type="checkbox"
              checked={Boolean(user.reducir_movimiento)}
              disabled={busy}
              onChange={(e) => preference(e.target.checked)}
            />
            <span>
              Reducir animaciones
              <small>
                Minimiza las transiciones y los movimientos de la interfaz. Se
                guarda en tu cuenta.
              </small>
            </span>
          </label>
        </Setting>
        <Setting
          icon="privacy"
          title="Privacidad"
          description="Conoce qué información compartes en la plataforma."
        >
          <p>
            Tu correo de acceso y el tipo de cuenta no se incluyen en el
            catálogo de negocios.
          </p>
          <p>
            Si tienes un negocio, su dirección, contacto, horarios, productos y
            videos se muestran a los usuarios registrados. Puedes actualizar
            esos datos desde Mi negocio.
          </p>
          <p>
            Las imágenes que subes se guardan en el servidor y pueden verse por
            su enlace.
          </p>
        </Setting>
        <Setting
          icon="security"
          title="Seguridad"
          description="Consulta tu acceso y gestiona tu sesión."
        >
          <p>
            Has iniciado sesión con <strong>{user.correo}</strong>. Tu
            contraseña se almacena protegida y la sesión caduca después de ocho
            horas.
          </p>
          <p>Si utilizas un equipo compartido, cierra tu sesión al terminar.</p>
          <button disabled={busy} onClick={logout}>
            Cerrar esta sesión
          </button>
        </Setting>
        <Setting
          icon="shop"
          title={business ? "Mi cuenta de negocios" : "Cuenta de negocios"}
          description={
            business
              ? "Administra tu negocio y sus publicaciones."
              : "Da el siguiente paso y publica tu emprendimiento."
          }
        >
          <p>
            {business
              ? "Tu cuenta permite administrar un solo negocio con sus productos, promociones, horarios y videos."
              : "Activa tu cuenta de negocios al completar y guardar el registro de tu primer negocio."}
          </p>
          <Link
            className="purple-link"
            to={business ? "/administrar-negocios" : "/activar-negocio"}
          >
            {business ? "Administrar mi negocio" : "Registrar mi negocio"} ↗
          </Link>
        </Setting>
      </section>
      <details className="profile-legacy">
        <summary>Importar datos anteriores</summary>
        <LegacyImport />
      </details>
    </main>
  );
}
