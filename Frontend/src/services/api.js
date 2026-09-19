

// src/services/api.js
const BASE = String(import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/$/, "");

/** Refresh when access token has less than this much life left. */
const REFRESH_SKEW_MS = 5 * 60 * 1000;

let refreshPromise = null;

function makeError(details) {
  const err = new Error(details.message || `API error ${details.status || ""}`);
  Object.assign(err, details);
  return err;
}

function readAccessToken() {
  const raw = localStorage.getItem("token");
  if (!raw) return "";
  return raw.trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "");
}

function readRefreshToken() {
  const raw = localStorage.getItem("refreshToken");
  if (!raw) return "";
  return raw.trim().replace(/^Bearer\s+/i, "").replace(/^["']|["']$/g, "");
}

function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = payloadB64.length % 4;
    const padded = payloadB64 + (pad ? "=".repeat(4 - pad) : "");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function tokenExpiresAtMs(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp > 1e12 ? payload.exp : payload.exp * 1000;
}

function isTokenExpiringSoon(token, skewMs = REFRESH_SKEW_MS) {
  const expMs = tokenExpiresAtMs(token);
  if (expMs == null) return false;
  return expMs - skewMs <= Date.now();
}

export function persistAuthSession(res) {
  if (!res) return;
  const access = res.token || res.accessToken;
  if (access) localStorage.setItem("token", access);
  if (res.refreshToken) localStorage.setItem("refreshToken", res.refreshToken);
  if (res.email != null) localStorage.setItem("email", res.email || "");
  if (res.role != null) localStorage.setItem("role", res.role || "");
}

function clearAuthStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("email");
  localStorage.removeItem("role");
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = readRefreshToken();
    const accessToken = readAccessToken();
    if (!refreshToken && !accessToken) {
      throw makeError({ status: 401, message: "No token available to refresh" });
    }

    const body = refreshToken
      ? { refreshToken }
      : { token: accessToken };

    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      mode: "cors",
      cache: "no-store",
    });

    const text = await res.text().catch(() => null);
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    if (!res.ok) {
      clearAuthStorage();
      throw makeError({
        url: `${BASE}/api/auth/refresh`,
        status: res.status,
        statusText: res.statusText,
        body: parsed,
        message: (parsed && (parsed.message || parsed.error)) || "Session expired",
      });
    }

    persistAuthSession(parsed);
    return parsed;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/** Ensure a usable access token — refreshes when missing/near expiry. */
export async function ensureFreshAccessToken() {
  const token = readAccessToken();
  if (token && !isTokenExpiringSoon(token)) return token;
  if (!readRefreshToken() && !token) return "";
  try {
    await refreshAccessToken();
    return readAccessToken();
  } catch {
    return readAccessToken();
  }
}

