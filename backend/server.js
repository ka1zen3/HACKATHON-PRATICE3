require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ── In-memory session store ──────────────────────────────────────────────────
// Tracks active seat sessions during server runtime.
// Shape: Map<seatId, SessionRecord>
//
// SessionRecord {
//   seatId:        string
//   areaId:        string
//   status:        'pending' | 'occupied' | 'overdue'
//   studentName:   string
//   studentNumber: string
//   reservedAt:    number  (ms timestamp)
//   claimDeadline: number  (ms, pending seats only)
//   occupiedAt:    number  (ms, occupied/overdue seats only)
//   dueAt:         number  (ms, occupied/overdue seats only)
//   releasedAt?:   number  (set when force-released by staff)
//   releasedBy?:   { id, username, full_name }  (set when force-released)
// }
//
// Released sessions move to releasedLog (capped at 200 entries) so the
// admin can see recent staff actions.

const activeSessions = new Map();
const releasedLog    = [];
const MAX_LOG        = 200;

function addToLog(record) {
  releasedLog.unshift(record);
  if (releasedLog.length > MAX_LOG) releasedLog.length = MAX_LOG;
}

// ── Simple token store ───────────────────────────────────────────────────────
// Maps opaque token → staff record. Tokens are random 32-byte hex strings.
// In production you would use JWTs or database-backed sessions; this keeps
// the demo self-contained with no extra dependencies.
const crypto = require('crypto');
const authTokens = new Map(); // token → { id, username, full_name, role, issuedAt }

function issueToken(staff) {
  const token = crypto.randomBytes(32).toString('hex');
  authTokens.set(token, { ...staff, issuedAt: Date.now() });
  return token;
}

// Token expiry: 8 hours (a full library shift)
const TOKEN_TTL = 8 * 60 * 60 * 1000;

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in first.' } });
  }

  const staff = authTokens.get(token);
  if (!staff) {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token not recognised. Please sign in again.' } });
  }

  if (Date.now() - staff.issuedAt > TOKEN_TTL) {
    authTokens.delete(token);
    return res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please sign in again.' } });
  }

  req.staff = staff;
  next();
}

// ── Health endpoints ─────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running 🚀' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const supabase = require('./db');

app.get('/api/health/db', async (req, res) => {
  const { data, error } = await supabase
    .from('settings')
    .select('reservation_minutes')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('DB health check failed:', error);
    return res.status(500).json({
      error: { code: 'DB_UNREACHABLE', message: 'Database check failed' },
    });
  }
  res.json({ status: 'ok', reservation_minutes: data.reservation_minutes });
});

// ── Staff / Admin login ──────────────────────────────────────────────────────
// POST /api/admin/login
// Body: { username: string, password: string }
// Returns 200 { ok: true, token: string, staff: { id, username, full_name, role } }
//      or 401 { error: { code, message } }
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    return res.status(400).json({
      error: { code: 'MISSING_FIELDS', message: 'Username and password are required.' },
    });
  }

  // Look up the staff account (case-insensitive username)
  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, username, full_name, role, password_hash')
    .ilike('username', username.trim())
    .single();

  if (error || !staff) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Username or password is incorrect.' },
    });
  }

  // Compare the submitted password against the stored bcrypt hash
  const passwordMatch = await bcrypt.compare(password, staff.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Username or password is incorrect.' },
    });
  }

  // Never send the hash back to the client
  const { password_hash, ...safeStaff } = staff;
  const token = issueToken(safeStaff);

  return res.json({ ok: true, token, staff: safeStaff });
});

// ── Admin logout ─────────────────────────────────────────────────────────────
// POST /api/admin/logout
// Header: Authorization: Bearer <token>
app.post('/api/admin/logout', requireAuth, (req, res) => {
  const header = req.headers['authorization'] ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) authTokens.delete(token);
  res.json({ ok: true });
});

// ── Sessions ─────────────────────────────────────────────────────────────────

// GET /api/sessions
// Returns all currently active sessions, sorted by duration desc.
// Requires: Authorization: Bearer <token>
app.get('/api/sessions', requireAuth, (req, res) => {
  const rows = Array.from(activeSessions.values()).sort(
    (a, b) =>
      (b.occupiedAt ?? b.reservedAt ?? 0) -
      (a.occupiedAt ?? a.reservedAt ?? 0),
  );
  res.json({ sessions: rows });
});

