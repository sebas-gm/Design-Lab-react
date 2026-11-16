import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useLab } from '../context';
import { useConfirm } from '../confirmation';
import '../styles/pendingDeletion.css';
import { deletionDate } from '../businessDeletion';

export default function PendingBusinessDeletion({ business }) {
  const { refresh } = useLab();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(() => Date.now() >= new Date(`${business.eliminacion_programada}Z`).getTime());
  useEffect(() => {
    const remaining = new Date(`${business.eliminacion_programada}Z`).getTime() - Date.now();
    const timer = setTimeout(() => setExpired(true), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [business.eliminacion_programada]);
  async function restore() {
    if (!(await confirm(`Se cancelará la eliminación de “${business.nombre}” y recuperarás sus datos. Se conservarán las restricciones administrativas que tuviera.`, 'save'))) return;
    setBusy(true); setError('');
    try {
      await api(`/negocios/${business.id}/restaurar`, { method: 'POST' });
      await refresh();
      navigate('/administrar-negocios', { replace: true });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="pending-business-deletion" aria-labelledby="pending-deletion-title">
    <span className="pending-deletion-badge">Eliminación pendiente · 15 días</span>
    <h2 id="pending-deletion-title">Todavía puedes recuperar tu negocio</h2>
    <h3>{business.nombre}</h3>
    <p>Tu negocio y su contenido están ocultos para los visitantes. Conservamos tus productos, promociones, enlaces de video, horarios e imágenes durante el plazo de recuperación.</p>
    <div className="pending-deletion-date"><strong>Eliminación definitiva</strong><time dateTime={`${business.eliminacion_programada}Z`}>{deletionDate(business.eliminacion_programada)} · hora de Bolivia</time></div>
    <p>Hasta esa fecha puedes restaurarlo. Mientras tanto no puedes editarlo ni registrar otro negocio. Si no lo restauras, al finalizar el plazo se borrará su contenido y tu cuenta volverá a personal, sin otra espera de 15 días.</p>
    {business.estado_antes_eliminacion && business.estado_antes_eliminacion !== 'activo' && <p className="pending-deletion-restriction">Estado que se conservará al restaurarlo: <strong>{business.estado_antes_eliminacion}</strong>. Restaurar no levanta suspensiones ni aprobaciones pendientes.</p>}
    {error && <p role="alert">{error}</p>}
    <button type="button" disabled={busy} onClick={expired ? refresh : restore}>{busy ? 'Restaurando…' : expired ? 'Actualizar estado del negocio' : 'Restaurar negocio'}</button>
  </section>;
}
