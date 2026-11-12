import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ADMIN_CREDENTIALS,
  AREAS,
  HOLD_WINDOW,
  HOUR,
  STUDENTS,
  createInitialSeats,
  normalizeStudentNumber,
} from '../data/mockData.js'
import { AppContext } from './useApp.js'

const API = 'http://localhost:5000'

// ── localStorage helpers ─────────────────────────────────────────────────────
// Persist admin auth across page refreshes AND browser restarts.
// localStorage survives tab closes and browser restarts; sessionStorage does not.
const SESSION_KEY = 'lib_admin_session'

function saveAdminSession(token, staff) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token, staff }))
  } catch {
    // localStorage unavailable (private browsing quota exceeded, etc.) — ignore
  }
}

function loadAdminSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.token || !parsed?.staff) return null
    return parsed
  } catch {
    return null
  }
}

function clearAdminSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

// ── Seat helpers ─────────────────────────────────────────────────────────────
function releaseSeat(seats, seatId) {
  return seats.map((seat) =>
    seat.id === seatId ? { ...seat, status: 'vacant', session: null } : seat,
  )
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  // ── Restore admin session from sessionStorage on mount ──────────────────
  const restoredSession = loadAdminSession()

  const [areas,         setAreas]         = useState(() => AREAS)
  const [studentsMap,   setStudentsMap]    = useState(() => ({ ...STUDENTS }))
  const [seats,         setSeats]          = useState(() => createInitialSeats(AREAS))
  const [student,       setStudent]        = useState(null)
  const [activeSession, setActiveSession]  = useState(null)
  const [adminAuthed,   setAdminAuthed]    = useState(() => Boolean(restoredSession))
  // staffInfo: { id, username, full_name, role } | null
  const [staffInfo,     setStaffInfo]      = useState(() => restoredSession?.staff ?? null)
  // authToken: opaque string used as Bearer token for all /api/* calls
  const [authToken,     setAuthToken]      = useState(() => restoredSession?.token ?? null)

  // ── Convenience: returns auth headers or empty object ───────────────────
  const authHeaders = useCallback(() => {
    if (!authToken) return {}
    return { Authorization: `Bearer ${authToken}` }
  }, [authToken])

  // ── Sync seat state to backend when it changes (best-effort) ────────────
  // This keeps the backend in-memory store aligned with the frontend so
  // /api/sessions returns live data even though the source of truth is still
  // the frontend's React state.
  useEffect(() => {
    if (!authToken) return
    fetch(`${API}/api/sessions/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ seats }),
    }).catch(() => {
      // Backend unreachable — silently ignore, all state is still in-memory
    })
  }, [seats, authToken, authHeaders])

  // ── Student lookup ───────────────────────────────────────────────────────
  const findStudentByNumber = useCallback(
    (value) => {
      const number = normalizeStudentNumber(value)
      const match = studentsMap[number]
      return match ? { ...match, number } : null
    },
    [studentsMap],
  )

  const confirmStudent = useCallback((nextStudent) => {
    setStudent(nextStudent)
  }, [])

  const signOut = useCallback(() => {
    if (activeSession) {
      setSeats((current) => releaseSeat(current, activeSession.seatId))
    }
    setStudent(null)
    setActiveSession(null)
  }, [activeSession])

  // ── Seat reservation ─────────────────────────────────────────────────────
  const reserveSeat = useCallback(
    (seatId) => {
      if (!student) return false
      const seat = seats.find((item) => item.id === seatId)
      if (!seat || seat.status !== 'vacant') return false

      const now = Date.now()
      const claimDeadline = now + HOLD_WINDOW
      const session = {
        id: `S-${seatId}-${now}`,
        seatId,
        areaId: seat.areaId,
        state: 'pending',
        reservedAt: now,
        claimDeadline,
        student,
      }

      setSeats((current) =>
        current.map((item) =>
          item.id === seatId
            ? {
                ...item,
                status: 'pending',
                session: {
                  studentName: student.name,
                  studentNumber: student.number,
                  reservedAt: now,
                  claimDeadline,
                },
              }
            : item,
        ),
      )
      setActiveSession(session)
      return true
    },
    [seats, student],
  )

  const markHere = useCallback(() => {
    if (!activeSession || activeSession.state !== 'pending') return
    const now = Date.now()
    const dueAt = now + 4 * HOUR

    setSeats((current) =>
      current.map((item) =>
        item.id === activeSession.seatId
          ? { ...item, status: 'occupied', session: { ...item.session, occupiedAt: now, dueAt } }
          : item,
      ),
    )
    setActiveSession({ ...activeSession, state: 'occupied', occupiedAt: now, dueAt })
  }, [activeSession])

  const timeOut = useCallback(() => {
    if (!activeSession) return
    setSeats((current) => releaseSeat(current, activeSession.seatId))
    setActiveSession(null)
  }, [activeSession])

  /**
   * forceTimeOut(seatId)
   * Admin-triggered seat release. Calls the backend (best-effort) so the
   * release is logged with the acting staff member, then immediately updates
   * local state so the UI responds without waiting for the network.
   */
  const forceTimeOut = useCallback(
    async (seatId) => {
      // Optimistic update — instant UI response
      setSeats((current) => releaseSeat(current, seatId))
      setActiveSession((current) => (current?.seatId === seatId ? null : current))

      // Best-effort backend log
      if (authToken) {
        fetch(`${API}/api/sessions/${seatId}/release`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ reason: 'force' }),
        }).catch(() => {
          // Backend unreachable — state already updated locally, ignore error
        })
      }
    },
    [authToken, authHeaders],
  )

  // ── Admin auth ───────────────────────────────────────────────────────────
  /**
   * adminLogin(username, password) → Promise<{ ok: boolean, error?: string }>
   *
   * Calls the backend API. Falls back to the local mock credentials when the
   * backend is unreachable (e.g. during offline demos).
   * On success: stores the auth token + staff object in context AND sessionStorage.
   */
  const adminLogin = useCallback(async (username, password) => {
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (res.ok) {
        const json = await res.json()
        setAdminAuthed(true)
        setStaffInfo(json.staff ?? null)
        setAuthToken(json.token ?? null)
        saveAdminSession(json.token ?? null, json.staff ?? null)
        return { ok: true }
      }

      const json = await res.json().catch(() => ({}))
      return { ok: false, error: json?.error?.message ?? 'Login failed.' }
    } catch {
      // Backend unreachable — fall back to mock credentials so demos still work
      const ok =
        username.trim().toLowerCase() === ADMIN_CREDENTIALS.username &&
        password === ADMIN_CREDENTIALS.password

      if (ok) {
        const mockStaff = { id: 0, username: 'admin', full_name: 'Admin', role: 'admin' }
        const mockToken = 'offline-demo-token'
        setAdminAuthed(true)
        setStaffInfo(mockStaff)
        setAuthToken(mockToken)
        saveAdminSession(mockToken, mockStaff)
      }
      return { ok, error: ok ? undefined : 'That username and password did not match.' }
    }
  }, [])

  /**
   * adminLogout()
   * Clears local auth state, removes sessionStorage entry, and calls
   * DELETE /api/admin/logout to invalidate the server-side token.
   */
  const adminLogout = useCallback(() => {
    // Best-effort server-side token invalidation
    if (authToken && authToken !== 'offline-demo-token') {
      fetch(`${API}/api/admin/logout`, {
        method: 'POST',
        headers: authHeaders(),
      }).catch(() => {})
    }

    setAdminAuthed(false)
    setStaffInfo(null)
    setAuthToken(null)
    clearAdminSession()
  }, [authToken, authHeaders])

  // ── Admin: bulk student import ───────────────────────────────────────────
  /**
   * importStudents(rows)
   *   rows: Array<{ number: string, name: string, program: string, year: string }>
   * Merges into the in-memory students map (upsert by normalised number).
   * Also syncs to backend (best-effort).
   * Returns { added, updated } counts.
   */
  const importStudents = useCallback(
    (rows) => {
      let added = 0
      let updated = 0
      setStudentsMap((prev) => {
        const next = { ...prev }
        for (const row of rows) {
          const number = normalizeStudentNumber(row.number)
          if (!number) continue
          if (next[number]) {
            updated++
          } else {
            added++
          }
          next[number] = {
            number,
            name: (row.name ?? '').trim(),
            program: (row.program ?? '').trim(),
            year: (row.year ?? '').trim(),
          }
        }
        return next
      })

      // Sync to backend (best-effort)
      if (authToken) {
        fetch(`${API}/api/students/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ students: rows }),
        }).catch(() => {})
      }

      return { added, updated }
    },
    [authToken, authHeaders],
  )

  // ── Admin: add seats to a section ────────────────────────────────────────
  /**
   * addSeatsToArea(areaId, tableId, seatLabels)
   * seatLabels: string[]  — exact labels for the new seats, e.g. ["A33","A34"]
   * Appends new vacant seats to the specified table and bumps the area seat count.
   * Silently skips any label that already exists in the seat list.
   */
  const addSeatsToArea = useCallback(
    (areaId, tableId, seatLabels) => {
      if (!seatLabels?.length) return

      setAreas((prevAreas) => {
        const added = seatLabels.length

        const next = prevAreas.map((area) => {
          if (area.id !== areaId) return area
          return {
            ...area,
            tables: area.tables.map((table) =>
              table.id === tableId
                ? { ...table, seats: table.seats + added }
                : table,
            ),
            count: area.count + added,
          }
        })

        setSeats((prevSeats) => {
          const existingIds = new Set(prevSeats.map((s) => s.id))
          const newSeats = seatLabels
            .filter((label) => !existingIds.has(label))
            .map((label) => ({
              id: label,
              label,
              areaId,
              tableId,
              status: 'vacant',
              session: null,
            }))
          return [...prevSeats, ...newSeats]
        })

        return next
      })
    },
    [],
  )

  // ── Demo reset ───────────────────────────────────────────────────────────
  const resetDemo = useCallback(() => {
    setAreas(AREAS)
    setStudentsMap({ ...STUDENTS })
    setSeats(createInitialSeats(AREAS))
    setActiveSession(null)
  }, [])

  const value = useMemo(
    () => ({
      areas,
      seats,
      studentsMap,
      student,
      activeSession,
      adminAuthed,
      staffInfo,
      authToken,
      findStudentByNumber,
      confirmStudent,
      signOut,
      reserveSeat,
      markHere,
      timeOut,
      forceTimeOut,
      adminLogin,
      adminLogout,
      importStudents,
      addSeatsToArea,
      resetDemo,
    }),
    [
      areas,
      seats,
      studentsMap,
      student,
      activeSession,
      adminAuthed,
      staffInfo,
      authToken,
      findStudentByNumber,
      confirmStudent,
      signOut,
      reserveSeat,
      markHere,
      timeOut,
      forceTimeOut,
      adminLogin,
      adminLogout,
      importStudents,
      addSeatsToArea,
      resetDemo,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
