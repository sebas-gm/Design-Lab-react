from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from backend.database import Base


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    nombre = Column(String(120), nullable=False)
    correo = Column(String(254), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    tipo_cuenta = Column(String(16), nullable=False, default='personal', server_default='personal')
    avatar = Column(String(2048), nullable=False, default='', server_default='')
    reducir_movimiento = Column(Boolean, nullable=False, default=False, server_default='0')
    is_admin = Column(Boolean, nullable=False, default=False, server_default='0')
    puede_registrar = Column(Boolean, nullable=False, default=True, server_default='1')
    registro_disponible_desde = Column(DateTime, nullable=True)


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
    mapa_embed = Column(String(4096), nullable=False, default='', server_default='')
    hora_apertura = Column(String(5), nullable=False, default='', server_default='')
    hora_cierre = Column(String(5), nullable=False, default='', server_default='')
    dias_atencion = Column(String(60), nullable=False, default='', server_default='')
    logo = Column(String(2048), nullable=False, default='', server_default='')
    estado = Column(String(16), nullable=False, default='activo', server_default='activo')
    publicacion_aprobada = Column(Boolean, nullable=False, default=False, server_default='0')
    __table_args__ = (UniqueConstraint('owner_id', 'legacy_id'), UniqueConstraint('owner_id', name='uq_business_owner'))


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


class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(Integer, primary_key=True)
    actor_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    accion = Column(String(40), nullable=False)
    recurso = Column(String(30), nullable=False)
    recurso_id = Column(Integer, nullable=False)
    fecha = Column(DateTime, nullable=False)
    detalle = Column(Text, nullable=False)


class ModerationEvent(Base):
    __tablename__ = 'moderation_events'
    id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    negocio_id = Column(Integer, nullable=False, index=True)
    nombre_negocio = Column(String(120), nullable=False)
    estado = Column(String(16), nullable=False)
    motivo = Column(Text, nullable=False)
    nota_interna = Column(Text, nullable=False, default='')
    fecha = Column(DateTime, nullable=False)


class ReviewRequest(Base):
    __tablename__ = 'review_requests'
    id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    negocio_id = Column(Integer, nullable=False, index=True)
    evento_id = Column(ForeignKey('moderation_events.id'), nullable=False)
    pending_key = Column(String(80), unique=True, nullable=True)
    mensaje = Column(Text, nullable=False)
    estado = Column(String(16), nullable=False, default='pendiente')
    respuesta = Column(Text, nullable=False, default='')
    fecha = Column(DateTime, nullable=False)
    resuelta = Column(DateTime, nullable=True)


class Notification(Base):
    __tablename__ = 'notifications'
    id = Column(Integer, primary_key=True)
    user_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    titulo = Column(String(160), nullable=False)
    mensaje = Column(Text, nullable=False)
    fecha = Column(DateTime, nullable=False)
    leida = Column(Boolean, nullable=False, default=False)


class Report(Base):
    __tablename__ = 'reports'
    id = Column(Integer, primary_key=True)
    reporter_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    tipo = Column(String(16), nullable=False)
    objetivo_id = Column(Integer, nullable=False)
    negocio_id = Column(Integer, nullable=False, index=True)
    nombre_objetivo = Column(String(160), nullable=False)
    motivo = Column(String(40), nullable=False)
    explicacion = Column(Text, nullable=False)
    estado = Column(String(16), nullable=False, default='pendiente')
    pending_key = Column(String(100), nullable=True, unique=True)
    resultado = Column(String(16), nullable=False, default='')
    respuesta = Column(Text, nullable=False, default='')
    fecha = Column(DateTime, nullable=False)
    resuelta = Column(DateTime, nullable=True)


class BusinessApplication(Base):
    __tablename__ = 'business_applications'
    id = Column(Integer, primary_key=True)
    negocio_id = Column(Integer, nullable=False, unique=True)
    owner_id = Column(ForeignKey('users.id'), nullable=False, index=True)
    propuesta = Column(Text, nullable=False)
    estado = Column(String(16), nullable=False, default='pendiente')
    motivo = Column(Text, nullable=False, default='')
    version = Column(Integer, nullable=False, default=1)
    envios = Column(Integer, nullable=False, default=1)
    ventana_desde = Column(DateTime, nullable=False)
    fecha = Column(DateTime, nullable=False)
    actualizada = Column(DateTime, nullable=False)
