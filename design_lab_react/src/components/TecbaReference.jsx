import LocationMap from './LocationMap';

export default function TecbaReference() {
  const name = import.meta.env.VITE_TECBA_NAME || 'TECBA';
  const latitude = import.meta.env.VITE_TECBA_LATITUDE;
  const longitude = import.meta.env.VITE_TECBA_LONGITUDE;
  const lat = Number(latitude), lon = Number(longitude);
  const valid = latitude && longitude && Number.isFinite(lat) && Number.isFinite(lon)
    && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  return <section className="migration-panel"><h2>{name}</h2>
    {valid ? <LocationMap latitud={lat} longitud={lon} /> : <p>La ubicación de referencia se configurará al confirmar la sede de TECBA.</p>}
  </section>;
}
