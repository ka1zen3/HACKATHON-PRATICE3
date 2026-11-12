require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const supabase = require('./db');

// ── Token store ──────────────────────────────────────────────────────────────
const authTokens = new Map(); // token → { id, username, full_name, role, issuedAt }
const TOKEN_TTL  = 8 * 60 * 60 * 1000; // 8 hours

function issueToken(staff) {
  const token = crypto.randomBytes(32).toString('hex');
  authTokens.set(token, { ...staff, issuedAt: Date.now() });
  return token;
}

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in first.' } });

  const staff = authTokens.get(token);
  if (!staff) return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token not recognised. Please sign in again.' } });

  if (Date.now() - staff.issuedAt > TOKEN_TTL) {
    authTokens.delete(token);
    return res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please sign in again.' } });
  }

  req.staff = staff;
  next();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function normalizeStudentNumber(value) {
  const compact = String(value ?? '').trim().replace(/\s+/g, '');
  const digits  = compact.replace(/[^0-9]/g, '');
  if (/^\d{7}$/.test(digits))  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  if (/^\d{9}$/.test(digits))  return `${digits.slice(2, 4)}-${digits.slice(4)}`;
  if (/^\d{2}-\d{5}$/.test(compact)) return compact;
  if (/^\d{4}-\d{5}$/.test(compact)) return `${compact.slice(2, 4)}-${compact.slice(5)}`;
  return compact;
}

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ message: 'SeatSync backend 🚀' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/health/db', async (_req, res) => {
  const { error } = await supabase.from('seats').select('id').limit(1);
  if (error) return res.status(500).json({ error: { code: 'DB_UNREACHABLE', message: error.message } });
  res.json({ status: 'ok' });
});

// ── Admin auth ───────────────────────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Username and password are required.' } });
  }

  const { data: staff, error } = await supabase
    .from('staff')
    .select('id, username, full_name, role, password_hash')
    .ilike('username', username.trim())
    .single();

  if (error || !staff) {
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Username or password is incorrect.' } });
  }

  const ok = await bcrypt.compare(password, staff.password_hash);
  if (!ok) {
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Username or password is incorrect.' } });
  }

  const { password_hash, ...safeStaff } = staff;
  const token = issueToken(safeStaff);
  return res.json({ ok: true, token, staff: safeStaff });
});

app.post('/api/admin/logout', requireAuth, (req, res) => {
  const token = (req.headers['authorization'] ?? '').slice(7);
  if (token) authTokens.delete(token);
  res.json({ ok: true });
});

