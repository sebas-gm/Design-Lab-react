"""Create a single local demonstration batch, without replacing existing accounts."""
import csv
import secrets
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import make_engine
from backend.models import Business, User
from backend.security import hash_password, verify_password


def main():
    entries = [
        ('Ana Torres', 'Cafe Aurora', 'Comida'),
        ('Luis Rojas', 'Libreria Horizonte', 'Librería'),
        ('Carla Mendoza', 'Tienda Violeta', 'Tienda'),
        ('Diego Vargas', 'Impresiones Punto Color', 'Servicios'),
        ('Sofia Herrera', 'Panaderia Trigo Dulce', 'Comida'),
        ('Mateo Flores', 'Papeleria Ideas', 'Librería'),
        ('Valeria Castro', 'Accesorios Luna', 'Tienda'),
        ('Gabriel Molina', 'Soporte TecnoAmigo', 'Servicios'),
        ('Camila Vega', 'Jugos Fruta Viva', 'Comida'),
        ('Nicolas Romero', 'Bazar Arcoiris', 'Tienda'),
        ('Lucia Paredes', 'Heladeria Nube', 'Comida'),
        ('Andres Salinas', 'Copias Express', 'Servicios'),
        ('Daniela Suarez', 'Rincon del Libro', 'Librería'),
        ('Pablo Navarro', 'Moda Urbana', 'Tienda'),
        ('Mariana Cruz', 'Almuerzos Buen Sabor', 'Comida'),
        ('Javier Leon', 'Regalos Detalles', 'Otros'),
        ('Paula Aguilar', 'Reposteria Canela', 'Comida'),
        ('Fernando Arias', 'Reparaciones Conecta', 'Servicios'),
        ('Elena Ramos', 'Plantas Jardin Verde', 'Otros'),
        ('Ricardo Soto', 'Deportes Impulso', 'Tienda'),
    ]
    folder = Path(__file__).resolve().parent.parent / 'datos-prueba-local'
    csv_path, md_path = folder / 'cuentas-demo.csv', folder / 'cuentas-demo.md'
    if csv_path.exists() or md_path.exists():
        raise SystemExit('El lote ya tiene archivos locales. No se sobrescribieron cuentas ni credenciales.')
    engine = make_engine()
    rows = []
    emails = [f'navishop.demo{i:02d}@example.com' for i in range(1, 21)]
    try:
        with Session(engine) as db, db.begin():
            if db.scalar(select(User.id).where(User.correo.in_(emails)).limit(1)):
                raise SystemExit('Ya existe una cuenta de este lote. No se modifico ninguna cuenta.')
            for i, (name, business_name, category) in enumerate(entries, 1):
                password = 'Demo-' + secrets.token_urlsafe(12)
                user = User(nombre=name, correo=emails[i - 1], password_hash=hash_password(password),
                            tipo_cuenta='negocios', is_admin=False, puede_registrar=True)
                db.add(user)
                db.flush()
                business = Business(owner_id=user.id, nombre=f'{business_name} [DEMO]', categoria=category,
                                    direccion=f'Calle de ejemplo {i}, local {i} (direccion ficticia)',
                                    descripcion='Negocio ficticio de demostracion para probar Navishop. No representa un comercio real.',
                                    correo_contacto=user.correo, hora_apertura='08:00', hora_cierre='18:00',
                                    dias_atencion='lun,mar,mie,jue,vie,sab', estado='activo')
                db.add(business)
                db.flush()
                assert verify_password(password, user.password_hash)
                rows.append([i, name, user.correo, password, business.nombre, category, user.id, business.id])
            folder.mkdir(exist_ok=True)
            with csv_path.open('x', encoding='utf-8-sig', newline='') as output:
                writer = csv.writer(output)
                writer.writerow(['Nro', 'Nombre', 'Correo', 'Contrasena', 'Negocio', 'Categoria', 'Usuario_ID', 'Negocio_ID'])
                writer.writerows(rows)
            with md_path.open('x', encoding='utf-8') as output:
                output.write('# Cuentas de demostracion de Navishop\n\n')
                output.write('Datos ficticios. Archivo privado local: contiene contrasenas. No compartir en GitHub.\n\n')
                output.write('Todas son cuentas de negocios, sin permiso de superadmin. Horario: lunes a sabado, 08:00 a 18:00. Sin telefonos, coordenadas o imagenes inventadas.\n\n')
                output.write('| Nro | Nombre | Correo | Contrasena | Negocio |\n|---|---|---|---|---|\n')
                for row in rows:
                    output.write('| ' + ' | '.join(str(value) for value in row[:5]) + ' |\n')
        with Session(engine) as db:
            accounts = db.scalars(select(User).where(User.correo.in_(emails))).all()
            assert len(accounts) == 20 and all(not u.is_admin and u.tipo_cuenta == 'negocios' for u in accounts)
            for account in accounts:
                assert len(db.scalars(select(Business).where(Business.owner_id == account.id)).all()) == 1
        print('Creadas y verificadas: 20 cuentas de negocios y 20 negocios ficticios. Cuentas anteriores conservadas.')
        print('Credenciales guardadas en datos-prueba-local/cuentas-demo.md y cuentas-demo.csv (excluidos de Git).')
    finally:
        engine.dispose()


if __name__ == '__main__':
    main()
