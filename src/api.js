export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'include', ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error('No se pudo conectar con Design Lab. Comprueba que FastAPI está iniciado.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    throw new Error(Array.isArray(detail) ? detail.map(e => `${e.loc.at(-1)}: ${e.msg}`).join('. ') : detail || 'No se pudo completar la operación');
  }
  return data;
}
