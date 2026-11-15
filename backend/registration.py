from fastapi import HTTPException


def check_registration_wait(user, current_time):
    if user.registro_disponible_desde and current_time < user.registro_disponible_desde:
        date = user.registro_disponible_desde.isoformat(timespec='seconds')
        raise HTTPException(403, f'Tras eliminar tu negocio debes esperar 15 días. Podrás registrar otro desde {date} UTC.')