// POST /api/sessions/sync
// Frontend sends its full in-memory seat list so the backend stays in sync.
// Body: { seats: Seat[] }  (full seat array from AppContext)
// Returns 200 { ok: true, count: number }
// Requires: Authorization: Bearer <token>
app.post('/api/sessions/sync', requireAuth, (req, res) => {
  const { seats } = req.body ?? {};
  if (!Array.isArray(seats)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'seats array required.' } });
  }

  activeSessions.clear();
  for (const seat of seats) {
    if (seat.session) {
      activeSessions.set(seat.id, {
        seatId:        seat.id,
        areaId:        seat.areaId,
        status:        seat.status,
        studentName:   seat.session.studentName,
        studentNumber: seat.session.studentNumber,
        reservedAt:    seat.session.reservedAt    ?? null,
        claimDeadline: seat.session.claimDeadline ?? null,
        occupiedAt:    seat.session.occupiedAt    ?? null,
        dueAt:         seat.session.dueAt         ?? null,
      });
    }
  }

  res.json({ ok: true, count: activeSessions.size });
});

// POST /api/sessions/:seatId/claim
// Mark a pending seat as occupied (student clicked "I'm here").
// Body: { occupiedAt: number, dueAt: number }
// Requires: Authorization: Bearer <token>  (staff-triggered)
//   OR just match the studentNumber — accept either form for the demo.
app.post('/api/sessions/:seatId/claim', (req, res) => {
  const { seatId } = req.params;
  const { occupiedAt, dueAt } = req.body ?? {};

  const record = activeSessions.get(seatId);
  if (!record) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No active session for this seat.' } });
  }

  activeSessions.set(seatId, {
    ...record,
    status: 'occupied',
    occupiedAt: occupiedAt ?? Date.now(),
    dueAt: dueAt ?? (Date.now() + 4 * 60 * 60 * 1000),
    claimDeadline: null,
  });

  res.json({ ok: true, session: activeSessions.get(seatId) });
});

// POST /api/sessions/:seatId/release
// Force-releases a seat. Used by admin (force time-out) or student (time-out).
// Body: { reason: 'force' | 'timeout' | 'student' }
// Requires: Authorization: Bearer <token>
app.post('/api/sessions/:seatId/release', requireAuth, (req, res) => {
  const { seatId } = req.params;
  const { reason = 'force' } = req.body ?? {};

  const record = activeSessions.get(seatId);
  if (!record) {
    // Seat may already have been cleared — treat as idempotent success
    return res.json({ ok: true, alreadyReleased: true });
  }

  const released = {
    ...record,
    status: 'released',
    releasedAt: Date.now(),
    releasedBy: req.staff,
    reason,
  };
  activeSessions.delete(seatId);
  addToLog(released);

  res.json({ ok: true, released });
});

// GET /api/sessions/log
// Returns recent release history (last 200 events), most recent first.
// Requires: Authorization: Bearer <token>
app.get('/api/sessions/log', requireAuth, (req, res) => {
  res.json({ log: releasedLog });
});

// ── Students ─────────────────────────────────────────────────────────────────

// In-memory student store (mirrors the frontend's studentsMap for the demo)
const studentsStore = new Map();

// GET /api/students
// Returns all students as an array sorted by name.
// Requires: Authorization: Bearer <token>
app.get('/api/students', requireAuth, (req, res) => {
  const list = Array.from(studentsStore.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  res.json({ students: list });
});

// GET /api/students/:number
// Looks up a student by their normalised YY-NNNNN number.
// Open — no auth required so the student login page can call it.
app.get('/api/students/:number', (req, res) => {
  const number = req.params.number;
  const student = studentsStore.get(number);
  if (!student) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
  }
  res.json({ student });
});

// POST /api/students/import
// Bulk upsert students.
// Body: { students: Array<{ number, name, program, year }> }
// Requires: Authorization: Bearer <token>
app.post('/api/students/import', requireAuth, (req, res) => {
  const { students } = req.body ?? {};
  if (!Array.isArray(students)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'students array required.' } });
  }

  let added = 0;
  let updated = 0;
  for (const s of students) {
    if (!s.number || !s.name) continue;
    if (studentsStore.has(s.number)) {
      updated++;
    } else {
      added++;
    }
    studentsStore.set(s.number, {
      number:  s.number,
      name:    (s.name    ?? '').trim(),
      program: (s.program ?? '').trim(),
      year:    (s.year    ?? '').trim(),
    });
  }

  res.json({ ok: true, added, updated });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});