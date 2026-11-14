from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class Input(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class Register(Input):
    nombre: str = Field(min_length=2, max_length=120)
    correo: EmailStr
    contrasena: str = Field(min_length=12, max_length=128)


class Login(Input):
    correo: EmailStr
    contrasena: str = Field(min_length=1, max_length=128)


class BusinessIn(Input):
    nombre: str = Field(min_length=1, max_length=120)
    categoria: Literal['Comida', 'Librería', 'Tienda', 'Servicios', 'Otros']
    direccion: str = Field(min_length=1, max_length=255)
    descripcion: str = Field(min_length=1, max_length=5000)
    imagen: str = Field(default='', max_length=2048)
    latitud: float | None = Field(default=None, ge=-90, le=90)
    longitud: float | None = Field(default=None, ge=-180, le=180)

    @field_validator('imagen')
    @classmethod
    def image_url(cls, value):
        if value and not value.startswith(('https://', 'http://')):
            raise ValueError('La imagen debe usar http o https')
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
    descripcion: str = Field(min_length=1, max_length=5000)
    imagen: str = Field(default='', max_length=2048)
    promocion: bool = False
    image_url = field_validator('imagen')(BusinessIn.image_url.__func__)


class Promotion(Input):
    promocion: bool


class LegacyBusiness(BusinessIn):
    id: int = Field(gt=0)


class LegacyProduct(ProductIn):
    id: int = Field(gt=0)


class ImportData(Input):
    negocios: list[LegacyBusiness] = Field(max_length=500)
    productos: list[LegacyProduct] = Field(max_length=5000)
