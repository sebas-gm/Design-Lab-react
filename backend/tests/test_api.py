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