// ── Floor plan (areas + seats) ───────────────────────────────────────────────
// GET /api/floor
// Returns areas with their tables and seats, plus any active session per seat.
// Open — no auth required (students and visitors need to see the live map).
app.get('/api/floor', async (_req, res) => {
  // 1. Load areas + tables
  const { data: areas, error: aErr } = await supabase
    .from('areas')
    .select('*, tables:area_tables(id, label, type, seats, cols, sort_order)')
    .order('sort_order');

  if (aErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: aErr.message } });

  // 2. Load seats
  const { data: seats, error: sErr } = await supabase
    .from('seats')
    .select('id, label, area_id, table_id, sort_order')
    .order('sort_order');

  if (sErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: sErr.message } });

  // 3. Load active sessions (not released)
  const { data: sessions, error: ssErr } = await supabase
    .from('sessions')
    .select('*')
    .neq('status', 'released');

  if (ssErr) return res.status(500).json({ error: { code: 'DB_ERROR', message: ssErr.message } });

  // 4. Build session map: seat_id → session
  const sessionMap = {};
  for (const s of sessions ?? []) {
    sessionMap[s.seat_id] = s;
  }

  // 5. Merge seats + sessions into the shape the frontend expects
  const now = Date.now();
  const mergedSeats = (seats ?? []).map((seat) => {
    const session = sessionMap[seat.id];
    if (!session) {
      return { id: seat.id, label: seat.label, areaId: seat.area_id, tableId: seat.table_id, status: 'vacant', session: null };
    }

    // Auto-upgrade status: occupied → overdue if past dueAt
    let status = session.status;
    if (status === 'occupied' && session.due_at && new Date(session.due_at).getTime() <= now) {
      status = 'overdue';
    }
    // Auto-expire: pending → vacant if past claim_deadline (session row stays until frontend confirms)
    if (status === 'pending' && session.claim_deadline && new Date(session.claim_deadline).getTime() <= now) {
      status = 'pending'; // keep pending, frontend will show expired hold UI
    }

    const clientSession = {
      studentName:   session.student_name,
      studentNumber: session.student_number,
      reservedAt:    session.reserved_at    ? new Date(session.reserved_at).getTime()    : null,
      claimDeadline: session.claim_deadline ? new Date(session.claim_deadline).getTime() : null,
      occupiedAt:    session.occupied_at    ? new Date(session.occupied_at).getTime()    : null,
      dueAt:         session.due_at         ? new Date(session.due_at).getTime()         : null,
    };

    return { id: seat.id, label: seat.label, areaId: seat.area_id, tableId: seat.table_id, status, session: clientSession };
  });

  // 6. Sort tables within each area
  const normalizedAreas = (areas ?? []).map((area) => ({
    id:        area.id,
    name:      area.name,
    short:     area.short,
    floor:     area.floor,
    prefix:    area.prefix,
    blurb:     area.blurb,
    amenities: area.amenities ?? [],
    cols:      area.cols,
    count:     mergedSeats.filter((s) => s.areaId === area.id).length,
    tables:    (area.tables ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ id, label, type, seats: seatCount, cols }) => ({ id, label, type, seats: seatCount, cols })),
  }));

  res.json({ areas: normalizedAreas, seats: mergedSeats });
});

// ── Students ─────────────────────────────────────────────────────────────────
// GET /api/students/:number  — open, used by student login
app.get('/api/students/:number', async (req, res) => {
  const number = normalizeStudentNumber(req.params.number);
  const { data, error } = await supabase
    .from('students')
    .select('number, name, program, year')
    .eq('number', number)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
  }
  res.json({ student: data });
});

// GET /api/students — admin only, returns full roster
app.get('/api/students', requireAuth, async (_req, res) => {
  const { data, error } = await supabase
    .from('students')
    .select('number, name, program, year')
    .order('name');

  if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  res.json({ students: data ?? [] });
});

// POST /api/students/import — admin, bulk upsert
app.post('/api/students/import', requireAuth, async (req, res) => {
  const { students } = req.body ?? {};
  if (!Array.isArray(students)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'students array required.' } });
  }

  const rows = students
    .filter((s) => s.number && s.name)
    .map((s) => ({
      number:  normalizeStudentNumber(s.number),
      name:    (s.name    ?? '').trim(),
      program: (s.program ?? '').trim(),
      year:    (s.year    ?? '').trim(),
    }));

  const { error } = await supabase
    .from('students')
    .upsert(rows, { onConflict: 'number' });

  if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  res.json({ ok: true, count: rows.length });
});

// ── Sessions ─────────────────────────────────────────────────────────────────
// POST /api/sessions/reserve
// Student reserves a seat — creates a pending session.
// Body: { seatId, studentNumber, studentName }
app.post('/api/sessions/reserve', async (req, res) => {
  const { seatId, studentNumber, studentName } = req.body ?? {};
  if (!seatId || !studentNumber || !studentName) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'seatId, studentNumber, and studentName are required.' } });
  }

  // Check seat is not already taken
  const { data: existing } = await supabase
    .from('sessions')
    .select('id')
    .eq('seat_id', seatId)
    .neq('status', 'released')
    .single();

  if (existing) {
    return res.status(409).json({ error: { code: 'SEAT_TAKEN', message: 'That seat already has an active session.' } });
  }

  const now          = new Date();
  const claimDeadline = new Date(now.getTime() + 15 * 60 * 1000);
  const id = `S-${seatId}-${now.getTime()}`;

  // Get area_id from seats table
  const { data: seatRow } = await supabase.from('seats').select('area_id').eq('id', seatId).single();
  const areaId = seatRow?.area_id ?? '';

  const { error } = await supabase.from('sessions').insert({
    id,
    seat_id:        seatId,
    area_id:        areaId,
    student_number: normalizeStudentNumber(studentNumber),
    student_name:   studentName,
    status:         'pending',
    reserved_at:    now.toISOString(),
    claim_deadline: claimDeadline.toISOString(),
  });

  if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });

  res.json({
    ok: true,
    session: {
      id,
      seatId,
      areaId,
      state:         'pending',
      reservedAt:    now.getTime(),
      claimDeadline: claimDeadline.getTime(),
      student:       { number: normalizeStudentNumber(studentNumber), name: studentName },
    },
  });
});

