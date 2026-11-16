"""Additive migration: preserve all existing business records and images."""
from sqlalchemy import inspect, text

BUSINESS_COLUMNS = {
    'telefono': 'VARCHAR(30)',
    'correo_contacto': 'VARCHAR(254)',
    'enlace_mapa': 'VARCHAR(2048)',
    'hora_apertura': 'VARCHAR(5)',
    'hora_cierre': 'VARCHAR(5)',
    'dias_atencion': 'VARCHAR(60)',
    'logo': 'VARCHAR(2048)',
}


def migrate_business_details(engine):
    existing = {column['name'] for column in inspect(engine).get_columns('businesses')}
    with engine.begin() as connection:
        if 'publicacion_aprobada' not in existing:
            connection.execute(text('ALTER TABLE businesses ADD COLUMN publicacion_aprobada BOOLEAN NOT NULL DEFAULT 1'))
        for name, sql_type in BUSINESS_COLUMNS.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE businesses ADD COLUMN {name} {sql_type} NOT NULL DEFAULT ''"))


def migrate_account_types(engine):
    existing = {column['name'] for column in inspect(engine).get_columns('users')}
    with engine.begin() as connection:
        if 'tipo_cuenta' not in existing:
            connection.execute(text("ALTER TABLE users ADD COLUMN tipo_cuenta VARCHAR(16) NOT NULL DEFAULT 'personal'"))
        connection.execute(text("UPDATE users SET tipo_cuenta = 'negocios' WHERE tipo_cuenta = 'personal' AND id IN (SELECT owner_id FROM businesses)"))


def migrate_single_business(engine):
    inspector = inspect(engine)
    unique = inspector.get_unique_constraints('businesses') + inspector.get_indexes('businesses')
    if any(item.get('column_names') == ['owner_id'] and item.get('unique', True) for item in unique):
        return
    with engine.begin() as connection:
        duplicate = connection.execute(text('SELECT owner_id FROM businesses GROUP BY owner_id HAVING COUNT(*) > 1 LIMIT 1')).first()
        if duplicate:
            raise RuntimeError('Hay cuentas con varios negocios. No se borró ningún dato. Resuelve estos casos antes de activar la restricción de negocio único.')
        connection.execute(text('CREATE UNIQUE INDEX uq_business_owner ON businesses (owner_id)'))


def migrate_profile(engine):
    existing = {column['name'] for column in inspect(engine).get_columns('users')}
    with engine.begin() as connection:
        if 'avatar' not in existing:
            connection.execute(text("ALTER TABLE users ADD COLUMN avatar VARCHAR(2048) NOT NULL DEFAULT ''"))
        if 'reducir_movimiento' not in existing:
            connection.execute(text('ALTER TABLE users ADD COLUMN reducir_movimiento BOOLEAN NOT NULL DEFAULT 0'))


def migrate_admin(engine):
    inspector = inspect(engine)
    with engine.begin() as connection:
        if 'is_admin' not in {column['name'] for column in inspector.get_columns('users')}:
            connection.execute(text('ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0'))
        if 'estado' not in {column['name'] for column in inspector.get_columns('businesses')}:
            connection.execute(text("ALTER TABLE businesses ADD COLUMN estado VARCHAR(16) NOT NULL DEFAULT 'activo'"))


def migrate_moderation(engine):
    with engine.begin() as connection:
        if 'registro_disponible_desde' not in {c['name'] for c in inspect(engine).get_columns('users')}:
            connection.execute(text('ALTER TABLE users ADD COLUMN registro_disponible_desde DATETIME NULL'))
        if 'puede_registrar' not in {c['name'] for c in inspect(engine).get_columns('users')}:
            connection.execute(text('ALTER TABLE users ADD COLUMN puede_registrar BOOLEAN NOT NULL DEFAULT 1'))
        # Keep a visible explanation for pre-existing suspended/archived businesses.
        connection.execute(text("""INSERT INTO moderation_events
            (user_id, negocio_id, nombre_negocio, estado, motivo, nota_interna, fecha)
            SELECT b.owner_id, b.id, b.nombre, b.estado,
            'Estado aplicado antes del historial de moderación. Solicita revisión para consultar tu caso.', '', CURRENT_TIMESTAMP
            FROM businesses b WHERE b.estado <> 'activo'
            AND NOT EXISTS (SELECT 1 FROM moderation_events m WHERE m.negocio_id = b.id)"""))
