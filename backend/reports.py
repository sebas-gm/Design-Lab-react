"""Reports preserve target snapshots; reporters are visible only to administrators."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from backend.database import get_db
from backend.models import Report, Business, Product, User
from backend.schemas import ReportIn, ReportDecision
from backend.main import current_user, now
from backend.admin import admin_user, audit, get_item, finish
from backend.moderation import notify

router = APIRouter(prefix='/api', tags=['Reportes'])


def public_report(item):
    return {key: getattr(item, key) for key in ('id', 'tipo', 'objetivo_id', 'negocio_id', 'nombre_objetivo', 'motivo', 'explicacion', 'estado', 'resultado', 'respuesta', 'fecha', 'resuelta')}


@router.post('/reportes', status_code=201)
def create_report(data: ReportIn, user=Depends(current_user), db=Depends(get_db)):
    # Serialize submissions from the same account; the unique key also handles races.
    db.scalar(select(User.id).where(User.id == user.id).with_for_update())
    target = db.get(Business if data.tipo == 'negocio' else Product, data.objetivo_id)
    business = target if data.tipo == 'negocio' else db.get(Business, target.negocioId) if target else None
    if not target or not business or business.estado != 'activo':
        raise HTTPException(404, 'El negocio o producto no está disponible para reportarlo')
    if business.owner_id == user.id:
        raise HTTPException(403, 'No puedes reportar tu propio negocio ni sus productos')
    key = f'{user.id}:{data.tipo}:{data.objetivo_id}'
    if db.scalar(select(Report.id).where(Report.pending_key == key)):
        raise HTTPException(409, 'Ya tienes un reporte pendiente o en revisión sobre este elemento. Consulta Mis reportes.')
    item = Report(reporter_id=user.id, tipo=data.tipo, objetivo_id=data.objetivo_id,
                  negocio_id=business.id, nombre_objetivo=target.nombre, motivo=data.motivo,
                  explicacion=data.explicacion, pending_key=key, estado='pendiente', fecha=now())
    db.add(item)
    try:
        db.flush()
        for administrator in db.scalars(select(User).where(User.is_admin.is_(True))):
            notify(db, administrator.id, 'Nuevo reporte para revisar', f'Reporte #{item.id}: {item.nombre_objetivo}. Consulta Reportes en el panel del sistema.')
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Ya existe un reporte abierto para este elemento')
    return public_report(item)


@router.get('/mis-reportes')
def own_reports(user=Depends(current_user), db=Depends(get_db)):
    return [public_report(item) for item in db.scalars(select(Report).where(Report.reporter_id == user.id).order_by(Report.id.desc()))]


@router.get('/admin/reportes')
def admin_reports(user=Depends(admin_user), db=Depends(get_db)):
    records = db.execute(select(Report, User).join(User, User.id == Report.reporter_id).order_by(Report.id.desc()))
    return [{**public_report(item), 'reportante': author.nombre, 'correo_reportante': author.correo,
             'objetivo_existe': db.get(Business if item.tipo == 'negocio' else Product, item.objetivo_id) is not None}
            for item, author in records]


@router.patch('/admin/reportes/{item_id}')
def resolve_report(item_id: int, data: ReportDecision, user=Depends(admin_user), db=Depends(get_db)):
    item = get_item(db, Report, item_id)
    if item.estado == 'resuelto' or item.estado == data.estado:
        raise HTTPException(409, 'El reporte ya tiene ese estado o fue resuelto. Actualiza la lista.')
    previous = item.estado
    item.estado = data.estado
    if data.estado == 'resuelto':
        item.resultado = data.resultado
        item.respuesta = data.respuesta
        item.resuelta = now()
        item.pending_key = None
        notify(db, item.reporter_id, 'Tu reporte fue resuelto', f'Reporte #{item.id} sobre {item.nombre_objetivo}: {data.respuesta}')
    else:
        notify(db, item.reporter_id, 'Tu reporte está en revisión', f'La administración está revisando el reporte #{item.id} sobre {item.nombre_objetivo}.')
    audit(db, user, 'revisar_reporte', 'reporte', item.id, {'anterior': previous, 'estado': item.estado, 'resultado': item.resultado, 'respuesta': item.respuesta})
    finish(db)
    return public_report(item)
