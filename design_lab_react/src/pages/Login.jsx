
import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/login.css';

function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mensaje, setMensaje] = useState('');

  function iniciarSesion(e) {
    e.preventDefault();

    if (correo === '' || contrasena === '') {
      setMensaje('Completa todos los campos');
      return;
    }

    setMensaje('Formulario validado correctamente');
  }

  return (
    <main className="login">
      <h1>Iniciar sesión</h1>
      <p>Ingresa a tu cuenta de Design Lab.</p>

      <form onSubmit={iniciarSesion}>
        <label>Correo electrónico</label>
        <input
          type="email"
          placeholder="ejemplo@correo.com"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />

        <label>Contraseña</label>
        <input
          type="password"
          placeholder="Ingresa tu contraseña"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
        />

        <button type="submit">Iniciar sesión</button>

        {mensaje && <p>{mensaje}</p>}
      </form>

      <p>
        ¿No tienes una cuenta? <Link to="/registro">Regístrate aquí</Link>
      </p>
    </main>
  );
}

export default Login;
