// Thin HTTP client with base URL and bearer token support

async function apiRequest(path, { method = "GET", body, accessToken } = {}) {
  const base = await getBackendBaseUrl();
  if (!base) throw new Error("Backend URL not configured in Options");
  const url = apiBuildUrl(base, path);

  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}


