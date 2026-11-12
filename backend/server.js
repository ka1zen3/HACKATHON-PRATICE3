require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});