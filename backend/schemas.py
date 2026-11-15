from decimal import Decimal
import re
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class ReportIn(Input):
    tipo: Literal['negocio', 'producto']
    objetivo_id: int = Field(gt=0)
    motivo: Literal['informacion_enganosa', 'posible_fraude', 'producto_distinto', 'contenido_inapropiado', 'otro']
    explicacion: str = Field(min_length=15, max_length=2000)


class ReportDecision(Input):
    estado: Literal['en_revision', 'resuelto']
    resultado: Literal['', 'medidas', 'descartado'] = ''
    respuesta: str = Field(default='', max_length=2000)

    @model_validator(mode='after')
    def resolution(self):
        if self.estado == 'resuelto' and (not self.resultado or len(self.respuesta) < 5):
            raise ValueError('Selecciona un resultado y escribe una respuesta de al menos 5 caracteres')
        if self.estado == 'en_revision' and (self.resultado or self.respuesta):
            raise ValueError('La respuesta y el resultado se guardan al resolver el reporte')
        return self


class Register(Input):
    nombre: str = Field(min_length=2, max_length=120)
    correo: EmailStr
    contrasena: str = Field(min_length=12, max_length=128)


class Login(Input):
    correo: EmailStr
    contrasena: str = Field(min_length=1, max_length=128)


class ProfileUpdate(Input):
    nombre: str = Field(default=None, min_length=2, max_length=120)
    avatar: str = Field(default=None, max_length=2048, pattern=r'^/api/uploads/\d+/[a-f0-9]{32}\.webp$|^$')
    reducir_movimiento: bool = None


class BusinessIn(Input):
    nombre: str = Field(min_length=1, max_length=120)
    categoria: Literal['Comida', 'Librería', 'Tienda', 'Servicios', 'Otros']
    direccion: str = Field(min_length=1, max_length=255)
    descripcion: str = Field(min_length=1, max_length=500)
    imagen: str = Field(default='', max_length=2048)
    latitud: float | None = Field(default=None, ge=-90, le=90)
    longitud: float | None = Field(default=None, ge=-180, le=180)
    telefono: str = Field(default='', max_length=30, pattern=r'^[+\d\s().-]*$')
    correo_contacto: EmailStr | Literal[''] = ''
    enlace_mapa: str = Field(default='', max_length=2048)
    hora_apertura: str = Field(default='', pattern=r'^(?:[01]\d|2[0-3]):[0-5]\d$|^$')
    hora_cierre: str = Field(default='', pattern=r'^(?:[01]\d|2[0-3]):[0-5]\d$|^$')
    dias_atencion: str = Field(default='', max_length=60)

    @field_validator('dias_atencion')
    @classmethod
    def opening_days(cls, value):
        if not value:
            return ''
        order = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']
        days = value.split(',')
        if len(days) != len(set(days)) or any(day not in order for day in days):
            raise ValueError('Selecciona días de atención válidos, sin repetirlos')
        return ','.join(day for day in order if day in days)
    logo: str = Field(default='', max_length=2048)

    @field_validator('imagen', 'logo')
    @classmethod
    def image_url(cls, value):
        local = re.fullmatch(r'/api/uploads/\d+/[a-f0-9]{32}\.webp', value)
        if value and not local and not value.startswith(('https://', 'http://')):
            raise ValueError('Selecciona una imagen válida')
        return value

    @field_validator('enlace_mapa')
    @classmethod
    def map_url(cls, value):
        if value and not value.startswith(('https://', 'http://')):
            raise ValueError('El enlace del mapa debe usar http o https')
        return value

    @model_validator(mode='after')
    def coordinates(self):
        if (self.latitud is None) != (self.longitud is None):
            raise ValueError('Indica ambas coordenadas')
        return self


class ProductIn(Input):
    negocioId: int = Field(gt=0)
    nombre: str = Field(min_length=1, max_length=120)
    precio: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    descripcion: str = Field(min_length=1, max_length=500)
    imagen: str = Field(default='', max_length=2048)
    promocion: bool = False
    image_url = field_validator('imagen')(BusinessIn.image_url.__func__)


class Promotion(Input):
    promocion: bool


class VideoIn(Input):
    negocioId: int = Field(gt=0)
    titulo: str = Field(min_length=1, max_length=160)
    url: str = Field(min_length=1, max_length=2048)

    @field_validator('url')
    @classmethod
    def supported_url(cls, value):
        from backend.videos import video_source
        video_source(value)
        return value


class LegacyBusiness(BusinessIn):
    id: int = Field(gt=0)


class LegacyProduct(ProductIn):
    id: int = Field(gt=0)


class ImportData(Input):
    negocios: list[LegacyBusiness] = Field(max_length=500)
    productos: list[LegacyProduct] = Field(max_length=5000)


class AdminBusinessIn(BusinessIn):
    owner_id: int = Field(gt=0)


class BusinessStatus(Input):
    estado: Literal['activo', 'suspendido', 'archivado']
    motivo: str = Field(min_length=5, max_length=2000)
    nota_interna: str = Field(default='', max_length=2000)


class ModerationReason(Input):
    motivo: str = Field(min_length=5, max_length=2000)
    nota_interna: str = Field(default='', max_length=2000)


class ReviewIn(Input):
    mensaje: str = Field(min_length=10, max_length=3000)


class ReviewDecision(Input):
    decision: Literal['aprobar', 'rechazar']
    respuesta: str = Field(min_length=5, max_length=2000)


class RegistrationPermission(Input):
    permitir: bool
    motivo: str = Field(min_length=5, max_length=2000)
