import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLab } from '../context';
import { api } from '../api';
import { reportReasons, reportStatus } from '../reportReasons';
import '../styles/reports.css';

export default function Reports({ create = false }) {
  const { negocios, productos, user } = useLab();
  const [params] = useSearchParams();
  const tipo = params.get('tipo'), id = Number(params.get('id'));
  const target = (tipo === 'negocio' ? negocios : tipo === 'producto' ? productos : []).find((item) => item.id === id);
  const business = tipo === 'negocio' ? target : negocios.find((b) => b.id === target?.negocioId);
  const [items, setItems] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false), [sent, setSent] = useState(false), [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = () => api('/mis-reportes').then((rows) => { if (active) { setItems(rows); setError(''); } }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    if (!create) { load(); window.addEventListener('focus', load); }
    return () => { active = false; window.removeEventListener('focus', load); };
  }, [create]);
  async function send(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError('');
    try { await api('/reportes', { method: 'POST', body: { ...values, tipo, objetivo_id: id } }); setSent(true); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const eligible = target && business?.estado === 'activo' && business.owner_id !== user.id;
  return <main className="reports-page"><header className="reports-heading"><div><h1>{create ? 'Enviar un reporte' : 'Mis reportes'}</h1><p>{create ? 'Describe el problema para que la administración pueda revisarlo.' : 'Consulta el estado y la respuesta de tus reportes.'}</p></div><Link to={create ? '/mis-reportes' : '/negocios'}>{create ? 'Mis reportes →' : 'Explorar negocios →'}</Link></header>
    {error && <p role="alert" className="report-feedback">{error}</p>}
    {create ? sent ? <section className="report-card" role="status"><h2>Reporte enviado</h2><p>La administración lo revisará. No se aplican suspensiones automáticas.</p><Link to="/mis-reportes">Consultar seguimiento →</Link></section> : eligible ? <section className="report-card"><h2>{target.nombre}</h2><p>La identidad de quien reporta solo es visible para la administración.</p><form className="report-form" onSubmit={send}><fieldset disabled={busy}><label>Motivo<select name="motivo" required><option value="">Selecciona un motivo</option>{reportReasons.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Explica lo ocurrido<textarea name="explicacion" required minLength={15} maxLength={2000} rows={6} placeholder="Indica qué información no coincide o qué ocurrió. No incluyas contraseñas ni datos bancarios." /></label><small>Entre 15 y 2000 caracteres. Esta primera versión no admite archivos adjuntos.</small><button>{busy ? 'Enviando…' : 'Enviar reporte'}</button></fieldset></form></section> : <section className="report-card"><p>Este elemento no está disponible para reportarlo o pertenece a tu cuenta.</p><Link to="/negocios">Volver a negocios</Link></section> : <>{loading && <p role="status">Cargando reportes…</p>}{!loading && !items.length && !error && <section className="report-card"><p>Aún no has enviado reportes.</p></section>}{items.map((item) => <section key={item.id} className="report-card"><span className="report-status">{reportStatus[item.estado]}</span><h2>{item.nombre_objetivo}</h2><p>{reportReasons.find(([key]) => key === item.motivo)?.[1]}</p><p className="report-text">{item.explicacion}</p><small>Reporte #{item.id} · {new Date(`${item.fecha}Z`).toLocaleString('es')}</small>{item.estado === 'resuelto' && <div className="report-response"><strong>{item.resultado === 'medidas' ? 'Resuelto con medidas' : 'Reporte descartado'}</strong><p>{item.respuesta}</p></div>}</section>)}</>}
  </main>;
}
