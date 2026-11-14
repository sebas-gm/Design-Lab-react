"""Validate and re-encode uploaded pictures. Original names are never used."""
import io
import os
from pathlib import Path
import uuid

from fastapi import HTTPException, Request
from PIL import Image, ImageOps, UnidentifiedImageError

UPLOAD_DIR = Path(os.getenv('UPLOAD_DIR', str(Path(__file__).with_name('uploads'))))
MAX_BYTES = 5 * 1024 * 1024


async def save_image(request: Request, user_id: int):
    # Bound the entire multipart body before parsing it, including fake Content-Length.
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > MAX_BYTES + 65536:
            raise HTTPException(413, 'La imagen debe pesar como máximo 5 MB')
    request._body = bytes(body)
    async with request.form(max_files=1, max_fields=0) as form:
        file = form.get('file')
        if not file or not hasattr(file, 'read'):
            raise HTTPException(422, 'Selecciona una imagen')
        content = await file.read(MAX_BYTES + 1)
    if len(content) > MAX_BYTES:
        raise HTTPException(413, 'La imagen debe pesar como máximo 5 MB')
    try:
        with Image.open(io.BytesIO(content)) as image:
            if image.format not in ('JPEG', 'PNG', 'WEBP'):
                raise HTTPException(415, 'Selecciona una imagen JPG, PNG o WebP')
            if image.width * image.height > 20_000_000:
                raise HTTPException(413, 'La imagen supera los 20 megapíxeles')
            image.load()
            image = ImageOps.exif_transpose(image)
            image.thumbnail((1920, 1920))
            # Rebuild pixels to avoid retaining EXIF (including GPS) or other metadata.
            pixels = image.convert('RGBA' if 'A' in image.getbands() or 'transparency' in image.info else 'RGB')
            clean = Image.new(pixels.mode, pixels.size)
            clean.paste(pixels)
            output = io.BytesIO()
            clean.save(output, format='WEBP', quality=85)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(415, 'El archivo no es una imagen válida')
    folder = UPLOAD_DIR / str(user_id)
    folder.mkdir(parents=True, exist_ok=True)
    name = uuid.uuid4().hex + '.webp'
    (folder / name).write_bytes(output.getvalue())
    return {'url': f'/api/uploads/{user_id}/{name}'}
