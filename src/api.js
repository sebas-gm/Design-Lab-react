export async function api(path, options = {}) {
  const multipart = options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: "include",
      ...options,
      headers: {
        ...(multipart ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
      body:
        options.body === undefined
          ? undefined
          : multipart
            ? options.body
            : JSON.stringify(options.body),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con Design Lab. Comprueba que FastAPI está iniciado.",
    );
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (
      response.status === 401 &&
      !["/auth/login", "/auth/register"].includes(path)
    ) {
      window.dispatchEvent(new Event("designlab:unauthorized"));
    }
    const detail = data?.detail;
    throw new Error(
      Array.isArray(detail)
        ? detail.map((e) => `${e.loc.at(-1)}: ${e.msg}`).join(". ")
        : detail || "No se pudo completar la operación",
    );
  }
  return data;
}
