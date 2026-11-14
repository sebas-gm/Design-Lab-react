"""Only build player URLs for known providers; never fetch user-supplied URLs."""
import re
from urllib.parse import parse_qs, urlparse


def video_source(value):
    parsed = urlparse(value)
    host = (parsed.hostname or '').lower()
    if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError('Usa un enlace HTTPS de YouTube o TikTok')
    video_id = None
    if host in ('youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'):
        if host == 'youtu.be':
            video_id = parsed.path.strip('/')
        elif parsed.path == '/watch':
            video_id = parse_qs(parsed.query).get('v', [''])[0]
        else:
            match = re.fullmatch(r'/(?:shorts|embed|live)/([A-Za-z0-9_-]{11})/?', parsed.path)
            video_id = match[1] if match else None
        if video_id and re.fullmatch(r'[A-Za-z0-9_-]{11}', video_id):
            return 'YouTube', f'https://www.youtube-nocookie.com/embed/{video_id}'
    elif host in ('www.tiktok.com', 'tiktok.com', 'm.tiktok.com'):
        match = re.fullmatch(r'/@[^/]+/video/(\d{15,25})/?', parsed.path)
        if match:
            return 'TikTok', f'https://www.tiktok.com/player/v1/{match[1]}'
    raise ValueError('Enlace no compatible. Usa un video de YouTube (también Shorts) o el enlace completo de TikTok: https://www.tiktok.com/@usuario/video/ID. Abre los enlaces cortos de TikTok y copia la dirección completa.')
