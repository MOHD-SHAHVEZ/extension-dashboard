import React, { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { ensureFreshAccessToken } from "../services/api"

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

function clearSession() {
  localStorage.removeItem("token")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("email")
  localStorage.removeItem("role")
}

export default function PrivateRoute({ children, roles }) {
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const rolesKey = Array.isArray(roles) ? roles.join("|") : ""

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const existing = localStorage.getItem("token")
      const refresh = localStorage.getItem("refreshToken")
      if (!existing && !refresh) {
        if (!cancelled) {
          setAllowed(false)
          setReady(true)
        }
        return
      }

      await ensureFreshAccessToken()
      if (cancelled) return

      const token = localStorage.getItem("token")
      if (!token) {
        clearSession()
        setAllowed(false)
        setReady(true)
        return
      }

      const payload = decodeToken(token)
      if (payload?.exp) {
        const expMs = payload.exp > 1e12 ? payload.exp : payload.exp * 1000
        if (expMs + 60_000 < Date.now()) {
          clearSession()
          setAllowed(false)
          setReady(true)
          return
        }
      }

      if (rolesKey) {
        const roleList = rolesKey.split("|").filter(Boolean)
        const role = payload?.role || localStorage.getItem("role") || ""
        const ok = roleList.some((r) => r === role || `ROLE_${r}` === role || r === `ROLE_${role}`)
        if (!ok) {
          setAllowed("unauthorized")
          setReady(true)
          return
        }
      }

      setAllowed(true)
      setReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [rolesKey])

  if (!ready) return null
  if (allowed === "unauthorized") return <Navigate to="/unauthorized" replace />
  if (!allowed) return <Navigate to="/login" replace />
  return children
}
