import os

import pytest
from fastapi.testclient import TestClient

# The test database is separate from MySQL and from any user's records.
os.environ['DATABASE_URL'] = 'sqlite://'
from backend.main import app, engine
from backend.database import Base

ORIGIN = {'Origin': 'http://localhost:5173'}
BUSINESS = {'nombre': 'Café', 'categoria': 'Comida', 'direccion': 'Cerca del instituto',
            'descripcion': 'Desayunos', 'latitud': -16.5, 'longitud': -68.1,
            'telefono': '71234567', 'correo_contacto': 'negocio@example.com', 'imagen': 'https://example.com/fachada.jpg'}


@pytest.fixture
def clients():
    Base.metadata.drop_all(engine)
    with TestClient(app, headers=ORIGIN) as owner, TestClient(app, headers=ORIGIN) as other:
        yield owner, other


def signup(client, correo):
    return client.post('/api/auth/register', json={'nombre': 'Usuario', 'correo': correo,
                                                  'contrasena': 'Prueba-segura-2026'})


def published_fixture(business_id):
    """Older catalog/moderation scenarios start with an already approved business.

    The publication workflow itself is exercised separately through the real API.
    """
    from sqlalchemy import select
    from sqlalchemy.orm import Session
    from backend.models import Business, BusinessApplication
    with Session(engine) as db:
        business = db.get(Business, business_id)
        business.estado, business.publicacion_aprobada = 'activo', True
        application = db.scalar(select(BusinessApplication).where(BusinessApplication.negocio_id == business_id))
        if application:
            application.estado = 'aprobado'
        db.commit()


def test_auth_and_session(clients):
    client, _ = clients
    assert client.get('/api/auth/me').status_code == 401
    response = signup(client, 'owner@example.com')
    assert response.status_code == 201
    assert 'httponly' in response.headers['set-cookie'].lower()
    assert 'password' not in response.text
    assert client.get('/api/auth/me').json()['correo'] == 'owner@example.com'
    assert signup(client, 'owner@example.com').status_code == 409
    assert client.post('/api/auth/logout').status_code == 204
    assert client.get('/api/auth/me').status_code == 401
    assert client.post('/api/auth/login', json={'correo': 'owner@example.com', 'contrasena': 'incorrecta'}).status_code == 401
    assert client.post('/api/auth/login', json={'correo': 'owner@example.com', 'contrasena': 'Prueba-segura-2026'}).status_code == 200


def test_crud_permissions_and_promotion(clients):
    owner, other = clients
    assert owner.post('/api/negocios', json=BUSINESS).status_code == 401
    signup(owner, 'owner@example.com')
    signup(other, 'other@example.com')
    business = owner.post('/api/negocios', json=BUSINESS).json()
    bid = business['id']
    published_fixture(bid)
    assert other.put(f'/api/negocios/{bid}', json=BUSINESS).status_code == 403
    product = {'nombre': 'Café con leche', 'precio': '8.50', 'descripcion': 'Caliente', 'negocioId': bid}
    assert other.post('/api/productos', json=product).status_code == 403
    response = owner.post('/api/productos', json=product)
    assert response.status_code == 201
    pid = response.json()['id']
    assert other.delete(f'/api/productos/{pid}').status_code == 403
    assert other.patch(f'/api/productos/{pid}/promocion', json={'promocion': True}).status_code == 403
    assert owner.patch(f'/api/productos/{pid}/promocion', json={'promocion': True}).json()['promocion'] is True
    assert owner.put(f'/api/productos/{pid}', json={**product, 'precio': '9.00'}).status_code == 200
    assert owner.put(f'/api/negocios/{bid}', json={**BUSINESS, 'nombre': 'Nuevo nombre'}).status_code == 200
    assert owner.delete(f'/api/negocios/{bid}').status_code == 409
    assert owner.get('/api/productos').json()[0]['nombre'] == product['nombre']
    assert owner.delete(f'/api/productos/{pid}').status_code == 204
    assert owner.delete(f'/api/negocios/{bid}').status_code == 204
    assert owner.get('/api/negocios').json() == []


def test_validation_and_csrf(clients):
    owner, _ = clients
    signup(owner, 'owner@example.com')
    assert owner.post('/api/negocios', json={**BUSINESS, 'latitud': 91}).status_code == 422
    assert owner.post('/api/negocios', json={**BUSINESS, 'longitud': None}).status_code == 422
    assert owner.post('/api/negocios', json={**BUSINESS, 'imagen': 'javascript:alert(1)'}).status_code == 422
    assert owner.post('/api/negocios', json={**BUSINESS, 'owner_id': 99}).status_code == 422
    assert owner.post('/api/negocios', json=BUSINESS, headers={'Origin': 'https://otro.example'}).status_code == 403


def test_import_is_idempotent_and_atomic(clients):
    owner, _ = clients
    signup(owner, 'owner@example.com')
    payload = {'negocios': [{**BUSINESS, 'id': 123}], 'productos': [
        {'id': 456, 'negocioId': 123, 'nombre': 'Pan', 'precio': 2, 'descripcion': 'Fresco'}]}
    for _ in range(2):
        assert owner.post('/api/importar', json=payload).status_code == 200
    assert len(owner.get('/api/negocios').json()) == 1
    assert len(owner.get('/api/productos').json()) == 1
    bad = {'negocios': [{**BUSINESS, 'id': 999}], 'productos': [{**payload['productos'][0], 'negocioId': 111}]}
    assert owner.post('/api/importar', json=bad).status_code == 409
    assert len(owner.get('/api/negocios').json()) == 1


def test_image_upload_and_business_details(clients, tmp_path, monkeypatch):
    import io
    from PIL import Image
    import backend.uploads as uploads
    monkeypatch.setattr(uploads, 'UPLOAD_DIR', tmp_path)
    mount = next(route for route in app.routes if getattr(route, 'name', '') == 'uploads')
    monkeypatch.setattr(mount.app, 'directory', str(tmp_path))
    monkeypatch.setattr(mount.app, 'all_directories', [str(tmp_path)])
    owner, other = clients
    image = io.BytesIO()
    Image.new('RGB', (40, 30), 'purple').save(image, format='PNG')
    assert other.post('/api/imagenes', files={'file': ('test.png', image.getvalue(), 'image/png')}).status_code == 401
    signup(owner, 'images@example.com')
    result = owner.post('/api/imagenes', files={'file': ('../../fake.png', image.getvalue(), 'image/png')})
    assert result.status_code == 201, result.text
    url = result.json()['url']
    response = other.get(url)
    assert response.status_code == 200
    assert response.headers['content-type'] == 'image/webp'
    with Image.open(io.BytesIO(response.content)) as saved:
        assert saved.size == (40, 30)
        assert not saved.getexif()
    profile = owner.patch('/api/auth/profile', json={'avatar': url, 'nombre': 'Con foto'})
    assert profile.status_code == 200, profile.text
    assert profile.json()['avatar'] == url
    signup(other, 'avatar-other@example.com')
    assert other.patch('/api/auth/profile', json={'avatar': url}).status_code == 422
    data = {**BUSINESS, 'imagen': url, 'logo': url, 'telefono': '+591 71234567',
            'correo_contacto': 'contact@example.com', 'enlace_mapa': 'https://maps.app.goo.gl/example',
            'hora_apertura': '08:00', 'hora_cierre': '20:00'}
    business = owner.post('/api/negocios', json=data)
    assert business.status_code == 201, business.text
    bid = business.json()['id']
    updated = owner.put(f'/api/negocios/{bid}', json={**data, 'nombre': 'Actualizado'})
    assert updated.json()['imagen'] == url
    assert updated.json()['telefono'] == '+591 71234567'
    assert updated.json()['hora_apertura'] == '08:00'
    assert owner.post('/api/imagenes', files={'file': ('fake.png', b'not an image', 'image/png')}).status_code == 415
    assert owner.post('/api/imagenes', files={'file': ('image.svg', b'<svg></svg>', 'image/svg+xml')}).status_code == 415
    assert owner.post('/api/imagenes', files={'file': ('big.png', b'x' * (5 * 1024 * 1024 + 1), 'image/png')}).status_code == 413
    assert owner.post('/api/negocios', json={**data, 'hora_cierre': '25:00'}).status_code == 422
    assert owner.post('/api/negocios', json={**data, 'enlace_mapa': 'javascript:alert(1)'}).status_code == 422
    assert owner.post('/api/negocios', json={**data, 'correo_contacto': 'invalid'}).status_code == 422


