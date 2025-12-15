import React from "react"
import { Navigate } from "react-router-dom"

/**
 * PrivateRoute - simple auth gate.
 * This avoids depending on jwt-decode (which sometimes fails in Vite bundling).
 * It supports:
 *  - real JWT (three parts: header.payload.signature)
 *  - our mock token (base64(JSON))
 */
function decodeToken(token) {
  if (!token) return null
  try {
    // If token looks like a real JWT (has 2 dots), decode payload
    const parts = token.split('.')
    if (parts.length === 3) {
      // base64url -> base64
      const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      // pad base64 string
      const pad = payloadB64.length % 4
      const padded = payloadB64 + (pad ? '='.repeat(4 - pad) : '')
      const json = atob(padded)
      return JSON.parse(json)
    }
    // otherwise assume it's base64(JSON) (our mock token)
    return JSON.parse(atob(token))
  } catch (err) {
    return null
  }
}

export default function PrivateRoute({ children, roles }) {
  const token = localStorage.getItem("token")
  if (!token) return <Navigate to="/login" replace />

  const payload = decodeToken(token)
  if (!payload) return <Navigate to="/login" replace />

  if (roles && !roles.includes(payload.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
