"""Create only the configured database and missing tables; never delete data."""
import os
import re
import sys

from sqlalchemy import URL, create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from backend.database import Base, make_engine
from backend.migrations import migrate_business_details, migrate_account_types, migrate_single_business, migrate_profile, migrate_admin, migrate_moderation, migrate_business_deletion
import backend.models  # noqa: F401 - register tables before create_all


def main():
    name = os.getenv('MYSQL_DATABASE', '')
    if not re.fullmatch(r'[A-Za-z0-9_]+', name):
        sys.exit('MYSQL_DATABASE debe contener solo letras, números y guiones bajos.')
    if not os.getenv('MYSQL_PASSWORD'):
        sys.exit('Escribe tu contraseña MySQL en MYSQL_PASSWORD dentro de backend/.env. No se intentaron credenciales vacías.')
    url = URL.create('mysql+pymysql', username=os.getenv('MYSQL_USER'),
                     password=os.environ['MYSQL_PASSWORD'], host=os.getenv('MYSQL_HOST'),
                     port=int(os.getenv('MYSQL_PORT', '3306')), query={'charset': 'utf8mb4'})
    server = create_engine(url, pool_pre_ping=True)
    try:
        with server.begin() as connection:
            exists = connection.scalar(text('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = :name'), {'name': name})
            if not exists:
                connection.execute(text(f'CREATE DATABASE `{name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'))
            else:
                print('La base ya existe. Se conserva su contenido.')
        engine = make_engine()
        Base.metadata.create_all(engine)
        migrate_business_details(engine)
        migrate_business_deletion(engine)
        migrate_account_types(engine)
        migrate_single_business(engine)
        migrate_profile(engine)
        migrate_admin(engine)
        migrate_moderation(engine)
        with engine.connect() as connection:
            connection.execute(text('SELECT 1'))
        engine.dispose()
        print(f'Conexión verificada. Base {name} y tablas listas; no se borraron datos.')
    except SQLAlchemyError as error:
        # Never print the URL, password or connection parameters.
        code = getattr(getattr(error, 'orig', None), 'args', ['desconocido'])[0]
        sys.exit(f'No se pudo preparar MySQL (código {code}). Revisa servicio, contraseña y permisos del usuario.')
    finally:
        server.dispose()


if __name__ == '__main__':
    main()
