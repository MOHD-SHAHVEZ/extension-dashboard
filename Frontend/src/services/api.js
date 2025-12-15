// src/services/api.js
const BASE = "http://localhost:8080"; // backend base (no /api here)

function makeError(details) {
  const err = new Error(details.message || `API error ${details.status || ""}`);
  Object.assign(err, details);
  return err;
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  try {
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    // Only set Content-Type for JSON bodies on methods that send body
    const hasBody = body !== undefined && body !== null && (method === "POST" || method === "PUT" || method === "PATCH");
    if (hasBody && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: hasBody ? JSON.stringify(body) : undefined,
    });

    // handle 204 No Content
    if (res.status === 204) return null;

    // read text, then try parse json
    const text = await res.text().catch(() => null);
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    if (!res.ok) {
      throw makeError({
        url: `${BASE}${path}`,
        status: res.status,
        statusText: res.statusText,
        body: parsed,
        message: (parsed && parsed.message) ? parsed.message : `Request failed ${res.status}`,
      });
    }

    return parsed;
  } catch (err) {
    // network errors or thrown above -- normalize as Error
    if (!(err instanceof Error)) {
      throw makeError({ message: "Network or unknown error", body: err });
    }
    throw err;
  }
}

/* ---------------- AUTH ---------------- */
export async function login(credentials) {
  const res = await request("/api/auth/login", { method: "POST", body: credentials });
  if (res?.token) {
    localStorage.setItem("token", res.token);
    localStorage.setItem("username", res.username || "");
    localStorage.setItem("role", res.role || "");
  }
  return res;
}

export async function register(credentials) {
  return request("/api/auth/register", { method: "POST", body: credentials });
}

export async function registerDefaults() {
  return request("/api/auth/register-defaults", { method: "POST" });
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
}

/* --------------- SUMMARIES -------------- */
export async function getSummaries({ page = 1, limit = 10 } = {}) {
  return request(`/api/summaries?page=${page}&limit=${limit}`);
}

export async function getSummary(id) {
  if (id === undefined || id === null) throw new Error("Missing id for getSummary");
  // ensure primitive id (avoid passing object)
  const primitiveId = (typeof id === "object") ? (id.id ?? String(id)) : id;
  return request(`/api/summaries/${primitiveId}`);
}

export async function createSummary({ title, excerpt, content, sourceUrl }) {
  return request("/api/summaries", {
    method: "POST",
    body: { title, excerpt, content, sourceUrl },
  });
}

export async function updateSummary(id, data) {
  if (id === undefined || id === null) throw new Error("Missing id for updateSummary");
  return request(`/api/summaries/${id}`, { method: "PUT", body: data });
}

export async function deleteSummary(id) {
  if (id === undefined || id === null) throw new Error("Missing id for deleteSummary");
  return request(`/api/summaries/${id}`, { method: "DELETE" });
}

/* --------------- ADMIN ------------------ */
export async function getStats() {
  return request("/api/admin/stats");
}

/* --------------- UTILS ------------------ */
export function isLoggedIn() {
  return !!localStorage.getItem("token");
}

// Update the password and change the password 
// add near other exports in src/services/api.js

// src/services/api.js
export async function changePassword({ currentPassword, newPassword }) {
  return request("/api/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

// optional (if backend supports)
export async function getProfile() {
  return request("/api/auth/me"); // backend should return { username, name, avatarUrl }
}
export async function updateProfile(data) {
  return request("/api/auth/me", { method: "PUT", body: data });
}

