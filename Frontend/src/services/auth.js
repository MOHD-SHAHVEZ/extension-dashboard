// src/services/auth.js

// Get token from localStorage
export function getToken() {
  return localStorage.getItem("token");
}

// Get role from JWT or localStorage
export function getRole() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || localStorage.getItem("role");
  } catch {
    return localStorage.getItem("role");
  }
}

// Check if user is authenticated
export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000; // JWT exp (ms)
    return Date.now() < exp;
  } catch {
    return false;
  }
}

// Logout (clear localStorage)
export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("username");
}

// Decode full JWT payload
export function decodeToken() {
  const token = getToken();
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}
