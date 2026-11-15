"""Validate and re-encode uploaded pictures. Original names are never used."""
import io
import os
from pathlib import Path
import uuid
import math

from fastapi import HTTPException, Request
from PIL import Image, ImageOps, UnidentifiedImageError

UPLOAD_DIR = Path(os.getenv('UPLOAD_DIR', str(Path(__file__).with_name('uploads'))))
MAX_BYTES = 5 * 1024 * 1024


async def save_image(request: Request, user_id: int):
    purpose = request.query_params.get('purpose', 'general')
    if purpose not in ('general', 'logo', 'facade'):
        raise HTTPException(422, 'Tipo de imagen no válido')
    try:
        x = float(request.query_params.get('x', '.5'))
        y = float(request.query_params.get('y', '.5'))
        zoom = float(request.query_params.get('zoom', '1'))
        if not all(math.isfinite(v) for v in (x, y, zoom)) or not (0 <= x <= 1 and 0 <= y <= 1 and 1 <= zoom <= 3):
            raise ValueError()
    except ValueError:
        raise HTTPException(422, 'Ajuste de imagen no válido')
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
            if purpose == 'logo':
                if min(image.size) < 200:
                    raise HTTPException(422, 'El logo debe medir al menos 200 × 200 píxeles')
                # Contain, rather than crop, preserves the entire logo and alpha.
                pixels = image.convert('RGBA')
                side = round(512 / zoom)
                ratio = side / max(pixels.size)
                pixels = pixels.resize((max(1, round(pixels.width * ratio)), max(1, round(pixels.height * ratio))), Image.Resampling.LANCZOS)
                square = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
                square.paste(pixels, ((512 - pixels.width) // 2, (512 - pixels.height) // 2))
                image = square
            elif purpose == 'facade':
                if image.width < 800 or image.height < 450:
                    raise HTTPException(422, 'La fachada debe medir al menos 800 × 450 píxeles')
                width = min(image.width, image.height * 16 / 9) / zoom
                height = width * 9 / 16
                if width < 800 - 0.000001 or height < 450 - 0.000001:
                    raise HTTPException(422, 'Reduce el acercamiento: el recorte debe conservar al menos 800 × 450 píxeles')
                left, top = (image.width - width) * x, (image.height - height) * y
                image = image.crop((round(left), round(top), round(left + width), round(top + height)))
                target_width = min(1280, int((width + 0.000001) // 16) * 16)
                image = image.resize((target_width, target_width * 9 // 16), Image.Resampling.LANCZOS)
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
