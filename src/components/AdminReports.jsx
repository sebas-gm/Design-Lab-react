import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useConfirm } from '../confirmation';
import FormModal from './FormModal';
import { reportReasons, reportStatus } from '../reportReasons';
import '../styles/reports.css';

export default function AdminReports() {
  const confirm = useConfirm();
  const [reports, setReports] = useState([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [filter, setFilter] = useState('abiertos'), [editing, setEditing] = useState(null);
  useEffect(() => {
    let active = true;
    const load = () => api('/admin/reportes').then((items) => { if (active) { setReports(items); setError(''); } }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    load(); window.addEventListener('focus', load); window.addEventListener('navishop:reports-refresh', load);
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); window.removeEventListener('navishop:reports-refresh', load); };
  }, []);
  async function update(item, body) {
    if (!(await confirm(body.estado === 'en_revision' ? '¿Quieres marcar este reporte en revisión?' : 'Se guardará la respuesta y se notificará a quien reportó. Esta acción no cambia automáticamente el negocio ni el producto.', 'save'))) return;
    setBusy(true); setError('');
    try { await api(`/admin/reportes/${item.id}`, { method: 'PATCH', body }); setReports(await api('/admin/reportes')); setEditing(null); window.dispatchEvent(new Event('navishop:moderation-changed')); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const visible = reports.filter((r) => filter === 'todos' || (filter === 'abiertos' ? r.estado !== 'resuelto' : r.estado === filter));
  return <section className="admin-reports"><div className="report-toolbar"><label>Mostrar<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="abiertos">Pendientes y en revisión</option><option value="pendiente">Pendientes</option><option value="en_revision">En revisión</option><option value="resuelto">Resueltos</option><option value="todos">Todos</option></select></label><span>{visible.length} reportes</span></div><p className="report-help">Investiga cada caso antes de aplicar medidas desde Negocios o Contenido. Resolver el reporte no suspende ni elimina elementos automáticamente.</p>
    {error && <p role="alert" className="report-feedback">{error}</p>}{loading && <p role="status">Cargando reportes…</p>}{!loading && !visible.length && <p>No hay reportes en esta sección.</p>}
    {visible.map((item) => <article className="report-card" key={item.id}><div className="report-card-heading"><h2>#{item.id} · {item.nombre_objetivo}</h2><span className="report-status">{reportStatus[item.estado]}</span></div><p><strong>{reportReasons.find(([key]) => key === item.motivo)?.[1]}</strong> · {item.tipo}</p><p className="report-text">{item.explicacion}</p><small>Reportado por {item.reportante} ({item.correo_reportante}) · {new Date(`${item.fecha}Z`).toLocaleString('es')}</small>{!item.objetivo_existe && <p>El elemento fue eliminado. Se conserva el reporte para su revisión.</p>}
      <div className="admin-actions report-actions"><Link to={`/negocios/${item.negocio_id}`}>Consultar negocio</Link><Link to={item.tipo === 'producto' ? '/admin/contenido' : '/admin/negocios'}>Gestionar elemento</Link>{item.estado === 'pendiente' && <button disabled={busy} onClick={() => update(item, { estado: 'en_revision' })}>Marcar en revisión</button>}{item.estado !== 'resuelto' && <button disabled={busy} onClick={() => setEditing(item.id)}>Resolver</button>}</div>
      {item.estado === 'resuelto' && <div className="report-response"><strong>{item.resultado === 'medidas' ? 'Resuelto con medidas' : 'Descartado'}</strong><p>{item.respuesta}</p></div>}
      {editing === item.id && item.estado !== 'resuelto' && <FormModal title={`Resolver reporte #${item.id}`} onClose={() => setEditing(null)}>{(close) => <form autoComplete="off" className="report-form" onSubmit={(e) => { e.preventDefault(); update(item, { ...Object.fromEntries(new FormData(e.currentTarget)), estado: 'resuelto' }); }}><fieldset disabled={busy}><label>Resultado<select name="resultado" required><option value="">Selecciona el resultado</option><option value="medidas">Se tomaron medidas</option><option value="descartado">Descartar reporte</option></select></label><label>Respuesta visible para quien reportó<textarea name="respuesta" required minLength={5} maxLength={2000} rows={4} /></label><div className="admin-actions"><button>Guardar resolución</button><button type="button" onClick={close}>Cancelar</button></div></fieldset>{error && <p role="alert">{error}</p>}</form>}</FormModal>}
    </article>)}
  </section>;
}
