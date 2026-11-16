"""Recoverable owner deletion. Only explicitly requested, expired rows are purged."""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from backend.database import get_db
from backend.models import Business, BusinessApplication, Product, User, Video
from backend.main import current_user, now, serialize
from backend.admin import admin_user, audit
from backend.moderation import record_decision

router = APIRouter(prefix='/api', tags=['Eliminación recuperable'])


def locked_business(db, business_id, owner_id):
    # Same order for request, restore and expiry, including concurrent workers.
    owner = db.scalar(select(User).where(User.id == owner_id).with_for_update().execution_options(populate_existing=True))
    business = db.scalar(select(Business).where(Business.id == business_id).with_for_update().execution_options(populate_existing=True))
    if not business or business.owner_id != owner_id:
        raise HTTPException(404, 'Negocio no encontrado')
    return owner, business


def request_deletion(db, business_id, user, current_time):
    owner, business = locked_business(db, business_id, user.id)
    if business.eliminacion_programada:
        return  # Retrying does not extend the original deadline.
    business.estado_antes_eliminacion = business.estado
    business.estado = 'eliminacion'
    business.eliminacion_solicitada = current_time
    business.eliminacion_programada = current_time + timedelta(days=15)
    owner.tipo_cuenta = 'negocios'
    # The old post-deletion wait must not add another 15 days.
    owner.registro_disponible_desde = None
    record_decision(db, business, 'eliminacion', 'Solicitaste eliminar tu negocio. Está oculto y puedes restaurarlo durante 15 días. Después se eliminarán su ficha, productos, promociones y enlaces de video.')
    audit(db, owner, 'solicitar_eliminacion', 'negocio', business.id, {'fecha_limite': business.eliminacion_programada.isoformat(), 'estado_anterior': business.estado_antes_eliminacion})


def cancel_deletion(db, business, actor, current_time):
    if not business.eliminacion_programada:
        raise HTTPException(409, 'El negocio no tiene una eliminación pendiente')
    if current_time >= business.eliminacion_programada:
        raise HTTPException(409, 'El plazo de restauración terminó. Actualiza tu cuenta.')
    previous = business.estado_antes_eliminacion
    if previous not in ('activo', 'suspendido', 'archivado', 'pendiente', 'correcciones', 'rechazado'):
        previous = 'pendiente'
    if previous == 'activo' and not business.publicacion_aprobada:
        previous = 'pendiente'
    business.estado = previous
    business.eliminacion_solicitada = business.eliminacion_programada = None
    business.estado_antes_eliminacion = None
    reason = f'La eliminación pendiente se canceló. Se conservó el estado anterior: {previous}. Las restricciones administrativas siguen vigentes.'
    record_decision(db, business, previous, reason)
    audit(db, actor, 'cancelar_eliminacion', 'negocio', business.id, {'estado_restaurado': previous, 'owner_id': business.owner_id})


def purge_due(db, current_time):
    candidates = db.execute(select(Business.id, Business.owner_id).where(Business.eliminacion_programada <= current_time)).all()
    deleted = 0
    for business_id, owner_id in candidates:
        owner = db.scalar(select(User).where(User.id == owner_id).with_for_update().execution_options(populate_existing=True))
        business = db.scalar(select(Business).where(Business.id == business_id).with_for_update().execution_options(populate_existing=True))
        if not business or business.owner_id != owner_id or not business.eliminacion_programada or business.eliminacion_programada > current_time:
            continue
        record_decision(db, business, 'eliminado', 'Finalizó el plazo de 15 días y se completó la eliminación que solicitaste. Tu cuenta vuelve a personal. No se añade otro periodo de espera.')
        audit(db, owner, 'eliminacion_vencida', 'negocio', business.id, {'nombre': business.nombre, 'solicitada': business.eliminacion_solicitada.isoformat() if business.eliminacion_solicitada else None})
        db.execute(delete(Product).where(Product.negocioId == business_id))
        db.execute(delete(Video).where(Video.negocioId == business_id))
        db.execute(delete(BusinessApplication).where(BusinessApplication.negocio_id == business_id))
        owner.tipo_cuenta = 'personal'
        owner.registro_disponible_desde = None
        # puede_registrar is independent; never lift administrative restrictions.
        db.delete(business)
        deleted += 1
    if deleted:
        db.commit()
    return deleted


@router.post('/negocios/{business_id}/restaurar')
def restore_owner(business_id: int, user=Depends(current_user), db=Depends(get_db)):
    _, business = locked_business(db, business_id, user.id)
    cancel_deletion(db, business, user, now())
    db.commit()
    return serialize(business)


@router.post('/admin/negocios/{business_id}/cancelar-eliminacion')
def restore_admin(business_id: int, user=Depends(admin_user), db=Depends(get_db)):
    reference = db.get(Business, business_id)
    if not reference:
        raise HTTPException(404, 'Negocio no encontrado')
    _, business = locked_business(db, business_id, reference.owner_id)
    cancel_deletion(db, business, user, now())
    db.commit()
    return serialize(business)
