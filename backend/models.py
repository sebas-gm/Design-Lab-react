from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from backend.database import Base


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(120), nullable=False)
    correo = Column(String(254), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)


class Session(Base):
    __tablename__ = 'sessions'
    token_hash = Column(String(64), primary_key=True)
    user_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)


class Business(Base):
    __tablename__ = 'businesses'
    id = Column(Integer, primary_key=True)
    owner_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    nombre = Column(String(120), nullable=False)
    categoria = Column(String(40), nullable=False)
    direccion = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=False)
    imagen = Column(String(2048), nullable=False, default='')
    latitud = Column(Numeric(10, 7), nullable=True)
    longitud = Column(Numeric(10, 7), nullable=True)
    legacy_id = Column(String(80), nullable=True)
    telefono = Column(String(30), nullable=False, default='', server_default='')
    correo_contacto = Column(String(254), nullable=False, default='', server_default='')
    enlace_mapa = Column(String(2048), nullable=False, default='', server_default='')
    hora_apertura = Column(String(5), nullable=False, default='', server_default='')
    hora_cierre = Column(String(5), nullable=False, default='', server_default='')
    logo = Column(String(2048), nullable=False, default='', server_default='')
    __table_args__ = (UniqueConstraint('owner_id', 'legacy_id'),)


class Product(Base):
    __tablename__ = 'products'
    id = Column(Integer, primary_key=True)
    negocioId = Column(ForeignKey('businesses.id'), nullable=False, index=True)
    nombre = Column(String(120), nullable=False)
    precio = Column(Numeric(10, 2), nullable=False)
    descripcion = Column(Text, nullable=False)
    imagen = Column(String(2048), nullable=False, default='')
    promocion = Column(Boolean, nullable=False, default=False)
    legacy_id = Column(String(80), nullable=True)
    __table_args__ = (UniqueConstraint('negocioId', 'legacy_id'),)


class Video(Base):
    __tablename__ = 'videos'
    id = Column(Integer, primary_key=True)
    negocioId = Column(ForeignKey('businesses.id'), nullable=False, index=True)
    titulo = Column(String(160), nullable=False)
    url = Column(String(2048), nullable=False)
