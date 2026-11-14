"""Local-only provisioning for an existing account. No default passwords."""
import argparse
import json
from datetime import datetime, timezone
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from backend.database import Base, make_engine
from backend.models import AuditLog, Session as LoginSession, User
from backend.migrations import migrate_admin


def main():
    parser = argparse.ArgumentParser(description='Habilitar una cuenta existente como administrador de Navishop')
    parser.add_argument('--email', required=True)
    args = parser.parse_args()
    engine = make_engine()
    Base.metadata.create_all(engine)
    migrate_admin(engine)
    with Session(engine) as db:
        user = db.scalar(select(User).where(User.correo == args.email.strip().lower()).with_for_update())
        if not user:
            raise SystemExit('No existe esa cuenta. Regístrala primero desde Navishop; no se creó ninguna cuenta.')
        if user.is_admin:
            print('La cuenta ya es administradora. No se modificó nada.')
            return
        user.is_admin = True
        db.execute(delete(LoginSession).where(LoginSession.user_id == user.id))
        db.add(AuditLog(actor_id=user.id, accion='habilitar_admin_local', recurso='usuario', recurso_id=user.id,
                        fecha=datetime.now(timezone.utc).replace(tzinfo=None), detalle=json.dumps({'origen': 'comando local'})))
        db.commit()
    engine.dispose()
    print('Administrador habilitado. Inicia sesión de nuevo para acceder al panel. No se modificó la contraseña.')


if __name__ == '__main__':
    main()
