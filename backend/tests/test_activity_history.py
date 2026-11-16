"""Audit browsing never writes production records; these tests use SQLite."""
import csv
import io
import json
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.tests.test_api import clients, signup, engine
from backend.models import AuditLog, User


def seed_history(admin, owner):
    signup(admin, 'history-admin@example.com')
    signup(owner, 'history-owner@example.com')
    with Session(engine) as db:
        account = db.scalar(select(User).where(User.correo == 'history-admin@example.com'))
        account.is_admin = True
        other = db.scalar(select(User).where(User.correo == 'history-owner@example.com'))
        today = (datetime.now(UTC) - timedelta(hours=4)).date()
        for number in range(125):
            db.add(AuditLog(actor_id=account.id, accion='editar', recurso='producto', recurso_id=number + 1,
                            fecha=datetime(2020, 1, 5, 12) + timedelta(minutes=number),
                            detalle=json.dumps({'nombre': f'Producto {number}', 'motivo': 'Oferta 100% real'})))
        for actor, stamp, name in [(account.id, datetime(2020, 1, 6, 3, 59), '=HYPERLINK("bad")'),
                                    (other.id, datetime(2020, 1, 6, 4), 'Fuera del dia')]:
            db.add(AuditLog(actor_id=actor, accion='crear', recurso='negocio', recurso_id=500,
                            fecha=stamp, detalle=json.dumps({'nombre': name})))
        db.add(AuditLog(actor_id=account.id, accion='crear', recurso='video', recurso_id=8,
                        fecha=datetime.combine(today, datetime.min.time()) + timedelta(hours=5), detalle='{}'))
        db.commit()


def test_history_pagination_stats_filters_dates_and_csv(clients):
    admin, owner = clients
    seed_history(admin, owner)
    endpoint = '/api/admin/historial/consulta'
    initial = admin.get(endpoint).json()
    assert initial['total'] == 128
    assert initial['today'] == 1
    assert initial['administrators'] == 1
    assert len(initial['items']) == 10
    assert initial['pages'] == 13
    assert initial['actions'] == ['crear', 'editar']
    second = admin.get(endpoint, params={'page': 2}).json()
    assert not ({row['id'] for row in initial['items']} & {row['id'] for row in second['items']})
    last = admin.get(endpoint, params={'page': 999}).json()
    assert last['page'] == 13 and len(last['items']) == 8
    oldest = admin.get(endpoint, params={'order': 'oldest'}).json()
    assert oldest['items'][0]['elemento'] == 'Producto 0'
    assert len(admin.get('/api/admin/historial').json()) == 100  # Existing callers unchanged.
    matching = admin.get(endpoint, params={'q': '%', 'action': 'editar', 'start': '2020-01-05', 'end': '2020-01-05', 'size': 100}).json()
    assert matching['total'] == 125 and matching['today'] == 0 and len(matching['items']) == 100
    assert admin.get(endpoint, params={'q': 'history-admin@example.com'}).json()['total'] == 127
    local_day = admin.get(endpoint, params={'action': 'crear', 'start': '2020-01-05', 'end': '2020-01-05'}).json()
    assert local_day['total'] == 1
    assert local_day['items'][0]['fecha'] == '2020-01-06T03:59:00'
    next_day = admin.get(endpoint, params={'start': '2020-01-06', 'end': '2020-01-06'}).json()
    assert next_day['total'] == 1 and next_day['administrators'] == 0
    assert next_day['items'][0]['responsable_es_admin'] is False
    assert admin.get(endpoint, params={'q': 'no-such-record'}).json()['total'] == 0
    exported = admin.get(endpoint, params={'action': 'editar', 'export': 'true', 'page': 2, 'size': 10})
    assert exported.status_code == 200 and 'text/csv' in exported.headers['content-type']
    rows = list(csv.reader(io.StringIO(exported.content.decode('utf-8-sig'))))
    assert len(rows) == 126  # All filtered records, not just a page.
    assert 'detalle' not in rows[1][-1].lower()
    csv_attack = admin.get(endpoint, params={'q': 'HYPERLINK', 'export': 'true'})
    rows = list(csv.reader(io.StringIO(csv_attack.content.decode('utf-8-sig'))))
    assert rows[1][4].startswith("'=HYPERLINK")
    assert owner.get(endpoint).status_code == 403
    assert owner.get(endpoint, params={'export': 'true'}).status_code == 403
    assert admin.get(endpoint, params={'start': '2020-02-02', 'end': '2020-01-01'}).status_code == 422
    for params in [{'page': 0}, {'size': 101}, {'order': 'bad'}, {'q': 'a' * 161}, {'start': 'bad'}, {'end': '9999-12-31'}]:
        assert admin.get(endpoint, params=params).status_code == 422
    with Session(engine) as db:
        assert len(db.scalars(select(AuditLog)).all()) == 128
