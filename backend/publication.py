"""Prior publication review and private proposals for sensitive business changes."""
import json
import re
import unicodedata
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from backend.database import get_db
from backend.models import Business, BusinessApplication, User
from backend.schemas import BusinessIn, PublicationDecision
from backend.main import current_user, now
from backend.admin import admin_user, audit, finish, get_item
from backend.moderation import notify, record_decision

router = APIRouter(prefix='/api', tags=['Publicación de negocios'])
SENSITIVE = ('nombre', 'direccion', 'imagen', 'enlace_mapa', 'mapa_embed', 'latitud', 'longitud')
UNPUBLISHED = ('pendiente', 'correcciones', 'rechazado')


def complete(data):
    if not data.imagen or not data.correo_contacto or not 7 <= len(re.sub(r'\D', '', data.telefono)) <= 15:
        raise HTTPException(422, 'Completa la foto de fachada, el correo de contacto y un teléfono de 7 a 15 dígitos para solicitar publicación')


def application_data(item):
    return {**{key: getattr(item, key) for key in ('id', 'negocio_id', 'estado', 'motivo', 'version', 'envios', 'fecha', 'actualizada')}, 'propuesta': json.loads(item.propuesta)}


def admin_notice(db, business):
    for uid in db.scalars(select(User.id).where(User.is_admin.is_(True))):
        notify(db, uid, 'Publicación de negocio pendiente', f'{business.nombre} solicita revisión. Consulta Publicaciones en el panel del sistema.')


def queue(db, business, data, resubmit=False):
    item = db.scalar(select(BusinessApplication).where(BusinessApplication.negocio_id == business.id).with_for_update())
    stamp = now()
    if item:
        if item.owner_id != business.owner_id:
            item.envios, item.ventana_desde = 0, stamp
        if resubmit and item.estado == 'pendiente':
            raise HTTPException(409, 'Tu solicitud ya está pendiente de revisión')
        if resubmit or item.estado != 'pendiente':
            if stamp - item.ventana_desde >= timedelta(hours=24):
                item.envios, item.ventana_desde = 0, stamp
            if item.envios >= 3:
                raise HTTPException(429, 'Alcanzaste 3 solicitudes en 24 horas. Corrige los datos y espera a que finalice el plazo para reenviar.')
            item.envios += 1
        item.propuesta = json.dumps(data.model_dump(), ensure_ascii=False, default=str)
        item.owner_id = business.owner_id
        item.estado, item.motivo = 'pendiente', ''
        item.version += 1
        item.actualizada = stamp
    else:
        item = BusinessApplication(negocio_id=business.id, owner_id=business.owner_id,
            propuesta=json.dumps(data.model_dump(), ensure_ascii=False, default=str), estado='pendiente',
            fecha=stamp, actualizada=stamp, ventana_desde=stamp, version=1, envios=1)
        db.add(item)
    if business.estado in UNPUBLISHED:
        business.estado = 'pendiente'
    admin_notice(db, business)
    notify(db, business.owner_id, 'Solicitud de publicación enviada', 'La administración revisará tu negocio o los cambios propuestos antes de publicarlos. Puedes seguir preparando tu catálogo.')
    return item


def owner_update(db, business, data):
    item = db.scalar(select(BusinessApplication).where(BusinessApplication.negocio_id == business.id).with_for_update())
    def changed(key):
        previous, proposed = getattr(business, key), getattr(data, key)
        if key in ('latitud', 'longitud') and previous is not None and proposed is not None:
            return round(float(previous), 7) != round(float(proposed), 7)
        return previous != proposed
    if business.estado == 'activo' and (any(changed(key) for key in SENSITIVE) or (item and item.estado in ('pendiente', 'correcciones', 'rechazado'))):
        complete(data)
        if item and item.estado in ('correcciones', 'rechazado'):
            item.propuesta = json.dumps(data.model_dump(), ensure_ascii=False, default=str)
            item.version += 1
            item.actualizada = now()
        elif item and item.estado == 'pendiente':
            item.propuesta = json.dumps(data.model_dump(), ensure_ascii=False, default=str)
            item.version += 1
            item.actualizada = now()
        else:
            queue(db, business, data)
        return
    for key, value in data.model_dump().items():
        setattr(business, key, value)
    if business.estado in UNPUBLISHED and item:
        item.propuesta = json.dumps(data.model_dump(), ensure_ascii=False, default=str)
        item.version += 1
        item.actualizada = now()


