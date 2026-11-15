"""Owner-facing decisions and notifications, retained after business deletion."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from backend.database import get_db
from backend.models import Business, ModerationEvent, Notification, ReviewRequest
from backend.schemas import ReviewIn
from backend.main import current_user, now, serialize

router = APIRouter(prefix='/api', tags=['Moderación y notificaciones'])


def notify(db, user_id, title, message):
    db.add(Notification(user_id=user_id, titulo=title, mensaje=message, fecha=now()))


def close_requests(db, business_id):
    for request in db.scalars(select(ReviewRequest).where(ReviewRequest.negocio_id == business_id, ReviewRequest.estado == 'pendiente').with_for_update()):
        request.estado = 'cerrada'
        request.pending_key = None
        request.respuesta = 'El estado del negocio cambió. Consulta la nueva decisión en el historial.'
        request.resuelta = now()


def record_decision(db, item, state, reason, internal=''):
    close_requests(db, item.id)
    event = ModerationEvent(user_id=item.owner_id, negocio_id=item.id, nombre_negocio=item.nombre,
                            estado=state, motivo=reason, nota_interna=internal, fecha=now())
    db.add(event)
    notify(db, item.owner_id, f'Tu negocio está {state}', f'{item.nombre}: {reason}')
    return event


@router.get('/mi-moderacion')
def my_moderation(user=Depends(current_user), db=Depends(get_db)):
    events = db.scalars(select(ModerationEvent).where(ModerationEvent.user_id == user.id).order_by(ModerationEvent.id.desc())).all()
    requests = db.scalars(select(ReviewRequest).where(ReviewRequest.user_id == user.id).order_by(ReviewRequest.id.desc())).all()
    business = db.scalar(select(Business).where(Business.owner_id == user.id))
    return {'negocio': serialize(business) if business else None, 'puede_registrar': user.puede_registrar,
            'historial': [{k: getattr(event, k) for k in ('id', 'negocio_id', 'nombre_negocio', 'estado', 'motivo', 'fecha')} for event in events],
            'solicitudes': [{k: v for k, v in serialize(request).items() if k not in ('pending_key', 'user_id')} for request in requests]}


@router.post('/negocios/{business_id}/solicitudes', status_code=201)
def request_review(business_id: int, data: ReviewIn, user=Depends(current_user), db=Depends(get_db)):
    business = db.scalar(select(Business).where(Business.id == business_id).with_for_update())
    if not business or business.owner_id != user.id:
        raise HTTPException(404, 'Negocio no encontrado')
    if business.estado not in ('suspendido', 'archivado'):
        raise HTTPException(409, 'Solo los negocios suspendidos o archivados pueden solicitar revisión')
    event = db.scalar(select(ModerationEvent).where(ModerationEvent.negocio_id == business_id, ModerationEvent.user_id == user.id).order_by(ModerationEvent.id.desc()).with_for_update())
    if not event:
        raise HTTPException(409, 'No hay una decisión de moderación disponible. Contacta con administración.')
    item = ReviewRequest(user_id=user.id, negocio_id=business_id, evento_id=event.id,
                         pending_key=f'{business_id}:{user.id}', mensaje=data.mensaje, fecha=now())
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Ya tienes una solicitud pendiente para este negocio')
    return {'id': item.id, 'estado': item.estado}


@router.get('/notificaciones')
def notifications(offset: int = 0, user=Depends(current_user), db=Depends(get_db)):
    if offset < 0:
        raise HTTPException(422, 'Página inválida')
    query = select(Notification).where(Notification.user_id == user.id).order_by(Notification.id.desc()).offset(offset).limit(20)
    unread = db.scalar(select(func.count()).select_from(Notification).where(Notification.user_id == user.id, Notification.leida.is_(False)))
    return {'no_leidas': unread, 'items': [{k: v for k, v in serialize(item).items() if k != 'user_id'} for item in db.scalars(query)]}


@router.post('/mi-moderacion/contacto', status_code=201)
def contact_admin(data: ReviewIn, user=Depends(current_user), db=Depends(get_db)):
    from backend.models import User
    db.scalar(select(User).where(User.id == user.id).with_for_update())
    db.refresh(user)
    event = db.scalar(select(ModerationEvent).where(ModerationEvent.user_id == user.id, ModerationEvent.estado.in_(('eliminado', 'restringido'))).order_by(ModerationEvent.id.desc()).with_for_update())
    if not event or user.puede_registrar:
        raise HTTPException(409, 'Tu cuenta no necesita solicitar este permiso')
    item = ReviewRequest(user_id=user.id, negocio_id=event.negocio_id, evento_id=event.id,
                         pending_key=f'permiso:{user.id}', mensaje=data.mensaje, fecha=now())
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Ya tienes una solicitud de autorización pendiente')
    return {'id': item.id, 'estado': item.estado}


@router.patch('/notificaciones/{item_id}/leida', status_code=204)
def read_notification(item_id: int, user=Depends(current_user), db=Depends(get_db)):
    item = db.get(Notification, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, 'Notificación no encontrada')
    item.leida = True
    db.commit()