// POST /api/sessions/:seatId/claim
// Student taps "I'm here" — pending → occupied.
app.post('/api/sessions/:seatId/claim', async (req, res) => {
  const { seatId } = req.params;
  const now    = new Date();
  const dueAt  = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const { data: session, error: fErr } = await supabase
    .from('sessions')
    .select('id')
    .eq('seat_id', seatId)
    .eq('status', 'pending')
    .single();

  if (fErr || !session) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No pending session for this seat.' } });
  }

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'occupied', occupied_at: now.toISOString(), due_at: dueAt.toISOString() })
    .eq('id', session.id);

  if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });

  res.json({ ok: true, occupiedAt: now.getTime(), dueAt: dueAt.getTime() });
});

// POST /api/sessions/:seatId/release
// Student times out or admin force-releases.
// Body: { reason: 'student' | 'force' | 'timeout' }
app.post('/api/sessions/:seatId/release', async (req, res) => {
  const { seatId } = req.params;
  const { reason = 'student' } = req.body ?? {};

  // Auth is optional — students can release their own seat without a token
  const header = req.headers['authorization'] ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  const staff  = token ? authTokens.get(token) : null;

  const { data: session, error: fErr } = await supabase
    .from('sessions')
    .select('id')
    .eq('seat_id', seatId)
    .neq('status', 'released')
    .single();

  if (fErr || !session) {
    // Already released — idempotent success
    return res.json({ ok: true, alreadyReleased: true });
  }

  const updatePayload = {
    status:        'released',
    released_at:   new Date().toISOString(),
    release_reason: reason,
    ...(staff ? { released_by_id: staff.id } : {}),
  };

  const { error } = await supabase.from('sessions').update(updatePayload).eq('id', session.id);
  if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });

  res.json({ ok: true });
});

// GET /api/sessions — admin only, returns all active sessions
app.get('/api/sessions', requireAuth, async (_req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .neq('status', 'released')
    .order('reserved_at', { ascending: false });

  if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  res.json({ sessions: data ?? [] });
});

// GET /api/sessions/log — admin only, recent release history
app.get('/api/sessions/log', requireAuth, async (_req, res) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('status', 'released')
    .order('released_at', { ascending: false })
    .limit(200);

  if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });
  res.json({ log: data ?? [] });
});

// POST /api/sessions/sync — legacy compatibility, kept for now
// Frontend still calls this but it's a no-op since DB is source of truth.
app.post('/api/sessions/sync', requireAuth, (_req, res) => {
  res.json({ ok: true, note: 'DB is source of truth — sync is a no-op.' });
});

// ── Seat management (admin) ──────────────────────────────────────────────────
// POST /api/seats — add new seats to a table
app.post('/api/seats', requireAuth, async (req, res) => {
  const { areaId, tableId, seats } = req.body ?? {};
  if (!areaId || !tableId || !Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'areaId, tableId, and seats[] required.' } });
  }

  const rows = seats.map((s, i) => ({
    id:         s.id,
    label:      s.label,
    area_id:    areaId,
    table_id:   tableId,
    sort_order: s.sortOrder ?? i,
  }));

  const { error } = await supabase.from('seats').insert(rows);
  if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } });

  res.json({ ok: true, added: rows.length });
});

app.listen(PORT, () => {
  console.log(`SeatSync backend running on http://localhost:${PORT}`);
});