def close_application(db, business, reason):
    item = db.scalar(select(BusinessApplication).where(BusinessApplication.negocio_id == business.id).with_for_update())
    if item and item.estado in ('pendiente', 'correcciones', 'rechazado'):
        item.estado, item.motivo = 'cerrada', reason
        item.version += 1
        item.actualizada = now()
        notify(db, item.owner_id, 'Solicitud de publicación actualizada', reason)


@router.get('/mi-publicacion')
def own_application(user=Depends(current_user), db=Depends(get_db)):
    item = db.scalar(select(BusinessApplication).join(Business, Business.id == BusinessApplication.negocio_id).where(Business.owner_id == user.id, BusinessApplication.owner_id == user.id))
    return application_data(item) if item else None


@router.post('/negocios/{business_id}/solicitar-publicacion')
def resubmit(business_id: int, user=Depends(current_user), db=Depends(get_db)):
    business = get_item(db, Business, business_id)
    if business.owner_id != user.id:
        raise HTTPException(403, 'No tienes permiso sobre este negocio')
    item = db.scalar(select(BusinessApplication).where(BusinessApplication.negocio_id == business.id).with_for_update())
    if business.estado not in UNPUBLISHED and not (business.estado == 'activo' and item and item.estado in ('correcciones', 'rechazado')):
        raise HTTPException(409, 'No hay una publicación que reenviar. Usa Estado y solicitudes si tu negocio está suspendido o archivado.')
    data = BusinessIn.model_validate(json.loads(item.propuesta) if item and item.estado != 'cerrada' else {key: getattr(business, key) for key in BusinessIn.model_fields})
    complete(data)
    item = queue(db, business, data, resubmit=True)
    finish(db)
    return application_data(item)


def normalized(value):
    value = ''.join(c for c in unicodedata.normalize('NFKD', value or '').casefold() if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]', '', value)


def duplicate_matches(proposal, business_id, businesses):
    matches = []
    for business in businesses:
        if business.id == business_id:
            continue
        reasons = []
        for key, label in [('nombre', 'nombre'), ('direccion', 'dirección'), ('telefono', 'teléfono')]:
            left, right = normalized(proposal.get(key, '')), normalized(getattr(business, key))
            if left and left == right and (key != 'telefono' or len(left) >= 7):
                reasons.append(label)
        if reasons:
            matches.append({'id': business.id, 'nombre': business.nombre, 'coincidencias': reasons})
    return matches


@router.get('/admin/publicaciones')
def applications(user=Depends(admin_user), db=Depends(get_db)):
    businesses = db.scalars(select(Business)).all()
    rows = db.execute(select(BusinessApplication, Business, User).join(Business, Business.id == BusinessApplication.negocio_id).join(User, User.id == BusinessApplication.owner_id).order_by(BusinessApplication.actualizada.desc()))
    return [{**application_data(item), 'propietario': owner.nombre, 'correo_propietario': owner.correo,
             'actual': {key: getattr(business, key) for key in BusinessIn.model_fields}, 'estado_negocio': business.estado,
             'duplicados': duplicate_matches(json.loads(item.propuesta), business.id, businesses)} for item, business, owner in rows]


@router.patch('/admin/publicaciones/{application_id}')
def decide(application_id: int, data: PublicationDecision, user=Depends(admin_user), db=Depends(get_db)):
    reference = db.get(BusinessApplication, application_id)
    if not reference:
        raise HTTPException(404, 'Solicitud de publicación no encontrada')
    business = get_item(db, Business, reference.negocio_id)
    item = get_item(db, BusinessApplication, application_id)
    if item.estado != 'pendiente' or item.version != data.version or item.owner_id != business.owner_id or business.estado not in ('activo', *UNPUBLISHED):
        raise HTTPException(409, 'La solicitud cambió o ya fue resuelta. Actualiza la lista antes de decidir.')
    proposal = BusinessIn.model_validate(json.loads(item.propuesta))
    if data.decision == 'aprobar':
        complete(proposal)
        for key, value in proposal.model_dump().items():
            setattr(business, key, value)
        business.estado, item.estado = 'activo', 'aprobado'
        business.publicacion_aprobada = True
    else:
        item.estado = 'correcciones' if data.decision == 'correcciones' else 'rechazado'
        if business.estado in UNPUBLISHED:
            business.estado = item.estado
    item.motivo, item.actualizada = data.motivo, now()
    item.version += 1
    record_decision(db, business, business.estado, data.motivo)
    notify(db, business.owner_id, f'Publicación: {item.estado}', data.motivo)
    audit(db, user, f'publicacion_{data.decision}', 'negocio', business.id, {'solicitud_id': item.id, 'motivo': data.motivo})
    finish(db)
    return application_data(item)
