export function historyDate(value) {
  if (!value) return null;
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatHistoryDate(value) {
  return historyDate(value)?.toLocaleString('es-BO', { timeZone: 'America/La_Paz', dateStyle: 'medium', timeStyle: 'short' }) || 'Fecha no disponible';
}

export function activityType(action) {
  if (action === 'crear') return { label: 'Creación', icon: 'plus', tone: 'blue' };
  if (action === 'editar') return { label: 'Edición', icon: 'edit', tone: 'purple' };
  if (action.includes('eliminar') || action.includes('eliminacion')) return { label: 'Eliminación', icon: 'trash', tone: 'red' };
  if (action.startsWith('publicacion_')) return { label: 'Publicación', icon: 'check', tone: 'green' };
  if (action.startsWith('solicitud_')) return { label: 'Solicitud', icon: 'file', tone: 'purple' };
  if (action === 'promocion') return { label: 'Promoción', icon: 'tag', tone: 'purple' };
  return { label: 'Cambio de estado', icon: 'layers', tone: 'gold' };
}

export function activityLabel(log) {
  const entity = { negocio: 'Negocio', usuario: 'Usuario', producto: 'Producto', video: 'Video', solicitud: 'Solicitud', reporte: 'Reporte' }[log.recurso] || log.recurso;
  const labels = {
    crear: `${entity} registrado`, editar: `${entity} actualizado`, eliminar: `${entity} eliminado`,
    promocion: log.detalle?.activa ? 'Promoción activada' : 'Promoción desactivada',
    cambiar_estado: `${entity}: ${log.detalle?.nuevo || 'estado actualizado'}`,
    publicacion_aprobar: 'Publicación aprobada', publicacion_rechazar: 'Publicación rechazada',
    publicacion_correcciones: 'Correcciones solicitadas', solicitud_aprobar: 'Solicitud aprobada',
    solicitud_rechazar: 'Solicitud rechazada', permiso_registro: 'Permiso de registro actualizado',
    levantar_espera: 'Período de espera levantado', revisar_reporte: 'Reporte revisado',
    solicitar_eliminacion: 'Eliminación programada', cancelar_eliminacion: 'Eliminación cancelada',
    eliminacion_vencida: 'Eliminación completada', restringir_eliminacion: 'Restricción actualizada',
  };
  return labels[log.accion] || log.accion.replaceAll('_', ' ');
}
