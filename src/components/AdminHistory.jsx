import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import { activityLabel, activityType, formatHistoryDate } from '../activityHistory';
import '../styles/adminHistory.css';

export default function AdminHistory({ query, onQuery }) {
  const [filters, setFilters] = useState({ action: '', start: '', end: '', order: 'recent', page: 1, size: 10 });
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const params = new URLSearchParams({ ...filters, q: query });
  for (const name of ['action', 'start', 'end']) if (!filters[name]) params.delete(name);
  const search = params.toString();
  const key = `${search}:${version}`;
  const loading = result?.key !== key;
  const data = loading || result?.error ? null : result?.data;
  const error = loading ? '' : result?.error;
  const invalidDates = filters.start && filters.end && filters.start > filters.end;

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await api(`/admin/historial/consulta?${search}`);
        if (active) setResult({ key, data: response });
      } catch (e) {
        if (active) setResult(previous => ({ key, error: e.message, data: previous?.data }));
      }
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [search, key]);
  useEffect(() => {
    const refresh = () => setVersion(value => value + 1);
    window.addEventListener('navishop:history-refresh', refresh);
    return () => window.removeEventListener('navishop:history-refresh', refresh);
  }, []);
  function update(name, value) {
    setFilters(previous => ({ ...previous, [name]: value, page: name === 'page' ? value : 1 }));
  }
  function reset() {
    onQuery('');
    setFilters({ action: '', start: '', end: '', order: 'recent', page: 1, size: 10 });
  }
  async function exportCsv() {
    setExporting(true); setExportError('');
    try {
      const csvParams = new URLSearchParams(search);
      csvParams.set('export', 'true');
      const response = await fetch(`/api/admin/historial/consulta?${csvParams}`, { credentials: 'include' });
      if (!response.ok) throw new Error('No se pudo exportar el historial. Inténtalo nuevamente.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'navishop-historial.csv';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setExportError(e.message); }
    finally { setExporting(false); }
  }
  const startRow = data?.total ? (data.page - 1) * filters.size + 1 : 0;
  const pages = data ? [...new Set([1, data.page - 1, data.page, data.page + 1, data.pages])].filter(n => n >= 1 && n <= data.pages).sort((a, b) => a - b) : [];

  return <section className="activity-history" aria-label="Historial de actividad">
    <div className="history-toolbar"><p>Consulta de solo lectura · Fechas y filtros en horario de Bolivia.</p><button className="history-export" onClick={exportCsv} disabled={loading || !!error || exporting || !data?.total || !!invalidDates}><HistoryIcon name="download" />{exporting ? 'Exportando…' : 'Exportar CSV'}</button></div>
    <div className="history-stats">
      {[['layers', data?.total, 'Registros encontrados'], ['calendar', data?.today, 'Acciones de hoy'], ['users', data?.administrators, 'Administradores del período']].map(([icon, value, label]) => <article key={label}><span className="history-stat-icon"><HistoryIcon name={icon} /></span><div><strong>{value ?? '—'}</strong><span>{label}</span></div></article>)}
    </div>
    <p className="history-stats-note">Los indicadores respetan todos los filtros. Administradores: cuentas con rol de administrador que realizaron acciones en el resultado.</p>
    <form className="history-filters" autoComplete="off" onSubmit={e => e.preventDefault()}>
      <label className="history-search">Buscar en el historial<span><HistoryIcon name="search" /><input type="search" maxLength="160" value={query} placeholder="Acción, responsable, elemento o ID…" onChange={e => { onQuery(e.target.value); update('page', 1); }} /></span></label>
      <label>Tipo de acción<select value={filters.action} onChange={e => update('action', e.target.value)}><option value="">Todas las acciones</option>{(data?.actions || result?.data?.actions || []).map(action => <option key={action} value={action}>{action.replaceAll('_', ' ')}</option>)}</select></label>
      <label>Desde<input type="date" value={filters.start} max={filters.end || '9999-12-30'} onChange={e => update('start', e.target.value)} /></label>
      <label>Hasta<input type="date" value={filters.end} min={filters.start || undefined} max="9999-12-30" onChange={e => update('end', e.target.value)} /></label>
      <label>Orden<select value={filters.order} onChange={e => update('order', e.target.value)}><option value="recent">Más recientes</option><option value="oldest">Más antiguas</option></select></label>
      <button className="history-clear" type="button" onClick={reset}><HistoryIcon name="close" />Limpiar filtros</button>
    </form>
    {invalidDates && <p role="alert">La fecha inicial debe ser anterior o igual a la final.</p>}
    {exportError && <p className="history-feedback" role="alert">{exportError}</p>}
    <div className="history-table-card" aria-busy={loading}>
      {loading ? <div className="history-empty" role="status">Cargando historial de actividad…</div> : error ? <div className="history-empty"><p role="alert">{error}</p><button onClick={() => setVersion(value => value + 1)}>Reintentar</button></div> : data?.items.length ? <>
        <div className="history-table-scroll" tabIndex="0" role="region" aria-label="Tabla de acciones administrativas"><table><thead><tr><th scope="col">Acción</th><th scope="col">Elemento afectado</th><th scope="col">Responsable</th><th scope="col">Fecha y hora</th><th scope="col"><span className="history-sr-only">Detalles</span></th></tr></thead><tbody>{data.items.map(log => {
          const type = activityType(log.accion);
          return <tr key={log.id}><td><div className="history-action"><span className={`history-action-icon ${type.tone}`}><HistoryIcon name={type.icon} /></span><div><strong>{activityLabel(log)}</strong><span className={`history-badge ${type.tone}`}>{type.label}</span></div></div></td><td><strong className="history-element">{log.elemento || `${log.recurso} #${log.recurso_id}`}</strong><small>{log.recurso} #{log.recurso_id}</small></td><td><span className="history-person"><HistoryIcon name="user" />{log.administrador}</span></td><td><time dateTime={`${log.fecha}Z`}>{formatHistoryDate(log.fecha)}</time></td><td><button className="history-details" onClick={() => setSelected(log)} aria-label={`Detalles del registro ${log.id}`}>Detalles</button></td></tr>;
        })}</tbody></table></div>
        <div className="history-pagination"><p role="status">Mostrando {startRow}–{Math.min(startRow + data.items.length - 1, data.total)} de {data.total} registros</p><label>Por página<select value={filters.size} onChange={e => update('size', Number(e.target.value))}>{[10, 25, 50].map(n => <option key={n}>{n}</option>)}</select></label><nav aria-label="Páginas del historial"><button disabled={data.page === 1} onClick={() => update('page', data.page - 1)}>Anterior</button>{pages.map((n, i) => <span key={n}>{i > 0 && n > pages[i - 1] + 1 && <span className="history-ellipsis">…</span>}<button aria-current={data.page === n ? 'page' : undefined} onClick={() => update('page', n)}>{n}</button></span>)}<button disabled={data.page === data.pages} onClick={() => update('page', data.page + 1)}>Siguiente</button></nav></div>
      </> : <div className="history-empty"><HistoryIcon name="file" /><h2>No hay registros para mostrar</h2><p>Prueba con otras fechas o limpia los filtros.</p><button onClick={reset}>Limpiar filtros</button></div>}
    </div>
    {selected && <HistoryDetails log={selected} onClose={() => setSelected(null)} />}
  </section>;
}

function HistoryDetails({ log, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current, previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; element.showModal();
    return () => { element.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  const type = activityType(log.accion);
  return createPortal(<dialog className="history-drawer" ref={dialog} aria-labelledby="history-detail-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="history-drawer-panel"><header><h2 id="history-detail-title">Detalle de actividad</h2><button onClick={onClose} aria-label="Cerrar detalle"><HistoryIcon name="close" /></button></header><div className="history-drawer-content"><div className="history-detail-action"><span className={`history-action-icon ${type.tone}`}><HistoryIcon name={type.icon} /></span><div><h3>{activityLabel(log)}</h3><p>Registro #{log.id}</p></div><span className={`history-badge ${type.tone}`}>{type.label}</span></div><dl>{[['Responsable', log.administrador], ['Correo', log.correo_responsable], ['ID del responsable', log.actor_id], ['Fecha y hora', formatHistoryDate(log.fecha)], ['Acción original', log.accion], ['Entidad', log.recurso], ['ID de entidad', log.recurso_id], ['Elemento', log.elemento]].filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>)}</dl><section className="history-detail-data"><h3>Información registrada</h3>{log.detalle && typeof log.detalle === 'object' && Object.keys(log.detalle).length ? <dl>{Object.entries(log.detalle).map(([name, value]) => <div key={name}><dt>{name.replaceAll('_', ' ')}</dt><dd>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl> : <p>{typeof log.detalle === 'string' ? log.detalle : 'Sin datos adicionales.'}</p>}</section><details className="history-json"><summary>Datos originales (JSON)</summary><pre>{JSON.stringify(log, null, 2)}</pre></details><p className="history-readonly">Este registro es de solo lectura.</p></div></div></dialog>, document.body);
}

function HistoryIcon({ name }) {
  const paths = { layers: 'm12 2 10 6-10 6L2 8l10-6ZM2 12l10 6 10-6M2 16l10 6 10-6', calendar: 'M3 5h18v17H3V5Zm4-3v6m10-6v6M3 11h18', users: 'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-3a4 4 0 0 1 0 8m2 4a4 4 0 0 1 3 4v2', user: 'M20 21v-3a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v3M16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z', search: 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z', download: 'M12 2v13m-5-5 5 5 5-5M3 15v6h18v-6', close: 'm6 6 12 12M18 6 6 18', plus: 'M12 5v14M5 12h14', edit: 'm16 3 5 5-13 13H3v-5L16 3Zm-3 3 5 5', trash: 'M3 6h18M5 6l1 15h12l1-15M9 6V3h6v3m-5 4v7m4-7v7', check: 'm5 12 4 4L19 6', tag: 'M3 3h8l10 10-8 8L3 11V3Zm4 4h.01', file: 'M5 2h9l5 5v15H5V2Zm9 0v6h5M8 12h8m-8 4h8' };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.file} /></svg>;
}
