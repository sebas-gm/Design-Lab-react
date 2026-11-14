import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

load_dotenv(Path(__file__).with_name('.env'))


class Base(DeclarativeBase):
    pass


def make_engine():
    url = os.getenv('DATABASE_URL')
    if not url:
        required = ['MYSQL_HOST', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD']
        if any(not os.getenv(key) for key in required):
            raise RuntimeError('Completa MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER y MYSQL_PASSWORD en backend/.env')
        url = URL.create('mysql+pymysql', username=os.environ['MYSQL_USER'],
                         password=os.environ['MYSQL_PASSWORD'], host=os.environ['MYSQL_HOST'],
                         port=int(os.getenv('MYSQL_PORT', '3306')), database=os.environ['MYSQL_DATABASE'],
                         query={'charset': 'utf8mb4'})
    options = {'connect_args': {'check_same_thread': False}} if str(url).startswith('sqlite') else {}
    if str(url) == 'sqlite://':
        options['poolclass'] = StaticPool
    return create_engine(url, pool_pre_ping=True, **options)


def get_db():
    from backend.main import engine
    with sessionmaker(bind=engine)() as db:
        yield db
