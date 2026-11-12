import { useCallback, useMemo, useState } from 'react'
import {
  ADMIN_CREDENTIALS,
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
  const [seats, setSeats] = useState(() => createInitialSeats())
  const [student, setStudent] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [adminAuthed, setAdminAuthed] = useState(false)

  const findStudentByNumber = useCallback((value) => {
    const number = normalizeStudentNumber(value)
    const match = STUDENTS[number]
    return match ? { ...match, number } : null
  }, [])

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
          ? {
              ...item,
              status: 'occupied',
              session: {
                ...item.session,
                occupiedAt: now,
                dueAt,
              },
            }
          : item,
      ),
    )
    setActiveSession({
      ...activeSession,
      state: 'occupied',
      occupiedAt: now,
      dueAt,
    })
  }, [activeSession])

  const timeOut = useCallback(() => {
    if (!activeSession) return
    setSeats((current) => releaseSeat(current, activeSession.seatId))
    setActiveSession(null)
  }, [activeSession])

  const forceTimeOut = useCallback((seatId) => {
    setSeats((current) => releaseSeat(current, seatId))
    setActiveSession((current) =>
      current?.seatId === seatId ? null : current,
    )
  }, [])

  const adminLogin = useCallback((username, password) => {
    const ok =
      username.trim().toLowerCase() === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    if (ok) setAdminAuthed(true)
    return ok
  }, [])

  const adminLogout = useCallback(() => {
    setAdminAuthed(false)
  }, [])

  const resetDemo = useCallback(() => {
    setSeats(createInitialSeats())
    setActiveSession(null)
  }, [])

  const value = useMemo(
    () => ({
      seats,
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
      resetDemo,
    }),
    [
      seats,
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
      resetDemo,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