def test_additive_migration_preserves_existing_business():
    from sqlalchemy import create_engine, inspect, text
    from backend.migrations import migrate_business_details
    isolated = create_engine('sqlite://')
    with isolated.begin() as connection:
        connection.execute(text('CREATE TABLE businesses (id INTEGER PRIMARY KEY, nombre VARCHAR(120))'))
        connection.execute(text("INSERT INTO businesses (id, nombre) VALUES (1, 'Anterior')"))
    migrate_business_details(isolated)
    migrate_business_details(isolated)
    assert 'telefono' in {column['name'] for column in inspect(isolated).get_columns('businesses')}
    with isolated.connect() as connection:
        row = connection.execute(text('SELECT nombre, telefono, logo FROM businesses')).one()
        assert row == ('Anterior', '', '')
        assert connection.scalar(text('SELECT publicacion_aprobada FROM businesses')) == 1
    isolated.dispose()


def test_video_permissions_and_links(clients):
    owner, other = clients
    assert owner.get('/api/videos').status_code == 401
    assert owner.post('/api/videos', json={'negocioId': 1, 'titulo': 'Prueba', 'url': 'https://youtu.be/M7lc1UVf-VE'}).status_code == 401
    signup(owner, 'video-owner@example.com')
    signup(other, 'video-other@example.com')
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    published_fixture(bid)
    payload = {'negocioId': bid, 'titulo': 'Nuestro negocio', 'url': 'https://youtu.be/M7lc1UVf-VE'}
    assert other.post('/api/videos', json=payload).status_code == 403
    response = owner.post('/api/videos', json=payload)
    assert response.status_code == 201, response.text
    video = response.json()
    assert video['embed_url'] == 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'
    assert other.get('/api/videos').json()[0]['id'] == video['id']
    assert other.get('/api/mis-videos').status_code == 403
    assert len(owner.get('/api/mis-videos').json()) == 1
    assert other.put(f"/api/videos/{video['id']}", json=payload).status_code == 403
    assert other.delete(f"/api/videos/{video['id']}").status_code == 403
    tiktok = {**payload, 'url': 'https://www.tiktok.com/@scout2015/video/6718335390845095173'}
    result = owner.put(f"/api/videos/{video['id']}", json=tiktok)
    assert result.json()['plataforma'] == 'TikTok'
    assert result.json()['embed_url'] == 'https://www.tiktok.com/player/v1/6718335390845095173'
    assert owner.get(f'/api/videos?negocio_id={bid + 100}').json() == []
    assert owner.get('/api/videos?offset=-1').status_code == 422
    for url in ['javascript:alert(1)', 'https://youtube.com.evil.com/watch?v=M7lc1UVf-VE', 'https://127.0.0.1/video', 'https://www.youtube.com/watch?v=<script>', 'https://vm.tiktok.com/short', 'https://www.youtube.com:invalid/watch?v=M7lc1UVf-VE']:
        assert owner.post('/api/videos', json={**payload, 'url': url}).status_code == 422
    assert owner.delete(f'/api/negocios/{bid}').status_code == 409
    assert owner.delete(f"/api/videos/{video['id']}").status_code == 204
    assert owner.get('/api/videos').json() == []


