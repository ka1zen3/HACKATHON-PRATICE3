/**
 * useAdminApi — thin wrapper for admin-authenticated API calls.
 *
 * Returns { data, error, unauthorized } where:
 *   unauthorized=true  → token expired/invalid, user must re-login
 *   error (string)     → server error or network failure
 *   data               → success payload
 */
import { useCallback } from 'react'
import { useApp } from '../context/useApp.js'

const API = 'http://localhost:5000'

export function useAdminApi() {
  const { authToken, adminLogout } = useApp()

  const headers = useCallback(
    (extra = {}) => ({
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...extra,
    }),
    [authToken],
  )

  // If the server returns 401, the token is stale (server restarted).
  // Clear local auth so the user is redirected to login automatically.
  const handle401 = useCallback(() => {
    adminLogout()
  }, [adminLogout])

  const request = useCallback(
    async (url, options = {}) => {
      try {
        const res = await fetch(url, { ...options, headers: headers(options.headers ?? {}) })
        const json = await res.json().catch(() => ({}))
        if (res.status === 401) {
          handle401()
          return { data: null, error: 'Session expired. Please sign in again.', unauthorized: true }
        }
        if (!res.ok) {
          return { data: null, error: json?.error?.message ?? `Request failed (${res.status})`, unauthorized: false }
        }
        return { data: json, error: null, unauthorized: false }
      } catch {
        return { data: null, error: 'Backend unreachable.', unauthorized: false }
      }
    },
    [headers, handle401],
  )

  const getFloor = useCallback(
    () => request(`${API}/api/floor`),
    [request],
  )

  const getSessions = useCallback(async () => {
    const result = await request(`${API}/api/sessions`)
    if (result.data) return { ...result, data: result.data.sessions ?? [] }
    return result
  }, [request])

  const getStudents = useCallback(async () => {
    const result = await request(`${API}/api/students`)
    if (result.data) return { ...result, data: result.data.students ?? [] }
    return result
  }, [request])

  const importStudents = useCallback(
    (students) =>
      request(`${API}/api/students/import`, {
        method: 'POST',
        body: JSON.stringify({ students }),
      }),
    [request],
  )

  const releaseSession = useCallback(
    (seatId) =>
      request(`${API}/api/sessions/${seatId}/release`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'force' }),
      }),
    [request],
  )

  return { getFloor, getSessions, getStudents, importStudents, releaseSession }
}
