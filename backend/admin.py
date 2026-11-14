"""System administration. No public endpoint can grant the admin role."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from backend.database import get_db
from backend.models import AuditLog, Business, Product, User, Video
from backend.schemas import AdminBusinessIn, BusinessStatus, ProductIn, Promotion, VideoIn
from backend.main import current_user, now, serialize, video_data


def admin_user(user=Depends(current_user)):
    if not user.is_admin:
        raise HTTPException(403, 'Solo el administrador del sistema puede realizar esta operación')
    return user


router = APIRouter(prefix='/api/admin', tags=['Administración'], dependencies=[Depends(admin_user)])


def audit(db, user, action, resource, item_id, details):
    db.add(AuditLog(actor_id=user.id, accion=action, recurso=resource, recurso_id=item_id,
                    fecha=now(), detalle=json.dumps(details, ensure_ascii=False)))


def finish(db):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'La operación entra en conflicto con datos existentes. Cada propietario puede tener un solo negocio; no se borraron datos.')


def get_item(db, model, item_id):
    item = db.scalar(select(model).where(model.id == item_id).with_for_update())
    if not item:
        raise HTTPException(404, 'Registro no encontrado')
    return item


@router.get('/usuarios')
def users(db=Depends(get_db)):
    business_ids = dict(db.execute(select(Business.owner_id, Business.id)).all())
    return [{'id': u.id, 'nombre': u.nombre, 'correo': u.correo, 'tipo_cuenta': u.tipo_cuenta,
             'is_admin': u.is_admin, 'negocio_id': business_ids.get(u.id)}
            for u in db.scalars(select(User).order_by(User.id.desc()))]


@router.get('/negocios')
def businesses(db=Depends(get_db)):
    return [serialize(item) for item in db.scalars(select(Business).order_by(Business.id.desc()))]


def assign_owner(db, owner_id, business_id=None):
    owner = get_item(db, User, owner_id)
    existing = db.scalar(select(Business.id).where(Business.owner_id == owner_id).with_for_update())
    if existing and existing != business_id:
        raise HTTPException(409, 'La cuenta elegida ya tiene un negocio')
    owner.tipo_cuenta = 'negocios'
    return owner


@router.post('/negocios', status_code=201)
def create_business(data: AdminBusinessIn, user=Depends(admin_user), db=Depends(get_db)):
    assign_owner(db, data.owner_id)
    item = Business(**data.model_dump())
    db.add(item)
    db.flush()
    audit(db, user, 'crear', 'negocio', item.id, {'nombre': item.nombre, 'owner_id': item.owner_id})
    finish(db)
    return serialize(item)


@router.put('/negocios/{item_id}')
def edit_business(item_id: int, data: AdminBusinessIn, user=Depends(admin_user), db=Depends(get_db)):
    item = get_item(db, Business, item_id)
    old_owner = item.owner_id
    assign_owner(db, data.owner_id, item_id)
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    audit(db, user, 'editar', 'negocio', item.id, {'nombre': item.nombre, 'propietario_anterior': old_owner, 'owner_id': item.owner_id})
    finish(db)
    return serialize(item)


@router.patch('/negocios/{item_id}/estado')
def status(item_id: int, data: BusinessStatus, user=Depends(admin_user), db=Depends(get_db)):
    item = get_item(db, Business, item_id)
    previous = item.estado
    item.estado = data.estado
    audit(db, user, 'cambiar_estado', 'negocio', item.id, {'anterior': previous, 'nuevo': data.estado})
    finish(db)
    return serialize(item)


@router.delete('/negocios/{item_id}', status_code=204)
def delete_business(item_id: int, user=Depends(admin_user), db=Depends(get_db)):
    item = get_item(db, Business, item_id)
    if item.estado != 'archivado':
        raise HTTPException(409, 'Archiva el negocio antes de eliminarlo definitivamente')
    if db.scalar(select(Product.id).where(Product.negocioId == item_id).limit(1)) or db.scalar(select(Video.id).where(Video.negocioId == item_id).limit(1)):
        raise HTTPException(409, 'El negocio conserva productos o videos. Puedes mantenerlo archivado o eliminar primero su contenido desde Contenido.')
    audit(db, user, 'eliminar', 'negocio', item.id, {'nombre': item.nombre, 'owner_id': item.owner_id})
    db.delete(item)
    finish(db)


@router.get('/productos')
def products(db=Depends(get_db)):
    return [serialize(p) for p in db.scalars(select(Product).order_by(Product.id.desc()))]


@router.post('/productos', status_code=201)
def create_product(data: ProductIn, user=Depends(admin_user), db=Depends(get_db)):
    get_item(db, Business, data.negocioId)
    item = Product(**data.model_dump())
    db.add(item)
    db.flush()
    audit(db, user, 'crear', 'producto', item.id, {'negocio_id': item.negocioId, 'nombre': item.nombre})
    finish(db)
    return serialize(item)


@router.put('/productos/{item_id}')
def edit_product(item_id: int, data: ProductIn, user=Depends(admin_user), db=Depends(get_db)):
    item = get_item(db, Product, item_id)
    get_item(db, Business, data.negocioId)
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    audit(db, user, 'editar', 'producto', item.id, {'negocio_id': item.negocioId})
    finish(db)
    return serialize(item)


@router.patch('/productos/{item_id}/promocion')
def promotion(item_id: int, data: Promotion, user=Depends(admin_user), db=Depends(get_db)):
    item = get_item(db, Product, item_id)
    item.promocion = data.promocion
    audit(db, user, 'promocion', 'producto', item.id, {'activa': data.promocion})
    finish(db)
    return serialize(item)


@router.delete('/productos/{item_id}', status_code=204)
def delete_product(item_id: int, user=Depends(admin_user), db=Depends(get_db)):
    item = get_item(db, Product, item_id)
    audit(db, user, 'eliminar', 'producto', item.id, {'negocio_id': item.negocioId, 'nombre': item.nombre})
    db.delete(item)
    finish(db)


@router.get('/videos')
def videos(db=Depends(get_db)):
    return [video_data(v) for v in db.scalars(select(Video).order_by(Video.id.desc()))]


@router.post('/videos', status_code=201)
def create_video(data: VideoIn, user=Depends(admin_user), db=Depends(get_db)):
    get_item(db, Business, data.negocioId)
    item = Video(**data.model_dump())
    db.add(item)
    db.flush()
    audit(db, user, 'crear', 'video', item.id, {'negocio_id': item.negocioId})
    finish(db)
    return video_data(item)


@router.put('/videos/{item_id}')
def edit_video(item_id: int, data: VideoIn, user=Depends(admin_user), db=Depends(get_db)):
    item = get_item(db, Video, item_id)
    get_item(db, Business, data.negocioId)
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    audit(db, user, 'editar', 'video', item.id, {'negocio_id': item.negocioId})
    finish(db)
    return video_data(item)


@router.delete('/videos/{item_id}', status_code=204)
def delete_video(item_id: int, user=Depends(admin_user), db=Depends(get_db)):
    item = get_item(db, Video, item_id)
    audit(db, user, 'eliminar', 'video', item.id, {'negocio_id': item.negocioId})
    db.delete(item)
    finish(db)


@router.get('/historial')
def history(db=Depends(get_db)):
    rows = db.execute(select(AuditLog, User.nombre).join(User, User.id == AuditLog.actor_id).order_by(AuditLog.id.desc()).limit(100))
    return [{**serialize(log), 'administrador': name, 'detalle': json.loads(log.detalle)} for log, name in rows]
