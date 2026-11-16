import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useConfirm } from '../confirmation';
import { formatBusinessDays } from '../businessDays';
import FormModal from './FormModal';
import '../styles/publication.css';

export default function AdminPublications() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]), [filter, setFilter] = useState('pendiente'), [loading, setLoading] = useState(true), [error, setError] = useState(''), [decision, setDecision] = useState(null), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => api('/admin/publicaciones').then((rows) => { if (active) { setItems(rows); setError(''); } }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    load(); window.addEventListener('focus', load); window.addEventListener('navishop:publications-refresh', load);
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); window.removeEventListener('navishop:publications-refresh', load); };
  }, []);
  const labels = { pendiente: 'Pendiente', aprobado: 'Aprobado', correcciones: 'Correcciones solicitadas', rechazado: 'Rechazado', cerrada: 'Cerrada' };
  const verbs = { aprobar: 'Aprobar publicación', correcciones: 'Pedir correcciones', rechazar: 'Rechazar publicación' };
  async function save(event) {
    event.preventDefault();
    const motivo = new FormData(event.currentTarget).get('motivo');
    if (!(await confirm(`${verbs[decision.type]}. Se notificará al propietario.`, 'save'))) return;
    setBusy(true); setError('');
    try { await api(`/admin/publicaciones/${decision.item.id}`, { method: 'PATCH', body: { decision: decision.type, motivo, version: decision.item.version } }); setItems(await api('/admin/publicaciones')); setDecision(null); window.dispatchEvent(new Event('navishop:moderation-changed')); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const visible = items.filter((item) => filter === 'todos' || item.estado === filter);
  return <section className="admin-publications"><div className="publication-toolbar"><label>Mostrar<select value={filter} onChange={(e) => setFilter(e.target.value)}>{['pendiente', 'aprobado', 'correcciones', 'rechazado', 'cerrada', 'todos'].map((state) => <option key={state} value={state}>{labels[state] || 'Todos'}</option>)}</select></label><span>{visible.length} solicitudes</span></div><p className="publication-help">Revisa la fachada, los datos de contacto y las coincidencias antes de aprobar. Las alertas son orientativas y no bloquean automáticamente.</p>{error && <p role="alert">{error}</p>}{loading && <p role="status">Cargando solicitudes…</p>}{!loading && !visible.length && <p>No hay solicitudes en esta sección.</p>}
    {visible.map((item) => <article key={item.id} className="publication-card"><header><div><span>{labels[item.estado]}</span><h2>{item.propuesta.nombre}</h2><p>{item.propietario} · {item.correo_propietario}</p></div><strong>{item.estado_negocio === 'activo' ? 'Cambios sobre ficha publicada' : 'Primera publicación'}</strong></header><div className="publication-preview">{item.propuesta.imagen && <a href={item.propuesta.imagen} target="_blank" rel="noreferrer"><img src={item.propuesta.imagen} alt={`Fachada propuesta de ${item.propuesta.nombre}`} loading="lazy" /></a>}<div><p>{item.propuesta.descripcion}</p><dl>{[['Categoría', item.propuesta.categoria], ['Dirección', item.propuesta.direccion], ['Teléfono', item.propuesta.telefono], ['Correo', item.propuesta.correo_contacto], ['Días', formatBusinessDays(item.propuesta.dias_atencion)], ['Horario', `${item.propuesta.hora_apertura || 'Sin especificar'} – ${item.propuesta.hora_cierre || 'Sin especificar'}`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Sin especificar'}</dd></div>)}</dl></div></div>{item.estado_negocio === 'activo' && <details><summary>Comparar con la ficha publicada</summary><p><strong>Nombre:</strong> {item.actual.nombre}</p><p><strong>Dirección:</strong> {item.actual.direccion}</p>{item.actual.imagen && <a href={item.actual.imagen} target="_blank" rel="noreferrer">Ver fachada publicada ↗</a>}</details>}
      {item.duplicados.length > 0 && <aside className="publication-duplicates"><strong>Posibles duplicados ({item.duplicados.length})</strong>{item.duplicados.map((match) => <p key={match.id}><Link to={`/admin/negocios?q=${encodeURIComponent(match.nombre)}`}>{match.nombre}</Link> · Coincide: {match.coincidencias.join(', ')}</p>)}</aside>}{item.motivo && <p><strong>Respuesta administrativa:</strong> {item.motivo}</p>}{item.estado === 'pendiente' && <div className="admin-actions">{Object.entries(verbs).map(([key, label]) => <button key={key} onClick={() => { setError(''); setDecision({ item, type: key }); }}>{label}</button>)}</div>}
    </article>)}
    {decision && <FormModal title={verbs[decision.type]} onClose={() => setDecision(null)}>{(close) => <form className="publication-form" onSubmit={save}><fieldset disabled={busy}><h3>{decision.item.propuesta.nombre}</h3><label>Motivo visible para el propietario<textarea name="motivo" required minLength={5} maxLength={2000} rows={5} /></label>{error && <p role="alert">{error}</p>}<div className="admin-actions"><button>{busy ? 'Guardando…' : 'Guardar decisión'}</button><button type="button" onClick={close}>Cancelar</button></div></fieldset></form>}</FormModal>}
  </section>;
}
