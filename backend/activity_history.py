"""Read-only audit queries. Dates are interpreted in Bolivia (UTC-4)."""
import csv
import io
import json
from datetime import UTC, date, datetime, time, timedelta

from fastapi import HTTPException, Response
from sqlalchemy import String, and_, cast, func, or_, select

from backend.models import AuditLog, Business, Product, User, Video


def activity_history(db, q, action, start, end, order, page, size, export):
    if start and end and start > end:
        raise HTTPException(422, 'La fecha inicial debe ser anterior o igual a la final')
    if (end and end >= date(9999, 12, 31)) or (start and start >= date(9999, 12, 31)):
        raise HTTPException(422, 'La fecha debe ser anterior al 31 de diciembre de 9999')
    # The stored dates are UTC without an offset. A local day begins at 04:00 UTC.
    def midnight(day):
        return datetime.combine(day, time()) + timedelta(hours=4)

    local_today = (datetime.now(UTC) - timedelta(hours=4)).date()
    joins = (select(AuditLog, User.nombre, User.is_admin, User.correo,
                    Business.nombre, Product.nombre, Video.titulo)
             .join(User, User.id == AuditLog.actor_id)
             .outerjoin(Business, and_(AuditLog.recurso == 'negocio', AuditLog.recurso_id == Business.id))
             .outerjoin(Product, and_(AuditLog.recurso == 'producto', AuditLog.recurso_id == Product.id))
             .outerjoin(Video, and_(AuditLog.recurso == 'video', AuditLog.recurso_id == Video.id)))
    conditions = []
    if action:
        conditions.append(AuditLog.accion == action)
    if start:
        conditions.append(AuditLog.fecha >= midnight(start))
    if end:
        conditions.append(AuditLog.fecha < midnight(end + timedelta(days=1)))
    if q.strip():
        fields = (AuditLog.accion, AuditLog.recurso, AuditLog.detalle, User.nombre, User.correo,
                  Business.nombre, Product.nombre, Video.titulo, cast(AuditLog.id, String),
                  cast(AuditLog.recurso_id, String), cast(AuditLog.actor_id, String))
        conditions.append(or_(*(field.icontains(q.strip(), autoescape=True) for field in fields)))
    filtered = joins.where(*conditions)
    subset = filtered.subquery()
    total = db.scalar(select(func.count()).select_from(subset))
    today = db.scalar(select(func.count()).select_from(subset).where(
        subset.c.fecha >= midnight(local_today), subset.c.fecha < midnight(local_today + timedelta(days=1))))
    admins = db.scalar(select(func.count(func.distinct(subset.c.actor_id))).where(subset.c.is_admin.is_(True)))
    actions = db.scalars(select(AuditLog.accion).distinct().order_by(AuditLog.accion)).all()
    descending = order == 'recent'
    ordered = filtered.order_by(AuditLog.fecha.desc() if descending else AuditLog.fecha.asc(),
                                AuditLog.id.desc() if descending else AuditLog.id.asc())

    def item(row):
        log, name, is_admin, email, business, product, video = row
        try:
            details = json.loads(log.detalle)
        except (ValueError, TypeError):
            details = log.detalle
        stored_name = details.get('nombre') if isinstance(details, dict) else None
        return {'id': log.id, 'actor_id': log.actor_id, 'accion': log.accion,
                'recurso': log.recurso, 'recurso_id': log.recurso_id, 'fecha': log.fecha.isoformat(),
                'administrador': name, 'responsable_es_admin': bool(is_admin), 'correo_responsable': email,
                'elemento': stored_name or business or product or video, 'detalle': details}

    if export:
        output = io.StringIO(newline='')
        writer = csv.writer(output)
        writer.writerow(['ID', 'Accion', 'Recurso', 'ID recurso', 'Elemento', 'Responsable',
                         'ID responsable', 'Fecha UTC', 'Detalle JSON'])

        def safe(value):
            text = '' if value is None else str(value)
            # Prevent spreadsheet formula execution when opening user-supplied data.
            return "'" + text if text.lstrip().startswith(('=', '+', '-', '@', '\t', '\r', '\n')) else text

        for row in db.execute(ordered).yield_per(500):
            log = item(row)
            writer.writerow([safe(value) for value in (log['id'], log['accion'], log['recurso'],
                log['recurso_id'], log['elemento'], log['administrador'], log['actor_id'],
                log['fecha'] + 'Z', json.dumps(log['detalle'], ensure_ascii=False))])
        return Response('\ufeff' + output.getvalue(), media_type='text/csv; charset=utf-8',
                        headers={'Content-Disposition': 'attachment; filename="navishop-historial.csv"',
                                 'Cache-Control': 'no-store'})
    pages = max(1, (total + size - 1) // size)
    page = min(page, pages)
    return {'items': [item(row) for row in db.execute(ordered.offset((page - 1) * size).limit(size))],
            'total': total, 'today': today, 'administrators': admins, 'actions': actions,
            'page': page, 'pages': pages}
