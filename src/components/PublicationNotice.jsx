import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLab } from '../context';
import { api } from '../api';
import { useConfirm } from '../confirmation';
import '../styles/publication.css';

export default function PublicationNotice() {
  const { publication, user, negocios, refresh } = useLab();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (user?.is_admin || !publication || publication.estado === 'aprobado') return null;
  const business = negocios.find((b) => b.id === publication.negocio_id);
  if (!business) return null;
  const labels = { pendiente: 'Publicación pendiente de revisión', correcciones: 'La administración solicita correcciones', rechazado: 'Solicitud de publicación rechazada', cerrada: 'Solicitud cerrada por cambios administrativos' };
  async function resend() {
    if (!(await confirm('Se enviará nuevamente tu propuesta para revisión. Puedes enviar hasta 3 solicitudes en 24 horas.', 'save'))) return;
    setBusy(true); setError('');
    try { await api(`/negocios/${business.id}/solicitar-publicacion`, { method: 'POST' }); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <section className="publication-notice" role="status"><div><strong>{labels[publication.estado] || publication.estado}</strong><p>{publication.motivo || 'Revisaremos la información antes de publicarla. Puedes completar tu negocio y preparar tus productos.'}</p><p>{business.estado === 'activo' ? 'La ficha anterior continúa publicada. Los cambios propuestos no se mostrarán hasta aprobarlos.' : 'Este negocio aún no aparece para los visitantes.'}</p><small>Revisa los datos antes de reenviar. Puedes enviar hasta 3 solicitudes en 24 horas.</small>{error && <p role="alert">{error}</p>}</div><div className="publication-notice-actions"><Link to="/administrar-negocios">Revisar y corregir mis datos →</Link>{['correcciones', 'rechazado'].includes(publication.estado) && <button disabled={busy} onClick={resend}>{busy ? 'Enviando…' : 'Reenviar para revisión'}</button>}</div></section>;
}
