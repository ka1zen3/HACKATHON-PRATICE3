export const MINUTE = 60 * 1000
export const HOUR = 60 * MINUTE
export const SESSION_LIMIT = 4 * HOUR
export const HOLD_WINDOW = 15 * MINUTE

/**
 * Library floor plan — 1 building, 2nd floor, 4 sections.
 *
 * Student numbers use the format: YY-NNNNN  (e.g. 23-00174)
 *   YY    = 2-digit year of enrolment
 *   NNNNN = 5-digit ID
 *
 * Each area carries a `tables` array that describes the physical layout:
 *   type: 'long' | 'square' | 'carrel'
 *   seats: how many seats on this table
 *   cols:  grid columns for this table's row of seats
 *
 * The `cols` on the AREA itself is used by the legacy SeatGrid fallback only.
 */
export const AREAS = [
  {
    id: 'reading',
    name: 'Reading & Study Section',
    short: 'Reading',
    floor: '2nd floor · Area A',
    prefix: 'A',
    blurb: 'Long tables with reading lamps and 4-seater clusters. Quiet conversation allowed.',
    amenities: ['Lamps', 'Power', 'Quiet'],
    cols: 8,
    count: 32,
    tables: [
      { id: 'A-L1', label: 'Long Table 1', type: 'long',   seats: 8, cols: 8 },
      { id: 'A-L2', label: 'Long Table 2', type: 'long',   seats: 8, cols: 8 },
      { id: 'A-S1', label: 'Table A',      type: 'square', seats: 4, cols: 2 },
      { id: 'A-S2', label: 'Table B',      type: 'square', seats: 4, cols: 2 },
      { id: 'A-S3', label: 'Table C',      type: 'square', seats: 4, cols: 2 },
      { id: 'A-S4', label: 'Table D',      type: 'square', seats: 4, cols: 2 },
    ],
  },
  {
    id: 'thesis',
    name: 'Thesis & Feasibility Section',
    short: 'Thesis',
    floor: '2nd floor · Area B',
    prefix: 'B',
    blurb: 'Smaller 4-seat tables near the reference shelves. Silence required.',
    amenities: ['Silent', 'Reference shelves', 'Power'],
    cols: 4,
    count: 16,
    tables: [
      { id: 'B-T1', label: 'Table T1', type: 'square', seats: 4, cols: 2 },
      { id: 'B-T2', label: 'Table T2', type: 'square', seats: 4, cols: 2 },
      { id: 'B-T3', label: 'Table T3', type: 'square', seats: 4, cols: 2 },
      { id: 'B-T4', label: 'Table T4', type: 'square', seats: 4, cols: 2 },
    ],
  },
  {
    id: 'periodicals',
    name: 'Periodicals & Information Section',
    short: 'Periodicals',
    floor: '2nd floor · Area C',
    prefix: 'C',
    blurb: 'A long reading table in the centre of the room. Walk-in browsing area.',
    amenities: ['Newspapers', 'Journals', 'Natural light'],
    cols: 8,
    count: 8,
    tables: [
      { id: 'C-P1', label: 'Reading Table', type: 'long', seats: 8, cols: 8 },
    ],
  },
  {
    id: 'carrels',
    name: 'Individual Carrels',
    short: 'Carrels',
    floor: '2nd floor · Area D',
    prefix: 'D',
    blurb: 'Single isolated desks for deep focus. No neighbours, no distractions.',
    amenities: ['Silent', 'Single desk', 'Power'],
    cols: 4,
    count: 8,
    tables: [
      { id: 'D-C1', label: 'Carrel 1', type: 'carrel', seats: 1, cols: 1 },
      { id: 'D-C2', label: 'Carrel 2', type: 'carrel', seats: 1, cols: 1 },
      { id: 'D-C3', label: 'Carrel 3', type: 'carrel', seats: 1, cols: 1 },
      { id: 'D-C4', label: 'Carrel 4', type: 'carrel', seats: 1, cols: 1 },
      { id: 'D-C5', label: 'Carrel 5', type: 'carrel', seats: 1, cols: 1 },
      { id: 'D-C6', label: 'Carrel 6', type: 'carrel', seats: 1, cols: 1 },
      { id: 'D-C7', label: 'Carrel 7', type: 'carrel', seats: 1, cols: 1 },
      { id: 'D-C8', label: 'Carrel 8', type: 'carrel', seats: 1, cols: 1 },
    ],
  },
]

