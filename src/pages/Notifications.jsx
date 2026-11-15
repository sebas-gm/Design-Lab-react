import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import "../styles/moderation.css";
export default function Notifications() {
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api("/notificaciones")
      .then((data) => {
        setItems(data.items);
        setMore(data.items.length === 20);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function read(item) {
    try {
      await api(`/notificaciones/${item.id}/leida`, { method: "PATCH" });
      setItems((previous) =>
        previous.map((n) => (n.id === item.id ? { ...n, leida: true } : n)),
      );
      window.dispatchEvent(new Event("navishop:moderation-changed"));
    } catch (e) {
      setError(e.message);
    }
  }
  async function next() {
    setBusy(true);
    try {
      const data = await api(`/notificaciones?offset=${items.length}`);
      setItems((previous) => [...previous, ...data.items]);
      setMore(data.items.length === 20);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="videos-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Navishop te informa</span>
          <h1>Notificaciones</h1>
          <p>Decisiones y respuestas sobre tu negocio.</p>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {!items.length && !error && <p>No tienes notificaciones.</p>}
      {items.map((item) => (
        <article
          className={`moderation-card ${!item.leida ? "unread-notice" : ""}`}
          key={item.id}
        >
          <h2>{item.titulo}</h2>
          <p>{item.mensaje}</p>
          <small>{new Date(`${item.fecha}Z`).toLocaleString()}</small>
          <div className="moderation-actions">
            <Link to="/estado-negocio">Ver estado y solicitudes</Link>
            {!item.leida && (
              <button onClick={() => read(item)}>Marcar como leída</button>
            )}
          </div>
        </article>
      ))}
      {more && (
        <button disabled={busy} onClick={next}>
          Ver más notificaciones
        </button>
      )}
    </main>
  );
}