@pytest.mark.parametrize('url', ['https://www.youtube.com/watch?v=M7lc1UVf-VE', 'https://www.youtube.com/shorts/M7lc1UVf-VE', 'https://www.youtube.com/live/M7lc1UVf-VE'])
def test_youtube_url_variants(url):
    from backend.videos import video_source
    assert video_source(url) == ('YouTube', 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE')


def test_video_pagination(clients):
    owner, _ = clients
    signup(owner, 'pagination@example.com')
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    for number in range(13):
        assert owner.post('/api/videos', json={'negocioId': bid, 'titulo': str(number), 'url': 'https://youtu.be/M7lc1UVf-VE'}).status_code == 201
    page_one = owner.get('/api/videos').json()
    page_two = owner.get('/api/videos?offset=12').json()
    assert len(page_one) == 12 and len(page_two) == 1
    assert not {v['id'] for v in page_one} & {v['id'] for v in page_two}


def test_account_activation_and_members_only_catalog(clients):
    owner, visitor = clients
    for path in ['/api/negocios', '/api/productos', '/api/videos', '/api/mis-videos']:
        assert visitor.get(path).status_code == 401
    account = signup(owner, 'personal@example.com').json()
    assert account['tipo_cuenta'] == 'personal'
    for path in ['/api/negocios', '/api/productos', '/api/videos']:
        assert owner.get(path).status_code == 200
    assert owner.get('/api/mis-videos').status_code == 403
    # Uploading a photo or opening onboarding cannot activate the account.
    assert owner.post('/api/negocios', json={**BUSINESS, 'nombre': ''}).status_code == 422
    assert owner.get('/api/auth/me').json()['tipo_cuenta'] == 'personal'
    assert visitor.post('/api/auth/register', json={'nombre': 'Prueba', 'correo': 'role-injection@example.com', 'contrasena': 'Prueba-segura-2026', 'tipo_cuenta': 'negocios'}).status_code == 422
    created = owner.post('/api/negocios', json=BUSINESS)
    assert created.status_code == 201
    assert owner.get('/api/auth/me').json()['tipo_cuenta'] == 'negocios'
    assert owner.get('/api/mis-videos').status_code == 200
    assert owner.post('/api/negocios', json={**BUSINESS, 'nombre': 'Segundo negocio'}).status_code == 409
    owner.post('/api/auth/logout')
    login = owner.post('/api/auth/login', json={'correo': 'personal@example.com', 'contrasena': 'Prueba-segura-2026'})
    assert login.json()['tipo_cuenta'] == 'negocios'
    # A different business account still cannot edit someone else's records.
    signup(visitor, 'another-owner@example.com')
    visitor.post('/api/negocios', json=BUSINESS)
    assert visitor.put(f"/api/negocios/{created.json()['id']}", json=BUSINESS).status_code == 403


def test_import_activation_is_atomic(clients):
    owner, _ = clients
    signup(owner, 'legacy-activation@example.com')
    assert owner.post('/api/importar', json={'negocios': [], 'productos': []}).status_code == 200
    assert owner.get('/api/auth/me').json()['tipo_cuenta'] == 'personal'
    business = {**BUSINESS, 'id': 555}
    bad_product = {'id': 1, 'negocioId': 999, 'nombre': 'Prueba', 'precio': 1, 'descripcion': 'Prueba'}
    assert owner.post('/api/importar', json={'negocios': [business], 'productos': [bad_product]}).status_code == 422
    assert owner.get('/api/auth/me').json()['tipo_cuenta'] == 'personal'
    assert owner.get('/api/negocios').json() == []
    assert owner.post('/api/importar', json={'negocios': [business], 'productos': []}).status_code == 200
    assert owner.get('/api/auth/me').json()['tipo_cuenta'] == 'negocios'


def test_migrate_existing_owners_to_business_accounts():
    from sqlalchemy import create_engine, text
    from backend.migrations import migrate_account_types
    isolated = create_engine('sqlite://')
    with isolated.begin() as db:
        db.execute(text('CREATE TABLE users (id INTEGER PRIMARY KEY)'))
        db.execute(text('CREATE TABLE businesses (id INTEGER PRIMARY KEY, owner_id INTEGER)'))
        db.execute(text('INSERT INTO users VALUES (1), (2)'))
        db.execute(text('INSERT INTO businesses VALUES (1, 1)'))
    migrate_account_types(isolated)
    migrate_account_types(isolated)
    with isolated.connect() as db:
        assert list(db.execute(text('SELECT id, tipo_cuenta FROM users ORDER BY id'))) == [(1, 'negocios'), (2, 'personal')]
        assert db.scalar(text('SELECT COUNT(*) FROM businesses')) == 1
    isolated.dispose()


def test_single_business_import_and_database_constraint(clients):
    from sqlalchemy.exc import IntegrityError
    from sqlalchemy.orm import Session
    from backend.models import Business
    owner, _ = clients
    signup(owner, 'single@example.com')
    payload = {'negocios': [{**BUSINESS, 'id': 1}, {**BUSINESS, 'id': 2}], 'productos': []}
    assert owner.post('/api/importar', json=payload).status_code == 422
    assert owner.get('/api/negocios').json() == []
    assert owner.get('/api/auth/me').json()['tipo_cuenta'] == 'personal'
    first = owner.post('/api/negocios', json=BUSINESS).json()
    assert owner.post('/api/negocios', json=BUSINESS).status_code == 409
    assert owner.post('/api/importar', json={'negocios': [payload['negocios'][0]], 'productos': []}).status_code == 409
    assert len(owner.get('/api/negocios').json()) == 1
    with Session(engine) as db:
        db.add(Business(**BUSINESS, owner_id=first['owner_id']))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
    assert owner.put(f"/api/negocios/{first['id']}", json={**BUSINESS, 'nombre': 'Editado'}).status_code == 200


def test_single_business_migration_never_deletes_duplicates():
    from sqlalchemy import create_engine, text
    from backend.migrations import migrate_single_business
    isolated = create_engine('sqlite://')
    with isolated.begin() as db:
        db.execute(text('CREATE TABLE businesses (id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL)'))
        db.execute(text('INSERT INTO businesses VALUES (1, 7), (2, 7)'))
    with pytest.raises(RuntimeError):
        migrate_single_business(isolated)
    with isolated.connect() as db:
        assert db.scalar(text('SELECT COUNT(*) FROM businesses')) == 2
    isolated.dispose()


def test_profile_edits_and_preferences(clients):
    owner, other = clients
    assert owner.patch('/api/auth/profile', json={'nombre': 'Nuevo'}).status_code == 401
    created = signup(owner, 'profile@example.com').json()
    assert created['avatar'] == ''
    assert created['reducir_movimiento'] is False
    updated = owner.patch('/api/auth/profile', json={'nombre': 'Nombre nuevo', 'reducir_movimiento': True})
    assert updated.status_code == 200
    assert updated.json()['nombre'] == 'Nombre nuevo'
    assert updated.json()['reducir_movimiento'] is True
    assert updated.json()['tipo_cuenta'] == 'personal'
    assert 'password_hash' not in updated.json()
    signup(other, 'different-profile@example.com')
    assert other.get('/api/auth/me').json()['nombre'] == 'Usuario'
    for invalid in [{'nombre': ''}, {'nombre': None}, {'reducir_movimiento': None}, {'tipo_cuenta': 'negocios'}, {'correo': 'other@example.com'}, {'avatar': 'javascript:alert(1)'}, {'avatar': '/api/uploads/1/../../file.webp'}]:
        assert owner.patch('/api/auth/profile', json=invalid).status_code == 422
    owner.post('/api/auth/logout')
    login = owner.post('/api/auth/login', json={'correo': 'profile@example.com', 'contrasena': 'Prueba-segura-2026'})
    assert login.json()['nombre'] == 'Nombre nuevo'
    assert login.json()['reducir_movimiento'] is True
    assert owner.patch('/api/auth/profile', json={'reducir_movimiento': False}).json()['reducir_movimiento'] is False


def test_profile_migration_preserves_users():
    from sqlalchemy import create_engine, text
    from backend.migrations import migrate_profile
    isolated = create_engine('sqlite://')
    with isolated.begin() as db:
        db.execute(text('CREATE TABLE users (id INTEGER PRIMARY KEY, nombre VARCHAR(120))'))
        db.execute(text("INSERT INTO users VALUES (1, 'Anterior')"))
    migrate_profile(isolated)
    migrate_profile(isolated)
    with isolated.connect() as db:
        assert db.execute(text('SELECT nombre, avatar, reducir_movimiento FROM users')).one() == ('Anterior', '', 0)
    isolated.dispose()


def test_system_admin_permissions_visibility_and_audit(clients):
    from sqlalchemy.orm import Session
    from sqlalchemy import select
    from backend.models import User
    admin, owner = clients
    assert admin.get('/api/admin/usuarios').status_code == 401
    signup(admin, 'system-admin@example.com')
    signup(owner, 'owner-managed@example.com')
    assert admin.get('/api/admin/negocios').status_code == 403
    with Session(engine) as db:
        account = db.scalar(select(User).where(User.correo == 'system-admin@example.com'))
        account.is_admin = True
        db.commit()
    assert admin.get('/api/auth/me').json()['is_admin'] is True
    target_id = owner.get('/api/auth/me').json()['id']
    response = admin.post('/api/admin/negocios', json={**BUSINESS, 'owner_id': target_id})
    assert response.status_code == 201, response.text
    business_id = response.json()['id']
    assert owner.get('/api/auth/me').json()['tipo_cuenta'] == 'negocios'
    assert admin.post('/api/admin/negocios', json={**BUSINESS, 'owner_id': target_id}).status_code == 409
    assert admin.get('/api/auth/me').json()['tipo_cuenta'] == 'personal'
    users = admin.get('/api/admin/usuarios').json()
    assert len(users) == 2 and all('password_hash' not in u for u in users)
    assert owner.get('/api/admin/usuarios').status_code == 403
    product = {'negocioId': business_id, 'nombre': 'Producto', 'precio': 10, 'descripcion': 'Prueba'}
    p = admin.post('/api/admin/productos', json=product)
    assert p.status_code == 201, p.text
    pid = p.json()['id']
    v = admin.post('/api/admin/videos', json={'negocioId': business_id, 'titulo': 'Video', 'url': 'https://youtu.be/M7lc1UVf-VE'})
    assert v.status_code == 201
    vid = v.json()['id']
    assert admin.put(f'/api/admin/productos/{pid}', json={**product, 'precio': 12}).status_code == 200
    assert admin.patch(f'/api/admin/productos/{pid}/promocion', json={'promocion': True}).json()['promocion'] is True
    assert admin.patch(f'/api/admin/negocios/{business_id}/estado', json={'estado': 'suspendido', 'motivo': 'Motivo de prueba administrativa'}).status_code == 200
    # An unrelated account cannot see the suspended business or its content.
    assert admin.get('/api/negocios').json() == []
    assert admin.get('/api/productos').json() == []
    assert admin.get('/api/videos').json() == []
    # Its owner retains access to fix their information, but cannot bypass moderation.
    assert len(owner.get('/api/negocios').json()) == 1
    assert owner.delete(f'/api/negocios/{business_id}').status_code == 403
    assert owner.put(f'/api/negocios/{business_id}', json={**BUSINESS, 'estado': 'activo'}).status_code == 422
    assert admin.patch(f'/api/admin/negocios/{business_id}/estado', json={'estado': 'activo', 'motivo': 'Motivo de prueba administrativa'}).status_code == 200
    assert len(admin.get('/api/negocios').json()) == 1
    assert admin.request('DELETE', f'/api/admin/negocios/{business_id}', json={'motivo': 'Eliminacion administrativa de prueba'}).status_code == 409
    assert admin.patch(f'/api/admin/negocios/{business_id}/estado', json={'estado': 'archivado', 'motivo': 'Motivo de prueba administrativa'}).status_code == 200
    assert admin.request('DELETE', f'/api/admin/negocios/{business_id}', json={'motivo': 'Eliminacion administrativa de prueba'}).status_code == 409
    assert admin.delete(f'/api/admin/productos/{pid}').status_code == 204
    assert admin.delete(f'/api/admin/videos/{vid}').status_code == 204
    assert admin.request('DELETE', f'/api/admin/negocios/{business_id}', json={'motivo': 'Eliminacion administrativa de prueba'}).status_code == 204
    logs = admin.get('/api/admin/historial').json()
    assert len(logs) >= 10
    assert any(log['accion'] == 'eliminar' and log['recurso'] == 'negocio' for log in logs)
    assert owner.get('/api/admin/historial').status_code == 403
    assert owner.patch('/api/auth/profile', json={'is_admin': True}).status_code == 422


def test_admin_ownership_transfer_and_local_provisioning(clients, monkeypatch):
    from sqlalchemy.orm import Session
    from sqlalchemy import select
    from backend.models import User
    from backend import manage_admin
    admin, owner = clients
    signup(admin, 'admin-local@example.com')
    signup(owner, 'owner-local@example.com')
    monkeypatch.setattr(manage_admin, 'make_engine', lambda: engine)
    monkeypatch.setattr(engine, 'dispose', lambda: None)
    monkeypatch.setattr('sys.argv', ['manage_admin', '--email', 'admin-local@example.com'])
    manage_admin.main()
    assert admin.get('/api/auth/me').status_code == 401
    logged = admin.post('/api/auth/login', json={'correo': 'admin-local@example.com', 'contrasena': 'Prueba-segura-2026'})
    assert logged.json()['is_admin'] is True
    business = owner.post('/api/negocios', json=BUSINESS).json()
    admin_id = logged.json()['id']
    moved = admin.put(f"/api/admin/negocios/{business['id']}", json={**BUSINESS, 'owner_id': admin_id})
    assert moved.status_code == 200, moved.text
    assert owner.put(f"/api/negocios/{business['id']}", json=BUSINESS).status_code == 403
    assert admin.get('/api/admin/historial').json()


def make_admin(client):
    from sqlalchemy.orm import Session
    from sqlalchemy import select
    from backend.models import User
    account = signup(client, 'moderator@example.com').json()
    with Session(engine) as db:
        db.get(User, account['id']).is_admin = True
        db.commit()


def test_moderation_reasons_reviews_and_private_notes(clients):
    admin, owner = clients
    make_admin(admin)
    signup(owner, 'moderation-owner@example.com')
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    published_fixture(bid)
    path = f'/api/admin/negocios/{bid}/estado'
    assert admin.patch(path, json={'estado': 'suspendido'}).status_code == 422
    assert admin.patch(path, json={'estado': 'suspendido', 'motivo': 'Corrige los horarios publicados.', 'nota_interna': 'NOTA_PRIVADA_DE_ADMIN'}).status_code == 200
    state = owner.get('/api/mi-moderacion')
    assert state.json()['historial'][0]['motivo'] == 'Corrige los horarios publicados.'
    assert 'NOTA_PRIVADA' not in state.text and 'nota_interna' not in state.text
    assert admin.get('/api/mi-moderacion').json()['historial'] == []
    assert owner.put(f'/api/negocios/{bid}', json=BUSINESS).status_code == 200
    request = owner.post(f'/api/negocios/{bid}/solicitudes', json={'mensaje': 'Ya corregí los horarios de mi negocio.'})
    assert request.status_code == 201, request.text
    rid = request.json()['id']
    assert owner.post(f'/api/negocios/{bid}/solicitudes', json={'mensaje': 'Otra solicitud duplicada.'}).status_code == 409
    assert admin.post(f'/api/negocios/{bid}/solicitudes', json={'mensaje': 'No es mi negocio.'}).status_code == 404
    assert owner.get('/api/admin/solicitudes').status_code == 403
    assert 'NOTA_PRIVADA_DE_ADMIN' in admin.get('/api/admin/solicitudes').text
    assert owner.patch(f'/api/admin/solicitudes/{rid}', json={'decision': 'aprobar', 'respuesta': 'Respuesta falsa.'}).status_code == 403
    assert admin.patch(f'/api/admin/solicitudes/{rid}', json={'decision': 'rechazar', 'respuesta': 'Falta corregir el horario de cierre.'}).status_code == 200
    assert owner.get('/api/mi-moderacion').json()['solicitudes'][0]['estado'] == 'rechazada'
    assert owner.get('/api/mi-moderacion').json()['negocio']['estado'] == 'suspendido'
    retry = owner.post(f'/api/negocios/{bid}/solicitudes', json={'mensaje': 'Ahora corregí también el horario de cierre.'})
    assert retry.status_code == 201
    assert admin.patch(f"/api/admin/solicitudes/{retry.json()['id']}", json={'decision': 'aprobar', 'respuesta': 'La corrección está completa.'}).status_code == 200
    assert owner.get('/api/mi-moderacion').json()['negocio']['estado'] == 'activo'
    notices = owner.get('/api/notificaciones').json()
    assert notices['no_leidas'] >= 3
    nid = notices['items'][0]['id']
    assert admin.patch(f'/api/notificaciones/{nid}/leida').status_code == 404
    assert owner.patch(f'/api/notificaciones/{nid}/leida').status_code == 204
    assert owner.get('/api/notificaciones').json()['no_leidas'] == notices['no_leidas'] - 1


def test_archived_readonly_stale_reviews_and_deletion_authorization(clients):
    admin, owner = clients
    make_admin(admin)
    signup(owner, 'archived-owner@example.com')
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    published_fixture(bid)
    path = f'/api/admin/negocios/{bid}/estado'
    assert admin.patch(path, json={'estado': 'suspendido', 'motivo': 'Corregir información.'}).status_code == 200
    rid = owner.post(f'/api/negocios/{bid}/solicitudes', json={'mensaje': 'Solicito revisar la información.'}).json()['id']
    assert admin.patch(path, json={'estado': 'archivado', 'motivo': 'El negocio dejó de operar.'}).status_code == 200
    assert owner.get('/api/mi-moderacion').json()['solicitudes'][0]['estado'] == 'cerrada'
    assert admin.patch(f'/api/admin/solicitudes/{rid}', json={'decision': 'aprobar', 'respuesta': 'Una respuesta tardía.'}).status_code == 409
    assert owner.put(f'/api/negocios/{bid}', json=BUSINESS).status_code == 403
    assert owner.post('/api/productos', json={'negocioId': bid, 'nombre': 'Otro', 'precio': 1, 'descripcion': 'Prueba'}).status_code == 403
    restore = owner.post(f'/api/negocios/{bid}/solicitudes', json={'mensaje': 'Quiero volver a abrir mi negocio.'})
    assert restore.status_code == 201
    assert admin.patch(f"/api/admin/solicitudes/{restore.json()['id']}", json={'decision': 'aprobar', 'respuesta': 'Restauración autorizada.'}).status_code == 200
    assert owner.put(f'/api/negocios/{bid}', json=BUSINESS).status_code == 200
    admin.patch(path, json={'estado': 'archivado', 'motivo': 'Se procederá a la eliminación.'})
    deleted = admin.request('DELETE', f'/api/admin/negocios/{bid}', json={'motivo': 'El negocio fue eliminado por cierre definitivo.', 'nota_interna': 'SECRETO_INTERNO'})
    assert deleted.status_code == 204, deleted.text
    state = owner.get('/api/mi-moderacion')
    assert state.json()['negocio'] is None
    assert state.json()['historial'][0]['estado'] == 'eliminado'
    assert state.json()['puede_registrar'] is False
    assert owner.get('/api/auth/me').json()['tipo_cuenta'] == 'personal'
    assert state.json()['registro_disponible_desde'] is None
    assert 'SECRETO' not in state.text
    assert owner.post('/api/negocios', json=BUSINESS).status_code == 403
    assert owner.post('/api/importar', json={'negocios': [{**BUSINESS, 'id': 1}], 'productos': []}).status_code == 403
    permission = owner.post('/api/mi-moderacion/contacto', json={'mensaje': 'Solicito autorización para registrar otro emprendimiento.'})
    assert permission.status_code == 201
    assert owner.post('/api/mi-moderacion/contacto', json={'mensaje': 'Otra solicitud de autorización.'}).status_code == 409
    assert admin.patch(f"/api/admin/solicitudes/{permission.json()['id']}", json={'decision': 'aprobar', 'respuesta': 'Puedes registrar un nuevo negocio.'}).status_code == 200
    assert owner.get('/api/auth/me').json()['puede_registrar'] is True
    assert owner.post('/api/negocios', json=BUSINESS).status_code == 201
    assert owner.post('/api/negocios', json=BUSINESS).status_code == 409
    assert any(e['estado'] == 'eliminado' for e in owner.get('/api/mi-moderacion').json()['historial'])
    assert owner.patch('/api/auth/profile', json={'puede_registrar': True}).status_code == 422


def test_admin_registration_permission_and_contact(clients):
    admin, owner = clients
    make_admin(admin)
    uid = signup(owner, 'permission-owner@example.com').json()['id']
    path = f'/api/admin/usuarios/{uid}/registro-negocio'
    assert owner.patch(path, json={'permitir': True, 'motivo': 'Auto autorización falsa.'}).status_code == 403
    assert admin.patch(path, json={'permitir': False}).status_code == 422
    assert admin.patch(path, json={'permitir': False, 'motivo': 'Verificación de identidad pendiente.'}).status_code == 200
    assert owner.post('/api/negocios', json=BUSINESS).status_code == 403
    request = owner.post('/api/mi-moderacion/contacto', json={'mensaje': 'Solicito completar la verificación para registrar mi negocio.'})
    assert request.status_code == 201, request.text
    assert admin.get('/api/admin/solicitudes').json()[0]['tipo_solicitud'] == 'registro'
    assert admin.patch(path, json={'permitir': True, 'motivo': 'Identidad verificada por administración.'}).status_code == 200
    assert owner.get('/api/mi-moderacion').json()['solicitudes'][0]['estado'] == 'cerrada'
    assert admin.patch(f"/api/admin/solicitudes/{request.json()['id']}", json={'decision': 'aprobar', 'respuesta': 'Solicitud ya cerrada.'}).status_code == 409
    assert owner.post('/api/negocios', json=BUSINESS).status_code == 201


def test_admin_cannot_restrict_itself_even_through_business_deletion(clients):
    admin, other = clients
    make_admin(admin)
    account = admin.get('/api/auth/me').json()
    uid = account['id']
    path = f'/api/admin/usuarios/{uid}/registro-negocio'
    before = admin.get('/api/admin/historial').json()
    notices = admin.get('/api/notificaciones').json()
    response = admin.patch(path, json={'permitir': False, 'motivo': 'Intento de restringir mi propia cuenta.'})
    assert response.status_code == 409
    assert 'propia cuenta' in response.json()['detail']
    assert admin.get('/api/auth/me').json()['puede_registrar'] is True
    assert admin.get('/api/admin/historial').json() == before
    assert admin.get('/api/notificaciones').json() == notices
    row = next(u for u in admin.get('/api/admin/usuarios').json() if u['id'] == uid)
    assert row['restriccion_bloqueada']
    bid = admin.post('/api/negocios', json=BUSINESS).json()['id']
    assert admin.patch(f'/api/admin/negocios/{bid}/estado', json={'estado': 'archivado', 'motivo': 'Negocio propio archivado.'}).status_code == 200
    assert admin.request('DELETE', f'/api/admin/negocios/{bid}', json={'motivo': 'Intento de eliminar mi negocio.'}).status_code == 409
    assert admin.get('/api/mi-moderacion').json()['negocio']['id'] == bid
    assert admin.get('/api/auth/me').json()['is_admin'] is True
    assert admin.patch('/api/auth/profile', json={'is_admin': False}).status_code == 422
    assert signup(other, 'second-admin@example.com').status_code == 201
    from sqlalchemy.orm import Session
    from backend.models import User
    with Session(engine) as db:
        db.get(User, other.get('/api/auth/me').json()['id']).is_admin = True
        db.commit()
    # Another administrator may moderate this account, but never remove its role.
    assert other.patch(path, json={'permitir': False, 'motivo': 'Restricción aplicada por otro administrador.'}).status_code == 200
    assert admin.get('/api/auth/me').json()['is_admin'] is True
    assert admin.patch(path, json={'permitir': False, 'motivo': 'Sigue siendo una autorrestricción.'}).status_code == 409


def test_admin_creates_personal_user_without_replacing_session(clients):
    admin, visitor = clients
    payload = {'nombre': 'Nueva Persona', 'correo': 'NUEVA@example.com',
               'contrasena': 'Una-clave-de-prueba-2026'}
    assert visitor.post('/api/admin/usuarios', json=payload).status_code == 401
    signup(visitor, 'ordinary@example.com')
    assert visitor.post('/api/admin/usuarios', json=payload).status_code == 403
    make_admin(admin)
    original = admin.get('/api/auth/me').json()['id']
    assert admin.post('/api/admin/usuarios', json={**payload, 'is_admin': True}).status_code == 422
    assert admin.post('/api/admin/usuarios', json={**payload, 'contrasena': 'corta'}).status_code == 422
    response = admin.post('/api/admin/usuarios', json=payload)
    assert response.status_code == 201, response.text
    account = response.json()
    assert account['correo'] == 'nueva@example.com'
    assert account['tipo_cuenta'] == 'personal'
    assert account['is_admin'] is False
    assert 'password' not in response.text and payload['contrasena'] not in response.text
    assert 'set-cookie' not in response.headers
    assert admin.get('/api/auth/me').json()['id'] == original
    assert admin.post('/api/admin/usuarios', json=payload).status_code == 409
    history = admin.get('/api/admin/historial').json()
    creations = [log for log in history if log['recurso'] == 'usuario' and log['accion'] == 'crear']
    assert len(creations) == 1
    assert creations[0]['actor_id'] == original
    assert payload['contrasena'] not in str(history)
    from sqlalchemy.orm import Session
    from backend.models import User
    from backend.security import verify_password
    with Session(engine) as db:
        saved = db.get(User, account['id'])
        assert saved.password_hash != payload['contrasena']
        assert verify_password(payload['contrasena'], saved.password_hash)
    assert visitor.post('/api/auth/login', json={'correo': account['correo'], 'contrasena': payload['contrasena']}).status_code == 200
    assert visitor.get('/api/admin/usuarios').status_code == 403


def test_voluntary_deletion_returns_personal_and_enforces_wait_everywhere(clients):
    from datetime import datetime, timedelta
    from sqlalchemy.orm import Session
    from backend.models import User
    from backend.main import now
    owner, admin = clients
    uid = signup(owner, 'wait-owner@example.com').json()['id']
    make_admin(admin)
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    published_fixture(bid)
    before = now()
    assert owner.delete(f'/api/negocios/{bid}').status_code == 204
    account = owner.get('/api/auth/me').json()
    assert account['tipo_cuenta'] == 'personal'
    assert account['puede_registrar'] is True
    deadline = datetime.fromisoformat(account['registro_disponible_desde'])
    assert before + timedelta(days=15) <= deadline <= now() + timedelta(days=15)
    state = owner.get('/api/mi-moderacion').json()
    assert state['negocio'] is None
    assert state['registro_disponible_desde'] == account['registro_disponible_desde']
    assert state['historial'][0]['estado'] == 'eliminado'
    assert owner.post('/api/negocios', json=BUSINESS).status_code == 403
    assert owner.post('/api/importar', json={'negocios': [{**BUSINESS, 'id': 12}], 'productos': []}).status_code == 403
    assert admin.post('/api/admin/negocios', json={**BUSINESS, 'owner_id': uid}).status_code == 403
    assert owner.patch('/api/auth/profile', json={'registro_disponible_desde': None}).status_code == 422
    # Authorization is independent: it cannot shorten a voluntary waiting period.
    assert admin.patch(f'/api/admin/usuarios/{uid}/registro-negocio', json={'permitir': True, 'motivo': 'Autorización sin saltar el plazo.'}).status_code == 200
    assert owner.post('/api/negocios', json=BUSINESS).status_code == 403
    with Session(engine) as db:
        db.get(User, uid).registro_disponible_desde = now() - timedelta(seconds=1)
        db.commit()
    assert owner.post('/api/negocios', json=BUSINESS).status_code == 201
    assert owner.get('/api/auth/me').json()['tipo_cuenta'] == 'negocios'


@pytest.mark.parametrize('restricted', [False, True])
def test_only_admin_can_lift_wait_without_changing_permission(clients, restricted):
    owner, admin = clients
    uid = signup(owner, 'lift-owner@example.com').json()['id']
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    published_fixture(bid)
    assert owner.delete(f'/api/negocios/{bid}').status_code == 204
    make_admin(admin)
    path = f'/api/admin/usuarios/{uid}/levantar-espera'
    body = {'motivo': 'Se autoriza levantar la espera tras verificar la cuenta.', 'nota_interna': 'DETALLE_PRIVADO_ESPERA'}
    assert owner.patch(path, json=body).status_code == 403
    assert admin.patch(path, json={}).status_code == 422
    if restricted:
        assert admin.patch(f'/api/admin/usuarios/{uid}/registro-negocio', json={'permitir': False, 'motivo': 'Autorización adicional pendiente.'}).status_code == 200
    row = next(u for u in admin.get('/api/admin/usuarios').json() if u['id'] == uid)
    assert row['registro_disponible_desde']
    response = admin.patch(path, json=body)
    assert response.status_code == 200
    assert response.json()['registro_disponible_desde'] is None
    assert response.json()['puede_registrar'] is (not restricted)
    assert owner.get('/api/auth/me').json()['registro_disponible_desde'] is None
    notices = owner.get('/api/notificaciones')
    assert 'Espera de registro levantada' in notices.text
    assert 'DETALLE_PRIVADO_ESPERA' not in notices.text
    assert admin.patch(path, json=body).status_code == 409
    logs = [log for log in admin.get('/api/admin/historial').json() if log['accion'] == 'levantar_espera']
    assert len(logs) == 1
    assert logs[0]['detalle']['fecha_anterior']
    assert owner.post('/api/negocios', json=BUSINESS).status_code == (403 if restricted else 201)


def test_business_images_dimensions_alpha_and_crop(clients, tmp_path, monkeypatch):
    import io
    from PIL import Image
    import backend.uploads as uploads
    monkeypatch.setattr(uploads, 'UPLOAD_DIR', tmp_path)
    owner, _ = clients
    signup(owner, 'adjust-images@example.com')

    def send(image, query):
        output = io.BytesIO()
        image.save(output, format='PNG')
        return owner.post(f'/api/imagenes?{query}', files={'file': ('photo.png', output.getvalue(), 'image/png')})

    def saved(response):
        assert response.status_code == 201, response.text
        return Image.open(tmp_path / response.json()['url'].removeprefix('/api/uploads/'))

    assert send(Image.new('RGB', (199, 300)), 'purpose=logo').status_code == 201
    assert send(Image.new('RGB', (799, 600)), 'purpose=facade').status_code == 201
    for purpose in ['logo', 'facade']:
        with saved(send(Image.new('RGB', (1, 1)), f'purpose={purpose}&zoom=3&x=1&y=1')) as tiny:
            assert tiny.width > 0 and tiny.height > 0
    with saved(send(Image.new('RGBA', (400, 200), (120, 0, 200, 255)), 'purpose=logo')) as image:
        assert image.size == (512, 512)
        assert image.convert('RGBA').getpixel((0, 0))[3] == 0
        assert image.convert('RGBA').getpixel((256, 256))[3] == 255
    wide = Image.new('RGB', (1600, 450), 'red')
    wide.paste('blue', (800, 0, 1600, 450))
    for x, color in [(0, 0), (1, 2)]:
        with saved(send(wide, f'purpose=facade&x={x}&zoom=1')) as image:
            assert image.size == (800, 450)
            pixel = image.convert('RGB').getpixel((400, 225))
            assert pixel[color] > 220
    with saved(send(Image.new('RGB', (1000, 1800)), 'purpose=facade&y=1')) as image:
        assert image.width * 9 == image.height * 16
        assert image.width >= 800
    assert send(wide, 'purpose=facade&zoom=2').status_code == 201
    assert send(wide, 'purpose=facade&x=nan').status_code == 422
    assert send(wide, 'purpose=unknown').status_code == 422


def test_description_limits_for_owner_and_admin(clients):
    owner, admin = clients
    uid = signup(owner, 'description@example.com').json()['id']
    make_admin(admin)
    for client, path, extra in [(owner, '/api/negocios', {}), (admin, '/api/admin/negocios', {'owner_id': uid})]:
        assert client.post(path, json={**BUSINESS, **extra, 'descripcion': 'x' * 501}).status_code == 422
    business = owner.post('/api/negocios', json={**BUSINESS, 'descripcion': 'x' * 500})
    assert business.status_code == 201
    bid = business.json()['id']
    product = {'negocioId': bid, 'nombre': 'Producto', 'precio': 10, 'descripcion': 'x' * 501}
    for client, prefix in [(owner, '/api'), (admin, '/api/admin')]:
        assert client.post(f'{prefix}/productos', json=product).status_code == 422
        assert client.put(f'{prefix}/negocios/{bid}', json={**BUSINESS, **({'owner_id': uid} if client is admin else {}), 'descripcion': 'x' * 501}).status_code == 422
    assert owner.post('/api/productos', json={**product, 'descripcion': 'x' * 500}).status_code == 201
    assert owner.get('/api/negocios').json()[0]['descripcion'] == 'x' * 500


def test_opening_days_are_validated_and_saved_for_owner_and_admin(clients):
    owner, admin = clients
    uid = signup(owner, 'opening-days@example.com').json()['id']
    make_admin(admin)
    for value in ['lunes', 'lun,lun', 'lun,invalid', 'lun,', 'LUN', 'lun, mar']:
        assert owner.post('/api/negocios', json={**BUSINESS, 'dias_atencion': value}).status_code == 422
        assert admin.post('/api/admin/negocios', json={**BUSINESS, 'owner_id': uid, 'dias_atencion': value}).status_code == 422
    response = owner.post('/api/negocios', json={**BUSINESS, 'dias_atencion': 'sab,lun,mie'})
    assert response.status_code == 201
    assert response.json()['dias_atencion'] == 'lun,mie,sab'
    bid = response.json()['id']
    changed = admin.put(f'/api/admin/negocios/{bid}', json={**BUSINESS, 'owner_id': uid, 'dias_atencion': 'dom,mar'})
    assert changed.status_code == 200
    assert changed.json()['dias_atencion'] == 'mar,dom'
    assert owner.get('/api/negocios').json()[0]['dias_atencion'] == 'mar,dom'
    assert owner.put(f'/api/negocios/{bid}', json={**BUSINESS, 'dias_atencion': ''}).json()['dias_atencion'] == ''


def test_reports_permissions_privacy_review_and_notifications(clients):
    reporter, owner = clients
    signup(reporter, 'reporter@example.com')
    signup(owner, 'reported-owner@example.com')
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    published_fixture(bid)
    pid = owner.post('/api/productos', json={'negocioId': bid, 'nombre': 'Producto anunciado', 'precio': 10, 'descripcion': 'Descripción del producto.'}).json()['id']
    body = {'tipo': 'producto', 'objetivo_id': pid, 'motivo': 'producto_distinto', 'explicacion': 'El producto entregado no coincide con la descripción publicada.'}
    assert owner.post('/api/reportes', json=body).status_code == 403
    assert reporter.get('/api/admin/reportes').status_code == 403
    assert reporter.post('/api/reportes', json={**body, 'explicacion': 'corta'}).status_code == 422
    assert reporter.post('/api/reportes', json={**body, 'motivo': 'invalido'}).status_code == 422
    assert reporter.post('/api/reportes', json={**body, 'objetivo_id': 99999}).status_code == 404
    with TestClient(app, headers=ORIGIN) as admin:
        assert admin.post('/api/reportes', json=body).status_code == 401
        make_admin(admin)
        response = reporter.post('/api/reportes', json=body)
        assert response.status_code == 201, response.text
        rid = response.json()['id']
        assert 'reporter_id' not in response.json() and 'pending_key' not in response.json()
        assert reporter.post('/api/reportes', json=body).status_code == 409
        assert owner.get('/api/mis-reportes').json() == []
        assert reporter.get('/api/mis-reportes').json()[0]['id'] == rid
        listing = admin.get('/api/admin/reportes').json()
        assert listing[0]['correo_reportante'] == 'reporter@example.com'
        assert 'Nuevo reporte' in admin.get('/api/notificaciones').text
        path = f'/api/admin/reportes/{rid}'
        assert owner.patch(path, json={'estado': 'en_revision'}).status_code == 403
        assert admin.patch(path, json={'estado': 'en_revision'}).status_code == 200
        assert reporter.post('/api/reportes', json=body).status_code == 409
        assert admin.patch(path, json={'estado': 'en_revision'}).status_code == 409
        assert admin.patch(path, json={'estado': 'resuelto'}).status_code == 422
        assert admin.patch(path, json={'estado': 'resuelto', 'resultado': 'descartado', 'respuesta': 'La información publicada coincide con lo comprobado.'}).status_code == 200
        assert reporter.get('/api/mis-reportes').json()[0]['estado'] == 'resuelto'
        assert 'Tu reporte fue resuelto' in reporter.get('/api/notificaciones').text
        assert 'reporter@example.com' not in owner.get('/api/notificaciones').text
        assert admin.patch(path, json={'estado': 'en_revision'}).status_code == 409
        assert reporter.get('/api/negocios').json()[0]['estado'] == 'activo'
        assert reporter.get('/api/productos').json()[0]['id'] == pid
        assert reporter.post('/api/reportes', json=body).status_code == 201
        assert any(log['accion'] == 'revisar_reporte' for log in admin.get('/api/admin/historial').json())


def test_business_reports_hidden_targets_and_deleted_product_snapshots(clients):
    reporter, owner = clients
    signup(reporter, 'business-reporter@example.com')
    signup(owner, 'business-owner@example.com')
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    published_fixture(bid)
    body = {'tipo': 'negocio', 'objetivo_id': bid, 'motivo': 'informacion_enganosa', 'explicacion': 'La información de ubicación publicada necesita una revisión.'}
    assert reporter.post('/api/reportes', json=body).status_code == 201
    assert owner.post('/api/reportes', json=body).status_code == 403
    pid = owner.post('/api/productos', json={'negocioId': bid, 'nombre': 'Producto temporal', 'precio': 10, 'descripcion': 'Producto para revisar.'}).json()['id']
    product = {**body, 'tipo': 'producto', 'objetivo_id': pid}
    rid = reporter.post('/api/reportes', json=product).json()['id']
    assert owner.delete(f'/api/productos/{pid}').status_code == 204
    assert any(r['nombre_objetivo'] == 'Producto temporal' for r in reporter.get('/api/mis-reportes').json())
    with TestClient(app, headers=ORIGIN) as admin:
        make_admin(admin)
        listing = admin.get('/api/admin/reportes').json()
        assert next(r for r in listing if r['id'] == rid)['objetivo_existe'] is False
        assert admin.patch(f'/api/admin/reportes/{rid}', json={'estado': 'resuelto', 'resultado': 'medidas', 'respuesta': 'El producto ya fue retirado del catálogo.'}).status_code == 200
        assert admin.patch(f'/api/admin/negocios/{bid}/estado', json={'estado': 'suspendido', 'motivo': 'Se revisa su información.'}).status_code == 200
        assert reporter.post('/api/reportes', json=body).status_code == 404


def test_publication_registration_is_private_until_approved(clients):
    owner, admin = clients
    signup(owner, 'publication-owner@example.com')
    make_admin(admin)
    assert owner.post('/api/negocios', json={**BUSINESS, 'telefono': ''}).status_code == 422
    business = owner.post('/api/negocios', json=BUSINESS).json()
    bid = business['id']
    assert business['estado'] == 'pendiente' and business['publicacion_aprobada'] is False
    assert admin.get('/api/negocios').json() == []
    product = owner.post('/api/productos', json={'negocioId': bid, 'nombre': 'Preparado', 'precio': 10, 'descripcion': 'Catálogo en preparación.'})
    assert product.status_code == 201
    assert admin.get('/api/productos').json() == []
    assert owner.get('/api/admin/publicaciones').status_code == 403
    application = admin.get('/api/admin/publicaciones').json()[0]
    assert application['estado'] == 'pendiente'
    assert 'Publicación de negocio pendiente' in admin.get('/api/notificaciones').text
    assert admin.patch(f'/api/admin/negocios/{bid}/estado', json={'estado': 'activo', 'motivo': 'Intento de saltar la aprobación.'}).status_code == 409
    response = admin.patch(f"/api/admin/publicaciones/{application['id']}", json={'decision': 'aprobar', 'version': application['version'], 'motivo': 'Datos y fachada revisados para publicar.'})
    assert response.status_code == 200, response.text
    assert admin.get('/api/negocios').json()[0]['estado'] == 'activo'
    assert admin.get('/api/productos').json()[0]['id'] == product.json()['id']
    assert owner.get('/api/mi-publicacion').json()['estado'] == 'aprobado'


def test_sensitive_proposals_preserve_live_data_and_reject_stale_decisions(clients):
    owner, admin = clients
    signup(owner, 'sensitive-owner@example.com')
    make_admin(admin)
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    published_fixture(bid)
    assert owner.put(f'/api/negocios/{bid}', json={**BUSINESS, 'descripcion': 'Descripción actualizada.'}).status_code == 200
    assert admin.get('/api/negocios').json()[0]['descripcion'] == 'Descripción actualizada.'
    proposed = {**BUSINESS, 'nombre': 'Nuevo nombre propuesto', 'direccion': 'Otra dirección propuesta', 'descripcion': 'Descripción propuesta.'}
    assert owner.put(f'/api/negocios/{bid}', json=proposed).status_code == 200
    public = admin.get('/api/negocios').json()[0]
    assert public['nombre'] == BUSINESS['nombre'] and public['direccion'] == BUSINESS['direccion']
    application = owner.get('/api/mi-publicacion').json()
    assert application['propuesta']['nombre'] == proposed['nombre']
    assert admin.get('/api/mi-publicacion').json() is None
    newer = {**proposed, 'nombre': 'Nombre corregido antes de aprobar'}
    owner.put(f'/api/negocios/{bid}', json=newer)
    path = f"/api/admin/publicaciones/{application['id']}"
    body = {'decision': 'aprobar', 'version': application['version'], 'motivo': 'Revisión de datos.'}
    assert admin.patch(path, json=body).status_code == 409
    body['version'] = owner.get('/api/mi-publicacion').json()['version']
    assert admin.patch(path, json=body).status_code == 200
    assert admin.get('/api/negocios').json()[0]['nombre'] == newer['nombre']
    assert admin.patch(path, json=body).status_code == 409


def test_publication_corrections_resubmission_limit_and_duplicate_alerts(clients, monkeypatch):
    from datetime import timedelta
    import backend.publication as publication
    owner, admin = clients
    signup(owner, 'corrections-owner@example.com')
    make_admin(admin)
    admin_id = admin.get('/api/auth/me').json()['id']
    assert admin.post('/api/admin/negocios', json={**BUSINESS, 'owner_id': admin_id}).status_code == 201
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    application = next(a for a in admin.get('/api/admin/publicaciones').json() if a['negocio_id'] == bid)
    assert set(application['duplicados'][0]['coincidencias']) == {'nombre', 'dirección', 'teléfono'}
    path = f"/api/admin/publicaciones/{application['id']}"
    for attempt in range(1, 4):
        current = owner.get('/api/mi-publicacion').json()
        assert admin.patch(path, json={'decision': 'correcciones', 'version': current['version'], 'motivo': 'Corrige la dirección y los datos de contacto.'}).status_code == 200
        assert owner.get('/api/mi-moderacion').json()['negocio']['estado'] == 'correcciones'
        assert owner.put(f'/api/negocios/{bid}', json={**BUSINESS, 'direccion': f'Dirección corregida {attempt}'}).status_code == 200
        response = owner.post(f'/api/negocios/{bid}/solicitar-publicacion')
        assert response.status_code == (200 if attempt < 3 else 429)
    original_now = publication.now
    monkeypatch.setattr(publication, 'now', lambda: original_now() + timedelta(hours=25))
    assert owner.post(f'/api/negocios/{bid}/solicitar-publicacion').status_code == 200
    current = owner.get('/api/mi-publicacion').json()
    assert current['envios'] == 1
    assert admin.patch(path, json={'decision': 'rechazar', 'version': current['version'], 'motivo': 'La información no permite publicar este negocio.'}).status_code == 200
    assert owner.get('/api/mi-moderacion').json()['negocio']['estado'] == 'rechazado'
    assert all(b['id'] != bid for b in admin.get('/api/negocios').json())


def test_initial_publication_cannot_bypass_review_via_archive_or_import(clients):
    owner, admin = clients
    signup(owner, 'import-review@example.com')
    make_admin(admin)
    response = owner.post('/api/importar', json={'negocios': [{**BUSINESS, 'id': 500}], 'productos': []})
    assert response.status_code == 200
    bid = owner.get('/api/mi-moderacion').json()['negocio']['id']
    assert owner.get('/api/mi-moderacion').json()['negocio']['estado'] == 'pendiente'
    status = f'/api/admin/negocios/{bid}/estado'
    assert admin.patch(status, json={'estado': 'archivado', 'motivo': 'Se archiva sin publicar.'}).status_code == 200
    assert admin.patch(status, json={'estado': 'activo', 'motivo': 'Intento de restaurar sin revisión.'}).status_code == 409
    assert admin.patch(status, json={'estado': 'pendiente', 'motivo': 'Reabrir la revisión de publicación.'}).status_code == 200
    application = owner.get('/api/mi-publicacion').json()
    assert application['estado'] == 'pendiente'
    assert admin.patch(f"/api/admin/publicaciones/{application['id']}", json={'decision': 'aprobar', 'version': application['version'], 'motivo': 'Revisión inicial completada.'}).status_code == 200


def test_admin_edit_closes_old_sensitive_proposal(clients):
    owner, admin = clients
    uid = signup(owner, 'closed-proposal@example.com').json()['id']
    make_admin(admin)
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    published_fixture(bid)
    owner.put(f'/api/negocios/{bid}', json={**BUSINESS, 'nombre': 'Cambio pendiente'})
    application = owner.get('/api/mi-publicacion').json()
    assert admin.put(f'/api/admin/negocios/{bid}', json={**BUSINESS, 'owner_id': uid, 'nombre': 'Nombre fijado por administración'}).status_code == 200
    assert owner.get('/api/mi-publicacion').json()['estado'] == 'cerrada'
    assert owner.post(f'/api/negocios/{bid}/solicitar-publicacion').status_code == 409
    assert admin.patch(f"/api/admin/publicaciones/{application['id']}", json={'decision': 'aprobar', 'version': application['version'], 'motivo': 'No debe aplicar la propuesta anterior.'}).status_code == 409
    assert owner.get('/api/negocios').json()[0]['nombre'] == 'Nombre fijado por administración'


def test_rejected_sensitive_changes_do_not_hide_or_change_approved_business(clients):
    owner, admin = clients
    signup(owner, 'rejected-changes@example.com')
    make_admin(admin)
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    published_fixture(bid)
    proposed = {**BUSINESS, 'nombre': 'Cambio que no será aprobado', 'imagen': 'https://example.com/otra-fachada.jpg'}
    assert owner.put(f'/api/negocios/{bid}', json=proposed).status_code == 200
    item = owner.get('/api/mi-publicacion').json()
    assert admin.patch(f"/api/admin/publicaciones/{item['id']}", json={'decision': 'rechazar', 'version': item['version'], 'motivo': 'La fachada propuesta no coincide con el negocio.'}).status_code == 200
    public = admin.get('/api/negocios').json()[0]
    assert public['estado'] == 'activo'
    assert public['nombre'] == BUSINESS['nombre'] and public['imagen'] == BUSINESS['imagen']
    assert owner.get('/api/mi-publicacion').json()['propuesta']['nombre'] == proposed['nombre']
    assert owner.post(f'/api/negocios/{bid}/solicitar-publicacion').status_code == 200


def test_registration_wait_expires_at_exact_deadline():
    from datetime import datetime, timedelta
    from types import SimpleNamespace
    from fastapi import HTTPException
    from backend.registration import check_registration_wait
    deadline = datetime(2026, 12, 1, 12)
    user = SimpleNamespace(registro_disponible_desde=deadline)
    with pytest.raises(HTTPException):
        check_registration_wait(user, deadline - timedelta(microseconds=1))
    check_registration_wait(user, deadline)
    check_registration_wait(user, deadline + timedelta(seconds=1))


def test_moderation_migration_preserves_existing_records():
    from sqlalchemy import create_engine, text
    from backend.migrations import migrate_moderation
    isolated = create_engine('sqlite://')
    with isolated.begin() as db:
        db.execute(text('CREATE TABLE users (id INTEGER PRIMARY KEY)'))
        db.execute(text('CREATE TABLE businesses (id INTEGER PRIMARY KEY, owner_id INTEGER, nombre TEXT, estado TEXT)'))
        db.execute(text('CREATE TABLE moderation_events (id INTEGER PRIMARY KEY, user_id INTEGER, negocio_id INTEGER, nombre_negocio TEXT, estado TEXT, motivo TEXT, nota_interna TEXT, fecha DATETIME)'))
        db.execute(text('INSERT INTO users VALUES (1)'))
        db.execute(text("INSERT INTO businesses VALUES (1,1,'Anterior','suspendido')"))
    migrate_moderation(isolated)
    migrate_moderation(isolated)
    with isolated.connect() as db:
        assert db.scalar(text('SELECT COUNT(*) FROM moderation_events')) == 1
        assert db.scalar(text('SELECT COUNT(*) FROM businesses')) == 1
        assert db.scalar(text('SELECT puede_registrar FROM users')) == 1
    isolated.dispose()
