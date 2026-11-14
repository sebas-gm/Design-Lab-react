import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from backend.database import Base, get_db, make_engine
from backend.models import Business, Product, Session, User, Video
from backend.schemas import BusinessIn, ImportData, Login, ProductIn, Promotion, Register, VideoIn, ProfileUpdate
from backend.videos import video_source
from backend.security import hash_password, token_hash, verify_password
from backend.migrations import migrate_business_details, migrate_account_types, migrate_single_business, migrate_profile
from backend.uploads import UPLOAD_DIR, save_image

engine = make_engine()
origin = os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173')
secure = os.getenv('COOKIE_SECURE', 'false').lower() == 'true'


@asynccontextmanager
async def lifespan(app):
    # Only creates missing tables. Never drops or replaces existing data.
    Base.metadata.create_all(engine)
    migrate_business_details(engine)
    migrate_account_types(engine)
    migrate_single_business(engine)
    migrate_profile(engine)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title='Design Lab API', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[origin], allow_credentials=True,
                   allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], allow_headers=['Content-Type'])


@app.middleware('http')
async def check_origin(request: Request, call_next):
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        # Browser mutations must originate from our frontend (CSRF protection).
        if request.headers.get('origin') not in (None, origin):
            from fastapi.responses import JSONResponse
            return JSONResponse({'detail': 'Origen no permitido'}, status_code=403)
        if request.cookies.get('designlab_session') and not request.headers.get('origin'):
            from fastapi.responses import JSONResponse
            return JSONResponse({'detail': 'Se requiere Origin'}, status_code=403)
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Cache-Control'] = 'no-store'
    return response


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def current_user(request: Request, db=Depends(get_db)):
    token = request.cookies.get('designlab_session', '')
    session = db.get(Session, token_hash(token))
    if not session or session.expires_at <= now():
        raise HTTPException(401, 'Inicia sesión para continuar')
    return db.get(User, session.user_id)


def public_user(user):
    return {'id': user.id, 'nombre': user.nombre, 'correo': user.correo, 'tipo_cuenta': user.tipo_cuenta, 'avatar': user.avatar, 'reducir_movimiento': user.reducir_movimiento}


def business_user(user=Depends(current_user)):
    if user.tipo_cuenta != 'negocios':
        raise HTTPException(403, 'Activa tu cuenta de negocios registrando tu primer negocio')
    return user


def serialize(record):
    return {column.name: getattr(record, column.name) for column in record.__table__.columns if column.name != 'legacy_id'}


def owned(db, business_id, user):
    business_user(user)
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(404, 'Negocio no encontrado')
    if business.owner_id != user.id:
        raise HTTPException(403, 'No tienes permiso sobre este negocio')
    return business


def issue_session(db, user, response):
    token = secrets.token_urlsafe(32)
    db.add(Session(token_hash=token_hash(token), user_id=user.id, expires_at=now() + timedelta(hours=8)))
    db.commit()
    response.set_cookie('designlab_session', token, httponly=True, secure=secure, samesite='lax', max_age=28800, path='/')
    return public_user(user)


@app.get('/api/health')
def health(db=Depends(get_db)):
    db.execute(text('SELECT 1'))
    return {'status': 'ok'}


@app.post('/api/auth/register', status_code=201)
def register(data: Register, response: Response, db=Depends(get_db)):
    user = User(nombre=data.nombre, correo=str(data.correo).lower(), password_hash=hash_password(data.contrasena))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'El correo ya está registrado')
    return issue_session(db, user, response)


@app.post('/api/auth/login')
def login(data: Login, response: Response, db=Depends(get_db)):
    user = db.scalar(select(User).where(User.correo == str(data.correo).lower()))
    # Hash even for unknown accounts to avoid a fast account-discovery path.
    valid = verify_password(data.contrasena, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, 'Correo o contraseña incorrectos')
    return issue_session(db, user, response)


DUMMY_HASH = hash_password(secrets.token_urlsafe(32))


