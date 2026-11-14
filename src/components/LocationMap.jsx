export default function LocationMap({ latitud, longitud }) {
  if (latitud == null || longitud == null) return <p>Ubicación del mapa pendiente de registrar.</p>;
  const lat = Number(latitud), lon = Number(longitud);
  const bbox = [lon - .005, lat - .005, lon + .005, lat + .005].join(',');
  return <section className="location-map"><h2>Ubicación</h2>
    <iframe title="Ubicación del negocio en OpenStreetMap" loading="lazy"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`} />
    <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`} target="_blank" rel="noreferrer">Abrir mapa · © OpenStreetMap</a>
  </section>;
}
