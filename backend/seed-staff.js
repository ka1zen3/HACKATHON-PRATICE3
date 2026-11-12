/**
 * seed-staff.js
 * Run once to create the `staff` table in Supabase and insert the
 * default librarian account.
 *
 * Usage:
 *   node seed-staff.js
 *
 * Default credentials seeded:
 *   username : librarian
 *   password : Library@2026
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('./db');

const STAFF_ACCOUNTS = [
  {
    username: 'librarian',
    password: 'Library@2026',
    full_name: 'Head Librarian',
    role: 'admin',
  },
];

async function seed() {
  console.log('Seeding staff accounts…');

  for (const account of STAFF_ACCOUNTS) {
    const password_hash = await bcrypt.hash(account.password, 12);

    const { error } = await supabase.from('staff').upsert(
      {
        username: account.username,
        full_name: account.full_name,
        role: account.role,
        password_hash,
      },
      { onConflict: 'username' },
    );

    if (error) {
      console.error(`  ✗ Failed to upsert "${account.username}":`, error.message);
    } else {
      console.log(`  ✓ Upserted  "${account.username}" (role: ${account.role})`);
    }
  }

  console.log('\nDone.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
