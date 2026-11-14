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
    assert owner.post('/api/importar', json=bad).status_code == 422
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
    assert owner.get('/api/videos').json() == []
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
    assert other.get('/api/mis-videos').json() == []
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