@app.post('/api/imagenes', status_code=201)
async def upload_image(request: Request, user=Depends(current_user)):
    return await save_image(request, user.id)


@app.get('/api/auth/me')
def me(user=Depends(current_user)):
    return public_user(user)


@app.post('/api/auth/logout', status_code=204)
def logout(request: Request, response: Response, db=Depends(get_db)):
    session = db.get(Session, token_hash(request.cookies.get('designlab_session', '')))
    if session:
        db.delete(session)
        db.commit()
    response.delete_cookie('designlab_session', path='/')


@app.patch('/api/auth/profile')
def update_profile(data: ProfileUpdate, user=Depends(current_user), db=Depends(get_db)):
    values = data.model_dump(exclude_unset=True)
    avatar = values.get('avatar')
    if avatar:
        from backend import uploads
        if not avatar.startswith(f'/api/uploads/{user.id}/') or not (uploads.UPLOAD_DIR / str(user.id) / avatar.rsplit('/', 1)[1]).is_file():
            raise HTTPException(422, 'Selecciona una foto subida desde tu cuenta')
    for key, value in values.items():
        setattr(user, key, value)
    db.commit()
    return public_user(user)


@app.get('/api/negocios', dependencies=[Depends(current_user)])
def businesses(db=Depends(get_db)):
    return [serialize(item) for item in db.scalars(select(Business).order_by(Business.id.desc()))]


@app.get('/api/productos', dependencies=[Depends(current_user)])
def products(db=Depends(get_db)):
    return [serialize(item) for item in db.scalars(select(Product).order_by(Product.id.desc()))]


@app.post('/api/negocios', status_code=201)
def create_business(data: BusinessIn, user=Depends(current_user), db=Depends(get_db)):
    db.scalar(select(User).where(User.id == user.id).with_for_update())
    if db.scalar(select(Business.id).where(Business.owner_id == user.id).with_for_update()):
        raise HTTPException(409, 'Tu cuenta ya tiene un negocio. Puedes editarlo desde Mi negocio.')
    item = Business(**data.model_dump(), owner_id=user.id)
    db.add(item)
    # Activation and the first business are saved atomically.
    user.tipo_cuenta = 'negocios'
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Tu cuenta ya tiene un negocio. Puedes editarlo desde Mi negocio.')
    return serialize(item)


@app.put('/api/negocios/{item_id}')
def update_business(item_id: int, data: BusinessIn, user=Depends(current_user), db=Depends(get_db)):
    item = owned(db, item_id, user)
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    db.commit()
    return serialize(item)


@app.delete('/api/negocios/{item_id}', status_code=204)
def delete_business(item_id: int, user=Depends(current_user), db=Depends(get_db)):
    item = owned(db, item_id, user)
    if db.scalar(select(Product.id).where(Product.negocioId == item_id).limit(1)):
        raise HTTPException(409, 'Elimina primero sus productos; no se borrarán en cascada')
    if db.scalar(select(Video.id).where(Video.negocioId == item_id).limit(1)):
        raise HTTPException(409, 'Elimina primero los enlaces de video de este negocio')
    db.delete(item)
    db.commit()


@app.post('/api/productos', status_code=201)
def create_product(data: ProductIn, user=Depends(current_user), db=Depends(get_db)):
    owned(db, data.negocioId, user)
    item = Product(**data.model_dump())
    db.add(item)
    db.commit()
    return serialize(item)


def owned_product(db, item_id, user):
    item = db.get(Product, item_id)
    if not item:
        raise HTTPException(404, 'Producto no encontrado')
    owned(db, item.negocioId, user)
    return item


@app.put('/api/productos/{item_id}')
def update_product(item_id: int, data: ProductIn, user=Depends(current_user), db=Depends(get_db)):
    item = owned_product(db, item_id, user)
    owned(db, data.negocioId, user)
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    db.commit()
    return serialize(item)


@app.patch('/api/productos/{item_id}/promocion')
def promotion(item_id: int, data: Promotion, user=Depends(current_user), db=Depends(get_db)):
    item = owned_product(db, item_id, user)
    item.promocion = data.promocion
    db.commit()
    return serialize(item)


