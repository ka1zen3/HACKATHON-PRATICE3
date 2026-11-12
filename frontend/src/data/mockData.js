export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE
export const SESSION_LIMIT = 4 * HOUR
export const HOLD_WINDOW = 15 * MINUTE

export const AREAS = [
  {
    id: 'reading',
    name: 'Reading Hall',
    short: 'Reading',
    floor: 'Level 1 · East wing',
    prefix: 'R',
    count: 12,
    cols: 4,
    blurb: 'Long tables, reading lamps, and a room that stays quiet.',
    amenities: ['Silent', 'Lamps', 'Power'],
  },
  {
    id: 'quiet',
    name: 'Quiet Zone',
    short: 'Quiet',
    floor: 'Level 2 · North wing',
    prefix: 'Q',
    count: 12,
    cols: 4,
    blurb: 'No calls, no keyboards. The deepest focus in the building.',
    amenities: ['Silent', 'Single desks', 'Power'],
  },
  {
    id: 'group',
    name: 'Group Study',
    short: 'Group',
    floor: 'Level 2 · Atrium',
    prefix: 'G',
    count: 10,
    cols: 5,
    blurb: 'Whiteboards and shared power for the whole table.',
    amenities: ['Whiteboard', 'Talk allowed', 'Power'],
  },
  {
    id: 'lab',
    name: 'Computer Lab',
    short: 'Lab',
    floor: 'Level 3 · West wing',
    prefix: 'C',
    count: 12,
    cols: 4,
    blurb: 'Workstations loaded with the software you actually need.',
    amenities: ['Workstations', 'Printing', 'Power'],
  },
]

const OCCUPANCY = {
  R02: { status: 'occupied', student: 'Maya Reyes', number: '2024-00123', ago: 84 },
  R04: { status: 'occupied', student: 'Noah Lim', number: '2023-00412', ago: 128 },
  R07: { status: 'pending', student: 'Liza Tan', number: '2025-00311', holdLeft: 9 },
  R09: { status: 'occupied', student: 'Iris Bautista', number: '2024-00618', ago: 31 },
  R11: { status: 'occupied', student: 'Rafael Cruz', number: '2022-00225', ago: 205 },
  Q02: { status: 'occupied', student: 'Ava Santos', number: '2023-00733', ago: 62 },
  Q04: { status: 'pending', student: 'Miguel Reyes', number: '2025-00642', holdLeft: 13 },
  Q05: { status: 'occupied', student: 'Daniel Cruz', number: '2023-00871', ago: 47 },
  Q08: { status: 'occupied', student: 'Ella Garcia', number: '2024-00903', ago: 96 },
  Q11: { status: 'occupied', student: 'Bea Ramos', number: '2025-00118', ago: 18 },
  G01: { status: 'occupied', student: 'Team Hive', number: '2024-GROUP', ago: 74 },
  G03: { status: 'overdue', student: 'Sam Ortega', number: '2022-01456', ago: 252 },
  G05: { status: 'pending', student: 'Kai Delos Santos', number: '2025-00744', holdLeft: 4 },
  G06: { status: 'occupied', student: 'Mika Alvarez', number: '2024-00381', ago: 38 },
  G09: { status: 'occupied', student: 'Jules Mendoza', number: '2023-00595', ago: 112 },
  C01: { status: 'occupied', student: 'Paolo Reyes', number: '2024-00815', ago: 56 },
  C03: { status: 'occupied', student: 'Tessa Lim', number: '2022-00467', ago: 232 },
  C06: { status: 'occupied', student: 'Nico Tan', number: '2025-00290', ago: 27 },
  C08: { status: 'pending', student: 'Rina Aquino', number: '2024-00702', holdLeft: 11 },
  C10: { status: 'occupied', student: 'Andrea Flores', number: '2023-00684', ago: 141 },
}

export function createInitialSeats() {
  const now = Date.now()

  return AREAS.flatMap((area) =>
    Array.from({ length: area.count }, (_, index) => {
      const label = `${area.prefix}${String(index + 1).padStart(2, '0')}`
      const base = { id: label, label, areaId: area.id }
      const entry = OCCUPANCY[label]

      if (!entry) {
        return { ...base, status: 'vacant', session: null }
      }

      if (entry.status === 'pending') {
        const reservedAt = now - (15 - entry.holdLeft) * MINUTE
        return {
          ...base,
          status: 'pending',
          session: {
            studentName: entry.student,
            studentNumber: entry.number,
            reservedAt,
            claimDeadline: now + entry.holdLeft * MINUTE,
          },
        }
      }

      const occupiedAt = now - entry.ago * MINUTE
      return {
        ...base,
        status: entry.status,
        session: {
          studentName: entry.student,
          studentNumber: entry.number,
          occupiedAt,
          dueAt: occupiedAt + SESSION_LIMIT,
        },
      }
    }),
  )
}

export const DEMO_STUDENT_NUMBER = '2024-00457'

export const STUDENTS = {
  '2024-00457': {
    number: '2024-00457',
    name: 'Alex Rivera',
    program: 'BS Information Systems',
    year: '2nd year',
  },
  '2024-00123': {
    number: '2024-00123',
    name: 'Maya Reyes',
    program: 'BS Computer Science',
    year: '3rd year',
  },
  '2023-00871': {
    number: '2023-00871',
    name: 'Daniel Cruz',
    program: 'BS Architecture',
    year: '4th year',
  },
  '2022-01456': {
    number: '2022-01456',
    name: 'Sam Ortega',
    program: 'BA Communication',
    year: '5th year',
  },
  '2025-00311': {
    number: '2025-00311',
    name: 'Liza Tan',
    program: 'BS Biology',
    year: '1st year',
  },
}

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'library123',
}

export function normalizeStudentNumber(value) {
  const compact = String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
  const digits = compact.replace(/[^0-9]/g, '')

  if (/^\d{9}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }

  return compact
}

export function findStudent(value) {
  const number = normalizeStudentNumber(value)
  const match = STUDENTS[number]
  if (!match) return null
  return { ...match, number }
}
