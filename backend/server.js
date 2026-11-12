require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test routes
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
// Returns 200 { ok: true, staff: { id, username, full_name, role } }
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
  return res.json({ ok: true, staff: safeStaff });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});