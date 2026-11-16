"""System administration. No public endpoint can grant the admin role."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from backend.database import get_db
from backend.models import AuditLog, Business, Product, User, Video, ModerationEvent, ReviewRequest
from backend.schemas import AdminBusinessIn, BusinessStatus, ProductIn, Promotion, VideoIn, ModerationReason, ReviewDecision, RegistrationPermission
from backend.moderation import notify, record_decision
from backend.main import current_user, now, serialize, video_data, public_user
from backend.schemas import Register
from backend.security import hash_password
from backend.registration import check_registration_wait


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
    item = db.scalar(select(model).where(model.id == item_id).with_for_update().execution_options(populate_existing=True))
    if not item:
        raise HTTPException(404, 'Registro no encontrado')
    return item


def restriction_reason(db, actor, owner):
    if actor.id == owner.id:
        return 'No puedes restringir tu propia cuenta de administrador.'
    if owner.is_admin:
        administrators = db.scalars(select(User.id).where(User.is_admin.is_(True))).all()
        if len(administrators) <= 1:
            return 'No se puede restringir al último administrador del sistema.'
    return ''


def check_restriction(db, actor, owner):
    reason = restriction_reason(db, actor, owner)
    if reason:
        raise HTTPException(409, reason)


@router.get('/usuarios')
def users(user=Depends(admin_user), db=Depends(get_db)):
    business_ids = dict(db.execute(select(Business.owner_id, Business.id)).all())
    return [{'id': u.id, 'nombre': u.nombre, 'correo': u.correo, 'tipo_cuenta': u.tipo_cuenta,
             'is_admin': u.is_admin, 'puede_registrar': u.puede_registrar, 'negocio_id': business_ids.get(u.id),
             'registro_disponible_desde': u.registro_disponible_desde,
             'restriccion_bloqueada': restriction_reason(db, user, u)}
            for u in db.scalars(select(User).order_by(User.id.desc()))]


@router.post('/usuarios', status_code=201)
def create_user(data: Register, user=Depends(admin_user), db=Depends(get_db)):
    account = User(nombre=data.nombre, correo=str(data.correo).lower(),
                   password_hash=hash_password(data.contrasena), is_admin=False,
                   tipo_cuenta='personal', puede_registrar=True)
    db.add(account)
    try:
        db.flush()
        audit(db, user, 'crear', 'usuario', account.id,
              {'nombre': account.nombre, 'correo': account.correo})
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'El correo ya está registrado')
    # Creating an account must never replace the administrator's session.
    return public_user(account)


@router.get('/negocios')
def businesses(db=Depends(get_db)):
    return [serialize(item) for item in db.scalars(select(Business).order_by(Business.id.desc()))]


def assign_owner(db, owner_id, business_id=None):
    owner = get_item(db, User, owner_id)
    check_registration_wait(owner, now())
    if not owner.puede_registrar:
        raise HTTPException(409, 'Autoriza primero a esta cuenta para registrar un nuevo negocio')
    existing = db.scalar(select(Business.id).where(Business.owner_id == owner_id).with_for_update())
    if existing and existing != business_id:
        raise HTTPException(409, 'La cuenta elegida ya tiene un negocio')
    owner.tipo_cuenta = 'negocios'
    return owner


@router.post('/negocios', status_code=201)
def create_business(data: AdminBusinessIn, user=Depends(admin_user), db=Depends(get_db)):
    assign_owner(db, data.owner_id)
    item = Business(**data.model_dump(), publicacion_aprobada=True)
    db.add(item)
    db.flush()
    audit(db, user, 'crear', 'negocio', item.id, {'nombre': item.nombre, 'owner_id': item.owner_id})
    finish(db)
    return serialize(item)


@router.put('/negocios/{item_id}')
def edit_business(item_id: int, data: AdminBusinessIn, user=Depends(admin_user), db=Depends(get_db)):
    item = get_item(db, Business, item_id)
    if item.eliminacion_programada:
        raise HTTPException(409, 'Cancela primero la eliminación pendiente antes de editar o reasignar el negocio')
    old_owner = item.owner_id
    assign_owner(db, data.owner_id, item_id)
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    from backend.publication import close_application
    close_application(db, item, 'La administración editó los datos o la propiedad del negocio. Revisa la ficha actual antes de volver a solicitar publicación.')
    if old_owner != item.owner_id:
        previous_event = db.scalar(select(ModerationEvent).where(ModerationEvent.negocio_id == item.id).order_by(ModerationEvent.id.desc()).limit(1))
        record_decision(db, item, item.estado, previous_event.motivo if previous_event else 'El negocio fue asignado a tu cuenta por la administración.')
        notify(db, old_owner, 'Propiedad del negocio actualizada', f'{item.nombre} ya no está asignado a tu cuenta.')
    audit(db, user, 'editar', 'negocio', item.id, {'nombre': item.nombre, 'propietario_anterior': old_owner, 'owner_id': item.owner_id})
    finish(db)
    return serialize(item)


@router.patch('/negocios/{item_id}/estado')
def status(item_id: int, data: BusinessStatus, user=Depends(admin_user), db=Depends(get_db)):
    item = get_item(db, Business, item_id)
    if item.eliminacion_programada:
        if data.estado not in ('suspendido', 'archivado'):
            raise HTTPException(409, 'Cancela primero la eliminación pendiente para restaurar o revisar el negocio')
        item.estado_antes_eliminacion = data.estado
        from backend.publication import close_application
        close_application(db, item, 'La administración aplicó una restricción durante la eliminación pendiente.')
        record_decision(db, item, data.estado, data.motivo, data.nota_interna)
        audit(db, user, 'restringir_eliminacion', 'negocio', item.id, {'estado_al_restaurar': data.estado, 'motivo': data.motivo})
        finish(db)
        return serialize(item)
    if not item.publicacion_aprobada and data.estado == 'activo':
        raise HTTPException(409, 'Aprueba primero la solicitud desde Publicaciones')
    if data.estado == 'pendiente' and item.publicacion_aprobada:
        raise HTTPException(409, 'El negocio ya tiene publicación aprobada. Usa suspensión o archivo para moderarlo.')
    previous = item.estado
    item.estado = data.estado
    from backend.publication import close_application
    close_application(db, item, f'La administración cambió el estado a {data.estado}. Consulta Estado y solicitudes.')
    if data.estado == 'pendiente':
        from backend.publication import queue
        from backend.schemas import BusinessIn
        queue(db, item, BusinessIn.model_validate({key: getattr(item, key) for key in BusinessIn.model_fields}))
    record_decision(db, item, data.estado, data.motivo, data.nota_interna)
    audit(db, user, 'cambiar_estado', 'negocio', item.id, {'anterior': previous, 'nuevo': data.estado, 'motivo': data.motivo, 'nota_interna': data.nota_interna})
    finish(db)
    return serialize(item)


@router.delete('/negocios/{item_id}', status_code=204)
def delete_business(item_id: int, data: ModerationReason, user=Depends(admin_user), db=Depends(get_db)):
    item = get_item(db, Business, item_id)
    if item.estado != 'archivado':
        raise HTTPException(409, 'Archiva el negocio antes de eliminarlo definitivamente')
    if db.scalar(select(Product.id).where(Product.negocioId == item_id).limit(1)) or db.scalar(select(Video.id).where(Video.negocioId == item_id).limit(1)):
        raise HTTPException(409, 'El negocio conserva productos o videos. Puedes mantenerlo archivado o eliminar primero su contenido desde Contenido.')
    owner = get_item(db, User, item.owner_id)
    check_restriction(db, user, owner)
    record_decision(db, item, 'eliminado', data.motivo, data.nota_interna)
    owner.puede_registrar = False
    owner.tipo_cuenta = 'personal'
    audit(db, user, 'eliminar', 'negocio', item.id, {'nombre': item.nombre, 'owner_id': item.owner_id, 'motivo': data.motivo, 'nota_interna': data.nota_interna})
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


@router.get('/solicitudes')
def requests(db=Depends(get_db)):
    rows = db.execute(select(ReviewRequest, ModerationEvent, User).join(ModerationEvent, ModerationEvent.id == ReviewRequest.evento_id).join(User, User.id == ReviewRequest.user_id).order_by(ReviewRequest.id.desc()))
    return [{**serialize(request), 'tipo_solicitud': 'registro' if event.estado in ('eliminado', 'restringido') else 'revision', 'nombre_negocio': event.nombre_negocio, 'motivo': event.motivo,
             'nota_interna': event.nota_interna, 'propietario': owner.correo} for request, event, owner in rows]


@router.patch('/solicitudes/{item_id}')
def resolve_request(item_id: int, data: ReviewDecision, user=Depends(admin_user), db=Depends(get_db)):
    reference = db.get(ReviewRequest, item_id)
    if not reference:
        raise HTTPException(404, 'Solicitud no encontrada')
    business = db.scalar(select(Business).where(Business.id == reference.negocio_id).with_for_update())
    request = get_item(db, ReviewRequest, item_id)
    event = db.get(ModerationEvent, request.evento_id)
    permission = event.estado in ('eliminado', 'restringido')
    latest_query = select(ModerationEvent.id).where(ModerationEvent.negocio_id == request.negocio_id)
    if permission:
        latest_query = latest_query.where(ModerationEvent.user_id == request.user_id)
    latest = db.scalar(latest_query.order_by(ModerationEvent.id.desc()).limit(1).with_for_update())
    if request.estado != 'pendiente' or latest != request.evento_id or (not permission and (not business or business.owner_id != request.user_id)):
        raise HTTPException(409, 'La solicitud ya se resolvió o el negocio cambió. Actualiza el panel.')
    request.estado = 'aprobada' if data.decision == 'aprobar' else 'rechazada'
    request.respuesta = data.respuesta
    request.resuelta = now()
    request.pending_key = None
    db.flush()
    if data.decision == 'aprobar':
        if permission:
            owner = get_item(db, User, request.user_id)
            owner.puede_registrar = True
            notify(db, owner.id, 'Puedes registrar un nuevo negocio', data.respuesta)
        else:
            if not business.publicacion_aprobada:
                raise HTTPException(409, 'Este negocio necesita aprobación inicial desde Publicaciones. Reabre su revisión antes de publicarlo.')
            business.estado = 'activo'
            record_decision(db, business, 'activo', data.respuesta)
    else:
        notify(db, request.user_id, 'Tu solicitud recibió una respuesta', data.respuesta)
    audit(db, user, f'solicitud_{data.decision}', 'solicitud', item_id, {'respuesta': data.respuesta})
    finish(db)
    return {'estado': request.estado}


@router.patch('/usuarios/{item_id}/registro-negocio')
def registration_permission(item_id: int, data: RegistrationPermission, user=Depends(admin_user), db=Depends(get_db)):
    owner = get_item(db, User, item_id)
    if not data.permitir:
        check_restriction(db, user, owner)
    owner.puede_registrar = data.permitir
    db.add(ModerationEvent(user_id=owner.id, negocio_id=0, nombre_negocio='Registro de negocios',
                           estado='permitido' if data.permitir else 'restringido', motivo=data.motivo, nota_interna='', fecha=now()))
    for pending in db.scalars(select(ReviewRequest).where(ReviewRequest.pending_key == f'permiso:{item_id}').with_for_update()):
        pending.estado = 'cerrada'
        pending.pending_key = None
        pending.respuesta = data.motivo
        pending.resuelta = now()
    notify(db, owner.id, 'Permiso de registro actualizado', f'{"Puedes registrar un negocio" if data.permitir else "Necesitas autorización para registrar un negocio"}. {data.motivo}')
    audit(db, user, 'permiso_registro', 'usuario', item_id, {'permitir': data.permitir, 'motivo': data.motivo})
    finish(db)
    return {'puede_registrar': owner.puede_registrar}


@router.patch('/usuarios/{item_id}/levantar-espera')
def lift_registration_wait(item_id: int, data: ModerationReason, user=Depends(admin_user), db=Depends(get_db)):
    owner = get_item(db, User, item_id)
    deadline = owner.registro_disponible_desde
    if not deadline or deadline <= now():
        raise HTTPException(409, 'Esta cuenta no tiene una espera vigente. Actualiza la lista de usuarios.')
    owner.registro_disponible_desde = None
    message = 'La espera de 15 días fue levantada. '
    message += 'Puedes registrar un nuevo negocio.' if owner.puede_registrar else 'Todavía necesitas autorización administrativa para registrar un negocio.'
    notify(db, owner.id, 'Espera de registro levantada', f'{message} {data.motivo}')
    audit(db, user, 'levantar_espera', 'usuario', item_id,
          {'fecha_anterior': deadline.isoformat(), 'motivo': data.motivo, 'nota_interna': data.nota_interna})
    finish(db)
    return {'registro_disponible_desde': None, 'puede_registrar': owner.puede_registrar}
