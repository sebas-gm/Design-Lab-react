from datetime import datetime, timedelta
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from backend.tests.test_api import clients, signup, published_fixture, make_admin, BUSINESS, engine
from backend.main import now
from backend.models import Business, BusinessApplication, Product, User, Video, AuditLog
from backend.business_deletion import purge_due


def fixture_business(owner):
    uid = signup(owner, 'recoverable-owner@example.com').json()['id']
    bid = owner.post('/api/negocios', json=BUSINESS).json()['id']
    published_fixture(bid)
    pid = owner.post('/api/productos', json={'negocioId': bid, 'nombre': 'Producto', 'descripcion': 'Se conserva', 'precio': 15, 'promocion': True}).json()['id']
    vid = owner.post('/api/videos', json={'negocioId': bid, 'titulo': 'Video', 'url': 'https://youtu.be/M7lc1UVf-VE'}).json()['id']
    return uid, bid, pid, vid


def test_request_preserves_content_blocks_writes_and_restores(clients):
    owner, visitor = clients
    uid, bid, pid, vid = fixture_business(owner)
    signup(visitor, 'visitor-recovery@example.com')
    before = now()
    assert owner.delete(f'/api/negocios/{bid}').status_code == 204
    account = owner.get('/api/auth/me').json()
    assert account['tipo_cuenta'] == 'negocios' and account['registro_disponible_desde'] is None
    pending = owner.get('/api/mi-moderacion').json()['negocio']
    assert pending['estado'] == 'eliminacion' and pending['estado_antes_eliminacion'] == 'activo'
    deadline = datetime.fromisoformat(pending['eliminacion_programada'])
    assert before + timedelta(days=15) <= deadline <= now() + timedelta(days=15)
    for path in ['/api/negocios', '/api/productos', '/api/videos']:
        assert visitor.get(path).json() == []
    assert len(owner.get('/api/productos').json()) == 1
    assert len(owner.get('/api/mis-videos').json()) == 1
    assert owner.delete(f'/api/productos/{pid}').status_code == 409
    assert owner.delete(f'/api/videos/{vid}').status_code == 409
    assert owner.patch(f'/api/productos/{pid}/promocion', json={'promocion': False}).status_code == 409
    assert owner.put(f'/api/negocios/{bid}', json=BUSINESS).status_code == 409
    assert owner.post('/api/negocios', json=BUSINESS).status_code == 409
    assert owner.post('/api/importar', json={'negocios': [{**BUSINESS, 'id': 12}], 'productos': []}).status_code == 409
    assert visitor.post(f'/api/negocios/{bid}/restaurar').status_code == 404
    assert owner.post(f'/api/admin/negocios/{bid}/cancelar-eliminacion').status_code == 403
    assert owner.delete(f'/api/negocios/{bid}').status_code == 204
    assert owner.get('/api/mi-moderacion').json()['negocio']['eliminacion_programada'] == pending['eliminacion_programada']
    restored = owner.post(f'/api/negocios/{bid}/restaurar')
    assert restored.status_code == 200 and restored.json()['estado'] == 'activo'
    assert restored.json()['eliminacion_programada'] is None
    assert owner.post(f'/api/negocios/{bid}/restaurar').status_code == 409
    assert visitor.get('/api/negocios').json()[0]['id'] == bid
    assert visitor.get('/api/productos').json()[0]['promocion'] is True
    assert visitor.get('/api/videos').json()[0]['id'] == vid
    with Session(engine) as db:
        assert db.get(User, uid).tipo_cuenta == 'negocios'


@pytest.mark.parametrize('restricted', [False, True])
def test_exact_expiry_purges_only_requested_business_and_no_second_wait(clients, restricted):
    owner, admin = clients
    uid, bid, pid, vid = fixture_business(owner)
    make_admin(admin)
    assert owner.delete(f'/api/negocios/{bid}').status_code == 204
    with Session(engine) as db:
        owner_row = db.get(User, uid)
        owner_row.puede_registrar = not restricted
        due = db.get(Business, bid).eliminacion_programada
        db.commit()
        assert purge_due(db, due - timedelta(microseconds=1)) == 0
        assert db.get(Product, pid) is not None
        assert purge_due(db, due) == 1
        assert purge_due(db, due + timedelta(days=1)) == 0
        assert db.get(Business, bid) is None
        assert db.get(Product, pid) is None
        assert db.get(Video, vid) is None
        assert db.scalar(select(BusinessApplication).where(BusinessApplication.negocio_id == bid)) is None
        db.refresh(owner_row)
        assert owner_row.tipo_cuenta == 'personal'
        assert owner_row.registro_disponible_desde is None
        assert owner_row.puede_registrar is (not restricted)
    assert owner.post(f'/api/negocios/{bid}/restaurar').status_code == 404
    assert owner.post('/api/negocios', json=BUSINESS).status_code == (403 if restricted else 201)


