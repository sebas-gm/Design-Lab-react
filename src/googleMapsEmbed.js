export function googleMapsEmbed(raw = '') {
  if (typeof raw !== 'string' || raw.length > 12000) return null;
  let value = raw.trim();
  if (!value) return '';
  if (value.includes('<')) {
    const frames = [...value.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)];
    if (frames.length !== 1) return null;
    value = frames[0][1].replace(/&amp;/gi, '&');
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['www.google.com', 'google.com', 'maps.google.com'].includes(url.hostname) || url.username || url.password || url.port || !['/maps/embed', '/maps/embed/'].includes(url.pathname)) return null;
    const pb = url.searchParams.getAll('pb');
    if (pb.length !== 1 || !pb[0]) return null;
    const result = `https://www.google.com/maps/embed?${new URLSearchParams({ pb: pb[0] })}`;
    return result.length <= 4096 ? result : null;
  } catch { return null; }
}
