"""Additive migration: preserve all existing business records and images."""
from sqlalchemy import inspect, text

BUSINESS_COLUMNS = {
    'telefono': 'VARCHAR(30)',
    'correo_contacto': 'VARCHAR(254)',
    'enlace_mapa': 'VARCHAR(2048)',
    'hora_apertura': 'VARCHAR(5)',
    'hora_cierre': 'VARCHAR(5)',
    'logo': 'VARCHAR(2048)',
}


def migrate_business_details(engine):
    existing = {column['name'] for column in inspect(engine).get_columns('businesses')}
    with engine.begin() as connection:
        for name, sql_type in BUSINESS_COLUMNS.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE businesses ADD COLUMN {name} {sql_type} NOT NULL DEFAULT ''"))


def migrate_account_types(engine):
    existing = {column['name'] for column in inspect(engine).get_columns('users')}
    with engine.begin() as connection:
        if 'tipo_cuenta' not in existing:
            connection.execute(text("ALTER TABLE users ADD COLUMN tipo_cuenta VARCHAR(16) NOT NULL DEFAULT 'personal'"))
        connection.execute(text("UPDATE users SET tipo_cuenta = 'negocios' WHERE tipo_cuenta = 'personal' AND id IN (SELECT owner_id FROM businesses)"))
