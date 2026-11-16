"""Extract only the official Google Maps embed URL; never store arbitrary HTML."""
from html.parser import HTMLParser
from urllib.parse import urlsplit, parse_qs, urlencode


class FrameParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sources = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'iframe':
            self.sources.append(dict(attrs).get('src', ''))


def google_embed(value):
    if not isinstance(value, str) or len(value) > 12000:
        raise ValueError('Pega el código de Insertar un mapa de Google Maps o su enlace seguro')
    value = value.strip()
    if not value:
        return ''
    if '<' in value:
        parser = FrameParser()
        parser.feed(value)
        if len(parser.sources) != 1:
            raise ValueError('Pega el código de un solo mapa de Google Maps')
        value = parser.sources[0]
    try:
        url = urlsplit(value)
        if url.scheme != 'https' or url.hostname not in ('www.google.com', 'google.com', 'maps.google.com') or url.username or url.password or url.port or url.path not in ('/maps/embed', '/maps/embed/'):
            raise ValueError()
        query = parse_qs(url.query)
        pb = query.get('pb', [])
        if len(pb) != 1 or not pb[0]:
            raise ValueError()
        result = 'https://www.google.com/maps/embed?' + urlencode({'pb': pb[0]})
        if len(result) > 4096:
            raise ValueError()
        return result
    except (TypeError, ValueError):
        raise ValueError('Usa Compartir → Insertar un mapa → Copiar HTML. Los enlaces cortos van en Cómo llegar.') from None
