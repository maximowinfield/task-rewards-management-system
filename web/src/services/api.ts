const API_BASE = import.meta.env.VITE_API_BASE;

if (!API_BASE) {
  throw new Error("VITE_API_BASE is not set. Check .env.production and your build workflow.");
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, options);

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message = typeof body === "string" ? body : body?.message || "Request failed";
    throw new Error(message);
  }

  return body;
}