async function request(path, { method = "GET", body, headers = {}, _retry = true } = {}) {
  try {
    if (_retry && !path.startsWith("/api/auth/")) {
      await ensureFreshAccessToken();
    }

    const token = readAccessToken();
    const nextHeaders = new Headers(headers);
    if (token) nextHeaders.set("Authorization", `Bearer ${token}`);

    const hasBody = body !== undefined && body !== null && (method === "POST" || method === "PUT" || method === "PATCH");
    if (hasBody && !nextHeaders.has("Content-Type")) nextHeaders.set("Content-Type", "application/json");

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: nextHeaders,
      body: hasBody ? JSON.stringify(body) : undefined,
      mode: "cors",
      cache: "no-store",
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
      const canRefresh =
        res.status === 401 &&
        _retry &&
        !path.startsWith("/api/auth/") &&
        (!!readRefreshToken() || !!token);

      if (canRefresh) {
        try {
          await refreshAccessToken();
          return request(path, { method, body, headers, _retry: false });
        } catch {
          /* fall through to throw original */
        }
      }

      if (res.status === 401 && token) {
        console.warn(`API 401 with token present: ${method} ${path}`);
      }
      const fallback = (parsed && (parsed.message || parsed.error || parsed.reason))
        ? (parsed.message || parsed.error || parsed.reason)
        : `Request failed ${res.status}`;
      throw makeError({
        url: `${BASE}${path}`,
        status: res.status,
        statusText: res.statusText,
        body: parsed,
        message: fallback,
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
  const res = await request("/api/auth/login", { method: "POST", body: credentials, _retry: false });
  persistAuthSession(res);
  return res;
}

export async function register(credentials) {
  return request("/api/auth/register", { method: "POST", body: credentials, _retry: false });
}

export async function verifyOtp(data) {
  const res = await request("/api/auth/verify-otp", { method: "POST", body: data, _retry: false });
  if (res?.token || res?.accessToken) persistAuthSession(res);
  return res;
}

export async function resendOtp(data) {
  return request("/api/auth/resend-otp", { method: "POST", body: data, _retry: false });
}

export async function refreshSession() {
  return refreshAccessToken();
}

export async function registerDefaults() {
  return request("/api/auth/register-defaults", { method: "POST", _retry: false });
}

export function logout() {
  clearAuthStorage();
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

export async function getAdminSummaries({ limit = 20 } = {}) {
  return request(`/api/admin/summaries?limit=${limit}`);
}

/* --------------- TASKS ------------------ */
export async function getTasks({ scope = "all", date, year, month, from, to, day } = {}) {
  const params = new URLSearchParams();
  if (scope) params.set("scope", scope);
  if (date) params.set("date", date);
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (day) params.set("day", day);
  return request(`/api/tasks?${params.toString()}`);
}

export async function getTaskHistory({ date, year, month, from, to, day } = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (day) params.set("day", day);
  return request(`/api/tasks/history?${params.toString()}`);
}

export async function createTask(data) {
  return request("/api/tasks", { method: "POST", body: data });
}

export async function updateTask(id, data) {
  if (id === undefined || id === null) throw new Error("Missing id for updateTask");
  return request(`/api/tasks/${id}`, { method: "PATCH", body: data });
}

export async function deleteTask(id) {
  if (id === undefined || id === null) throw new Error("Missing id for deleteTask");
  return request(`/api/tasks/${id}`, { method: "DELETE" });
}

export async function deleteCompletedTasks({ from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const q = params.toString();
  return request(`/api/tasks/completed${q ? `?${q}` : ""}`, { method: "DELETE" });
}

/* --------------- SCHEDULE --------------- */
export async function getSchedule(day) {
  const q = day ? `?day=${encodeURIComponent(day)}` : "";
  return request(`/api/schedule${q}`);
}

export async function getTodaySchedule() {
  return request("/api/schedule/today");
}

export async function createScheduleSlot(data) {
  return request("/api/schedule", { method: "POST", body: data });
}

export async function updateScheduleSlot(id, data) {
  if (id === undefined || id === null) throw new Error("Missing id for updateScheduleSlot");
  return request(`/api/schedule/${id}`, { method: "PUT", body: data });
}

export async function deleteScheduleSlot(id) {
  if (id === undefined || id === null) throw new Error("Missing id for deleteScheduleSlot");
  return request(`/api/schedule/${id}`, { method: "DELETE" });
}

export async function generateAiTimetable(data) {
  return request("/api/schedule/ai-plan", { method: "POST", body: data });
}

export async function applyAiTimetable(data) {
  return request("/api/schedule/ai-plan/apply", { method: "POST", body: data });
}

/* --------------- DASHBOARD -------------- */
export async function getDashboard() {
  return request("/api/dashboard");
}

export async function summarizeUrl(sourceUrl) {
  const created = await request("/api/summaries/from-url", {
    method: "POST",
    body: { sourceUrl },
  });
  if (!created?.id) return created;
  if (created.status === "READY" || created.status === "FAILED") return created;

  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const current = await getSummary(created.id);
    if (!current) return created;
    if (current.status === "READY" || current.status === "FAILED" || !current.status) {
      return current;
    }
  }
  return created;
}

/* --------------- NOTEBOOKS -------------- */
export async function getNotebooks() {
  return request("/api/notebooks");
}

export async function getNotebook(id) {
  if (id === undefined || id === null) throw new Error("Missing id for getNotebook");
  return request(`/api/notebooks/${id}`);
}

export async function createNotebook(data) {
  return request("/api/notebooks", { method: "POST", body: data });
}

export async function updateNotebook(id, data) {
  if (id === undefined || id === null) throw new Error("Missing id for updateNotebook");
  return request(`/api/notebooks/${id}/update`, { method: "POST", body: data });
}

export async function deleteNotebook(id) {
  if (id === undefined || id === null) throw new Error("Missing id for deleteNotebook");
  return request(`/api/notebooks/${id}`, { method: "DELETE" });
}

export async function getLessons(notebookId) {
  if (notebookId === undefined || notebookId === null) throw new Error("Missing notebookId");
  return request(`/api/notebooks/${notebookId}/lessons`);
}

export async function createLesson(notebookId, data) {
  if (notebookId === undefined || notebookId === null) throw new Error("Missing notebookId");
  return request(`/api/notebooks/${notebookId}/lessons`, { method: "POST", body: data });
}

export async function getLesson(id) {
  if (id === undefined || id === null) throw new Error("Missing id for getLesson");
  return request(`/api/lessons/${id}`);
}

export async function updateLesson(id, data) {
  if (id === undefined || id === null) throw new Error("Missing id for updateLesson");
  return request(`/api/lessons/${id}`, { method: "PUT", body: data });
}

export async function deleteLesson(id) {
  if (id === undefined || id === null) throw new Error("Missing id for deleteLesson");
  return request(`/api/lessons/${id}`, { method: "DELETE" });
}

export async function importLessonFile(lessonId, file, _retry = true) {
  if (lessonId === undefined || lessonId === null) throw new Error("Missing lessonId");
  if (!file) throw new Error("Choose a file first");
  if (_retry) await ensureFreshAccessToken();
  const token = readAccessToken();
  const form = new FormData();
  form.append("file", file);
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE}/api/lessons/${lessonId}/import-file`, {
    method: "POST",
    headers,
    body: form,
    mode: "cors",
    cache: "no-store",
  });

  const text = await res.text().catch(() => null);
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    if (res.status === 401 && _retry && (readRefreshToken() || token)) {
      try {
        await refreshAccessToken();
        return importLessonFile(lessonId, file, false);
      } catch {
        /* fall through */
      }
    }
    const fallback = (parsed && (parsed.message || parsed.error || parsed.reason))
      ? (parsed.message || parsed.error || parsed.reason)
      : `Request failed ${res.status}`;
    throw makeError({
      url: `${BASE}/api/lessons/${lessonId}/import-file`,
      status: res.status,
      statusText: res.statusText,
      body: parsed,
      message: fallback,
    });
  }
  return parsed;
}

/* --------------- LESSON AI SUMMARIES (Spring AI, not /api/summaries) -------------- */
export async function generateLessonAiSummary(lessonId) {
  if (lessonId === undefined || lessonId === null) throw new Error("Missing lessonId");
  return request(`/api/lessons/${lessonId}/ai-summaries/generate`, { method: "POST" });
}

export async function getLessonAiSummaries(lessonId) {
  if (lessonId === undefined || lessonId === null) throw new Error("Missing lessonId");
  return request(`/api/lessons/${lessonId}/ai-summaries`);
}

export async function getSavedLessonAiSummaries() {
  return request("/api/lesson-ai-summaries");
}

export async function saveLessonAiSummary(id) {
  if (id === undefined || id === null) throw new Error("Missing id for saveLessonAiSummary");
  return request(`/api/lesson-ai-summaries/${id}/save`, { method: "POST" });
}

export async function getLessonAiSummary(id) {
  if (id === undefined || id === null) throw new Error("Missing id for getLessonAiSummary");
  return request(`/api/lesson-ai-summaries/${id}`);
}

export async function deleteLessonAiSummary(id) {
  if (id === undefined || id === null) throw new Error("Missing id for deleteLessonAiSummary");
  return request(`/api/lesson-ai-summaries/${id}`, { method: "DELETE" });
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
  return request("/api/users/me");
}
export async function updateProfile(data) {
  return request("/api/users/me", { method: "PATCH", body: data });
}

export async function uploadAvatar(file, _retry = true) {
  if (_retry) await ensureFreshAccessToken();
  const token = readAccessToken();
  const form = new FormData();
  form.append("file", file);
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE}/api/users/me/avatar`, {
    method: "POST",
    headers,
    body: form,
    mode: "cors",
    cache: "no-store",
  });

  const text = await res.text().catch(() => null);
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    if (res.status === 401 && _retry && (readRefreshToken() || token)) {
      try {
        await refreshAccessToken();
        return uploadAvatar(file, false);
      } catch {
        /* fall through */
      }
    }
    const fallback = (parsed && (parsed.message || parsed.error || parsed.reason))
      ? (parsed.message || parsed.error || parsed.reason)
      : `Request failed ${res.status}`;
    throw makeError({
      url: `${BASE}/api/users/me/avatar`,
      status: res.status,
      statusText: res.statusText,
      body: parsed,
      message: fallback,
    });
  }

  return parsed;
}

