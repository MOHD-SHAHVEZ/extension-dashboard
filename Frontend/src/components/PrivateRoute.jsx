import React from "react"
import { Navigate } from "react-router-dom"

function decodeToken(token) {
  if (!token) return null
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const pad = payloadB64.length % 4
    const padded = payloadB64 + (pad ? "=".repeat(4 - pad) : "")
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

export default function PrivateRoute({ children, roles }) {
  const token = localStorage.getItem("token")
  if (!token) return <Navigate to="/login" replace />

  const payload = decodeToken(token)
  if (payload?.exp) {
    const expMs = payload.exp > 1e12 ? payload.exp : payload.exp * 1000
    // 60s clock skew — do not kick a brand-new session
    if (expMs + 60_000 < Date.now()) {
      localStorage.removeItem("token")
      localStorage.removeItem("email")
      localStorage.removeItem("role")
      return <Navigate to="/login" replace />
    }
  }

  if (roles && roles.length) {
    const role = payload?.role || localStorage.getItem("role") || ""
    const allowed = roles.some((r) => r === role || `ROLE_${r}` === role || r === `ROLE_${role}`)
    if (!allowed) return <Navigate to="/unauthorized" replace />
  }

  return children
}