// Pre-seeded occupancy keyed by seat label — student numbers use YY-NNNNN format
const OCCUPANCY = {
  // Area A — Reading & Study
  'A03': { status: 'occupied', student: 'Maya Reyes',       number: '24-00123', ago: 84 },
  'A04': { status: 'occupied', student: 'Noah Lim',         number: '23-00412', ago: 128 },
  'A11': { status: 'pending',  student: 'Liza Tan',         number: '25-00311', holdLeft: 9 },
  'A14': { status: 'occupied', student: 'Iris Bautista',    number: '24-00618', ago: 31 },
  'A17': { status: 'occupied', student: 'Rafael Cruz',      number: '22-00225', ago: 205 },
  'A20': { status: 'pending',  student: 'Ava Santos',       number: '23-00733', holdLeft: 6 },
  'A23': { status: 'occupied', student: 'Miguel Reyes',     number: '25-00642', ago: 47 },
  'A28': { status: 'overdue',  student: 'Daniel Cruz',      number: '23-00871', ago: 252 },
  // Area B — Thesis
  'B02': { status: 'occupied', student: 'Ella Garcia',      number: '24-00903', ago: 96 },
  'B05': { status: 'pending',  student: 'Bea Ramos',        number: '25-00118', holdLeft: 11 },
  'B09': { status: 'occupied', student: 'Team Hive',        number: '24-00999', ago: 74 },
  'B12': { status: 'occupied', student: 'Sam Ortega',       number: '22-01456', ago: 38 },
  // Area C — Periodicals
  'C02': { status: 'occupied', student: 'Kai Delos Santos', number: '25-00744', ago: 22 },
  'C05': { status: 'pending',  student: 'Mika Alvarez',     number: '24-00381', holdLeft: 13 },
  'C07': { status: 'occupied', student: 'Jules Mendoza',    number: '23-00595', ago: 55 },
  // Area D — Carrels
  'D02': { status: 'occupied', student: 'Paolo Reyes',      number: '24-00815', ago: 56 },
  'D04': { status: 'pending',  student: 'Tessa Lim',        number: '22-00467', holdLeft: 8 },
  'D06': { status: 'overdue',  student: 'Nico Tan',         number: '25-00290', ago: 272 },
}

export function createInitialSeats(areas = AREAS) {
  const now = Date.now()
  const seats = []

  for (const area of areas) {
    let seatIndex = 1
    for (const table of area.tables) {
      for (let i = 0; i < table.seats; i++) {
        const label = `${area.prefix}${String(seatIndex).padStart(2, '0')}`
        const base = { id: label, label, areaId: area.id, tableId: table.id }
        const entry = OCCUPANCY[label]

        if (!entry) {
          seats.push({ ...base, status: 'vacant', session: null })
        } else if (entry.status === 'pending') {
          const reservedAt = now - (15 - entry.holdLeft) * MINUTE
          seats.push({
            ...base,
            status: 'pending',
            session: {
              studentName: entry.student,
              studentNumber: entry.number,
              reservedAt,
              claimDeadline: now + entry.holdLeft * MINUTE,
            },
          })
        } else {
          const occupiedAt = now - entry.ago * MINUTE
          seats.push({
            ...base,
            status: entry.status,
            session: {
              studentName: entry.student,
              studentNumber: entry.number,
              occupiedAt,
              dueAt: occupiedAt + SESSION_LIMIT,
            },
          })
        }
        seatIndex++
      }
    }
  }

  return seats
}

/** Demo student — format YY-NNNNN */
export const DEMO_STUDENT_NUMBER = '24-00457'

/**
 * In-memory students table.
 * Keys are canonical YY-NNNNN format.
 */
export const STUDENTS = {
  '24-00457': {
    number: '24-00457',
    name: 'Alex Rivera',
    program: 'BS Information Systems',
    year: '2nd year',
  },
  '24-00123': {
    number: '24-00123',
    name: 'Maya Reyes',
    program: 'BS Computer Science',
    year: '3rd year',
  },
  '23-00871': {
    number: '23-00871',
    name: 'Daniel Cruz',
    program: 'BS Architecture',
    year: '4th year',
  },
  '22-01456': {
    number: '22-01456',
    name: 'Sam Ortega',
    program: 'BA Communication',
    year: '5th year',
  },
  '25-00311': {
    number: '25-00311',
    name: 'Liza Tan',
    program: 'BS Biology',
    year: '1st year',
  },
  '23-00174': {
    number: '23-00174',
    name: 'Jordan Santos',
    program: 'BS Computer Engineering',
    year: '3rd year',
  },
}

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'library123',
}

/**
 * Normalises any user input into canonical YY-NNNNN format.
 *
 * Accepted inputs
 *   "23-00174"   → "23-00174"   (already canonical)
 *   "2300174"    → "23-00174"   (7 raw digits)
 *   "23 00174"   → "23-00174"   (spaces stripped)
 *   "2024-00457" → "24-00457"   (legacy 4-digit year → last 2 digits)
 */
export function normalizeStudentNumber(value) {
  const compact = String(value ?? '')
    .trim()
    .replace(/\s+/g, '')

  // Strip all non-digits then inspect the digit count
  const digits = compact.replace(/[^0-9]/g, '')

  // 7 digits: YYNNNNN → YY-NNNNN
  if (/^\d{7}$/.test(digits)) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`
  }

  // 9 digits (legacy YYYY-NNNNN style without dash): use last 2 of year
  if (/^\d{9}$/.test(digits)) {
    return `${digits.slice(2, 4)}-${digits.slice(4)}`
  }

  // If it already looks like YY-NNNNN return as-is
  if (/^\d{2}-\d{5}$/.test(compact)) {
    return compact
  }

  // Legacy YYYY-NNNNN with dash
  if (/^\d{4}-\d{5}$/.test(compact)) {
    return `${compact.slice(2, 4)}-${compact.slice(5)}`
  }

  return compact
}

export function findStudent(value, studentsMap = STUDENTS) {
  const number = normalizeStudentNumber(value)
  const match = studentsMap[number]
  if (!match) return null
  return { ...match, number }
}