@pytest.mark.parametrize('state', ['suspendido', 'archivado', 'pendiente', 'correcciones', 'rechazado'])
def test_restore_never_lifts_previous_moderation_or_publication_state(clients, state):
    owner, admin = clients
    _, bid, _, _ = fixture_business(owner)
    make_admin(admin)
    with Session(engine) as db:
        db.get(Business, bid).estado = state
        db.commit()
    assert owner.delete(f'/api/negocios/{bid}').status_code == 204
    restored = owner.post(f'/api/negocios/{bid}/restaurar')
    assert restored.status_code == 200 and restored.json()['estado'] == state


def test_admin_can_cancel_and_apply_new_restriction_without_exposing_pending_business(clients):
    owner, admin = clients
    uid, bid, _, _ = fixture_business(owner)
    make_admin(admin)
    assert owner.delete(f'/api/negocios/{bid}').status_code == 204
    assert admin.put(f'/api/admin/negocios/{bid}', json={**BUSINESS, 'owner_id': uid}).status_code == 409
    assert admin.patch(f'/api/admin/negocios/{bid}/estado', json={'estado': 'activo', 'motivo': 'No debe publicar el pendiente'}).status_code == 409
    result = admin.patch(f'/api/admin/negocios/{bid}/estado', json={'estado': 'suspendido', 'motivo': 'Se detectaron datos incorrectos durante el plazo'}).json()
    assert result['estado'] == 'eliminacion' and result['estado_antes_eliminacion'] == 'suspendido'
    assert admin.get('/api/negocios').json() == []
    restored = admin.post(f'/api/admin/negocios/{bid}/cancelar-eliminacion')
    assert restored.status_code == 200 and restored.json()['estado'] == 'suspendido'
    assert admin.post(f'/api/admin/negocios/{bid}/cancelar-eliminacion').status_code == 409
    assert owner.get('/api/auth/me').json()['tipo_cuenta'] == 'negocios'
    with Session(engine) as db:
        assert db.scalar(select(AuditLog).where(AuditLog.accion == 'cancelar_eliminacion'))


def test_request_expiry_is_completed_on_authenticated_request(clients):
    owner, visitor = clients
    uid, bid, _, _ = fixture_business(owner)
    signup(visitor, 'expiry-visitor@example.com')
    assert owner.delete(f'/api/negocios/{bid}').status_code == 204
    with Session(engine) as db:
        db.get(Business, bid).eliminacion_programada = now() - timedelta(seconds=1)
        # A separate archived business never requested deletion and must survive.
        other = db.scalar(select(User).where(User.id != uid))
        preserved = Business(owner_id=other.id, nombre='Conservar', categoria='Otros', direccion='Calle', descripcion='Archivado', estado='archivado')
        db.add(preserved)
        db.commit()
        preserved_id = preserved.id
    assert owner.get('/api/auth/me').json()['tipo_cuenta'] == 'personal'
    with Session(engine) as db:
        assert db.get(Business, bid) is None
        assert db.get(Business, preserved_id) is not None
    assert owner.post('/api/negocios', json=BUSINESS).status_code == 201


def test_deletion_migration_is_additive_and_idempotent():
    from sqlalchemy import create_engine, text, inspect
    from backend.migrations import migrate_business_deletion
    migration_engine = create_engine('sqlite://')
    with migration_engine.begin() as db:
        db.execute(text('CREATE TABLE businesses (id INTEGER PRIMARY KEY, nombre VARCHAR(120), estado VARCHAR(16))'))
        db.execute(text("INSERT INTO businesses VALUES (7, 'Conservar datos', 'archivado')"))
    migrate_business_deletion(migration_engine)
    migrate_business_deletion(migration_engine)
    with migration_engine.connect() as db:
        row = db.execute(text('SELECT * FROM businesses')).mappings().one()
        assert row['id'] == 7 and row['nombre'] == 'Conservar datos' and row['estado'] == 'archivado'
        assert row['eliminacion_solicitada'] is None and row['eliminacion_programada'] is None and row['estado_antes_eliminacion'] is None
        assert len(inspect(db).get_indexes('businesses')) == 1
