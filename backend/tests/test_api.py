import os

import pytest
from fastapi.testclient import TestClient

# The test database is separate from MySQL and from any user's records.
os.environ['DATABASE_URL'] = 'sqlite://'
from backend.main import app, engine
from backend.database import Base

ORIGIN = {'Origin': 'http://localhost:5173'}
BUSINESS = {'nombre': 'Café', 'categoria': 'Comida', 'direccion': 'Cerca del instituto',
            'descripcion': 'Desayunos', 'latitud': -16.5, 'longitud': -68.1}


@pytest.fixture
def clients():
    Base.metadata.drop_all(engine)
    with TestClient(app, headers=ORIGIN) as owner, TestClient(app, headers=ORIGIN) as other:
        yield owner, other


def signup(client, correo):
    return client.post('/api/auth/register', json={'nombre': 'Usuario', 'correo': correo,
                                                  'contrasena': 'Prueba-segura-2026'})


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
    isolated.dispose()


def test_video_permissions_and_links(clients):
    owner, other = clients
    assert owner.get('/api/videos').status_code == 401
    assert owner.post('/api/videos', json={'negocioId': 1, 'titulo': 'Prueba', 'url': 'https://youtu.be/M7lc1UVf-VE'}).status_code == 401
    signup(owner, 'video-owner@example.com')
    signup(other, 'video-other@example.com')
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
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
    assert admin.patch(f'/api/admin/negocios/{business_id}/estado', json={'estado': 'suspendido'}).status_code == 200
    # An unrelated account cannot see the suspended business or its content.
    assert admin.get('/api/negocios').json() == []
    assert admin.get('/api/productos').json() == []
    assert admin.get('/api/videos').json() == []
    # Its owner retains access to fix their information, but cannot bypass moderation.
    assert len(owner.get('/api/negocios').json()) == 1
    assert owner.delete(f'/api/negocios/{business_id}').status_code == 403
    assert owner.put(f'/api/negocios/{business_id}', json={**BUSINESS, 'estado': 'activo'}).status_code == 422
    assert admin.patch(f'/api/admin/negocios/{business_id}/estado', json={'estado': 'activo'}).status_code == 200
    assert len(admin.get('/api/negocios').json()) == 1
    assert admin.delete(f'/api/admin/negocios/{business_id}').status_code == 409
    assert admin.patch(f'/api/admin/negocios/{business_id}/estado', json={'estado': 'archivado'}).status_code == 200
    assert admin.delete(f'/api/admin/negocios/{business_id}').status_code == 409
    assert admin.delete(f'/api/admin/productos/{pid}').status_code == 204
    assert admin.delete(f'/api/admin/videos/{vid}').status_code == 204
    assert admin.delete(f'/api/admin/negocios/{business_id}').status_code == 204
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
