import { useCallback, useMemo, useState } from 'react'
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

function releaseSeat(seats, seatId) {
  return seats.map((seat) =>
    seat.id === seatId ? { ...seat, status: 'vacant', session: null } : seat,
  )
}

export function AppProvider({ children }) {
  // Mutable copies so admin can add seats / students
  const [areas,         setAreas]         = useState(() => AREAS)
  const [studentsMap,   setStudentsMap]    = useState(() => ({ ...STUDENTS }))
  const [seats,         setSeats]          = useState(() => createInitialSeats(AREAS))
  const [student,       setStudent]        = useState(null)
  const [activeSession, setActiveSession]  = useState(null)
  const [adminAuthed,   setAdminAuthed]    = useState(false)

  // ── Student lookup ──────────────────────────────────────────
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

  // ── Seat reservation ────────────────────────────────────────
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

  const forceTimeOut = useCallback((seatId) => {
    setSeats((current) => releaseSeat(current, seatId))
    setActiveSession((current) => (current?.seatId === seatId ? null : current))
  }, [])

  // ── Admin auth ──────────────────────────────────────────────
  /**
   * adminLogin(username, password) → Promise<{ ok: boolean, error?: string }>
   *
   * Calls the backend API. Falls back to the local mock credentials when the
   * backend is unreachable (e.g. during offline demos).
   */
  const adminLogin = useCallback(async (username, password) => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (res.ok) {
        setAdminAuthed(true)
        return { ok: true }
      }

      const json = await res.json().catch(() => ({}))
      return { ok: false, error: json?.error?.message ?? 'Login failed.' }
    } catch {
      // Backend unreachable — fall back to mock credentials so demos still work
      const ok =
        username.trim().toLowerCase() === ADMIN_CREDENTIALS.username &&
        password === ADMIN_CREDENTIALS.password
      if (ok) setAdminAuthed(true)
      return { ok, error: ok ? undefined : 'That username and password did not match.' }
    }
  }, [])

  const adminLogout = useCallback(() => setAdminAuthed(false), [])

  // ── Admin: bulk student import ──────────────────────────────
  /**
   * importStudents(rows)
   *   rows: Array<{ number: string, name: string, program: string, year: string }>
   * Merges into the in-memory students map (upsert by normalised number).
   * Returns { added, updated } counts.
   */
  const importStudents = useCallback((rows) => {
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
    return { added, updated }
  }, [])

  // ── Admin: add seats to a section ──────────────────────────
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

  // ── Demo reset ──────────────────────────────────────────────
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
