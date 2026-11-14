import { useLab } from "../context";
export default function CatalogStatus() {
  const { error, loading, refresh } = useLab();
  return (
    <>
      {error && (
        <div role="alert" className="api-status">
          {error} <button onClick={refresh}>Reintentar</button>
        </div>
      )}
      {loading && (
        <p role="status" className="api-status">
          Cargando catálogo…
        </p>
      )}
    </>
  );
}
