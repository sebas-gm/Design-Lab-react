
import { useState } from 'react';
import '../styles/register.css';

function Register() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mensaje, setMensaje] = useState('');

  function registrar(e) {
    e.preventDefault();

    if (contrasena !== confirmar) {
      setMensaje('Las contraseñas no coinciden');
      return;
    }

    setMensaje('Formulario validado correctamente');
  }

  return (
    <main className="registro">
      <h1>Crear una cuenta</h1>
      <p>Regístrate para administrar tu negocio.</p>

      <form onSubmit={registrar}>
        <label>Nombre completo</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />

        <label>Correo electrónico</label>
        <input
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />

        <label>Contraseña</label>
        <input
          type="password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          required
          minLength={6}
        />

        <label>Confirmar contraseña</label>
        <input
          type="password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
          minLength={6}
        />

        <button type="submit">Registrarse</button>

        {mensaje && <p>{mensaje}</p>}
      </form>
    </main>
  );
}

export default Register;