@app.delete('/api/productos/{item_id}', status_code=204)
def delete_product(item_id: int, user=Depends(current_user), db=Depends(get_db)):
    db.delete(owned_product(db, item_id, user))
    db.commit()


@app.post('/api/importar')
def import_legacy(data: ImportData, user=Depends(current_user), db=Depends(get_db)):
    if len(data.negocios) > 1:
        raise HTTPException(422, 'Cada cuenta solo puede tener un negocio. Selecciona uno para importar; los demás se conservarán en el navegador.')
    db.scalar(select(User).where(User.id == user.id).with_for_update())
    existing = db.scalar(select(Business).where(Business.owner_id == user.id).with_for_update())
    if data.negocios and existing and existing.legacy_id != str(data.negocios[0].id):
        raise HTTPException(409, 'Tu cuenta ya tiene un negocio. No se importará otro ni se reemplazará el actual.')
    mapping = {}
    for old in data.negocios:
        item = db.scalar(select(Business).where(Business.owner_id == user.id, Business.legacy_id == str(old.id)))
        if not item:
            item = Business(**old.model_dump(exclude={'id'}), owner_id=user.id, legacy_id=str(old.id))
            db.add(item)
            db.flush()
        mapping[old.id] = item.id
    for old in data.productos:
        if old.negocioId not in mapping:
            raise HTTPException(422, 'Un producto no tiene un negocio incluido en la importación')
        business_id = mapping[old.negocioId]
        if not db.scalar(select(Product).where(Product.negocioId == business_id, Product.legacy_id == str(old.id))):
            db.add(Product(**old.model_dump(exclude={'id', 'negocioId'}), negocioId=business_id, legacy_id=str(old.id)))
    if mapping:
        user.tipo_cuenta = 'negocios'
    db.commit()
    return {'message': 'Importación completada. Los datos originales siguen en el navegador.'}


def video_data(item):
    provider, embed = video_source(item.url)
    return {**serialize(item), 'plataforma': provider, 'embed_url': embed}


@app.get('/api/videos', dependencies=[Depends(current_user)])
def list_videos(negocio_id: int | None = None, offset: int = 0, db=Depends(get_db)):
    if offset < 0:
        raise HTTPException(422, 'Página inválida')
    query = select(Video).order_by(Video.id.desc())
    if negocio_id is not None:
        query = query.where(Video.negocioId == negocio_id)
    return [video_data(item) for item in db.scalars(query.offset(offset).limit(12))]


@app.get('/api/mis-videos')
def my_videos(user=Depends(business_user), db=Depends(get_db)):
    query = select(Video).join(Business).where(Business.owner_id == user.id).order_by(Video.id.desc())
    return [video_data(item) for item in db.scalars(query)]


@app.post('/api/videos', status_code=201)
def create_video(data: VideoIn, user=Depends(current_user), db=Depends(get_db)):
    owned(db, data.negocioId, user)
    item = Video(**data.model_dump())
    db.add(item)
    db.commit()
    return video_data(item)


def owned_video(db, item_id, user):
    item = db.get(Video, item_id)
    if not item:
        raise HTTPException(404, 'Video no encontrado')
    owned(db, item.negocioId, user)
    return item


@app.put('/api/videos/{item_id}')
def update_video(item_id: int, data: VideoIn, user=Depends(current_user), db=Depends(get_db)):
    item = owned_video(db, item_id, user)
    owned(db, data.negocioId, user)
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    db.commit()
    return video_data(item)


@app.delete('/api/videos/{item_id}', status_code=204)
def delete_video(item_id: int, user=Depends(current_user), db=Depends(get_db)):
    db.delete(owned_video(db, item_id, user))
    db.commit()


# Public images of businesses/products; writes always require authentication.
app.mount('/api/uploads', StaticFiles(directory=UPLOAD_DIR, check_dir=False), name='uploads')
