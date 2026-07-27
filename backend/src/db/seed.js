require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { run, get } = require('./index');

function id(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function main() {
  const adminEmail = 'admin@bullyshield.local';
  const existing = get('SELECT id FROM users WHERE email = :email', { email: adminEmail });

  if (existing) {
    console.log('Seed skipped: admin account already exists.');
    return;
  }

  const adminHash = await bcrypt.hash('Admin@12345', 12);
  run(
    `INSERT INTO users (id, userId, email, passwordHash, fullName, role, department)
     VALUES (:id, :userId, :email, :passwordHash, :fullName, 'ADMINISTRATOR', :department)`,
    {
      id: crypto.randomUUID(),
      userId: id('USR'),
      email: adminEmail,
      passwordHash: adminHash,
      fullName: 'System Administrator',
      department: 'ICT / Student Affairs',
    }
  );

  const counsellorHash = await bcrypt.hash('Counsellor@123', 12);
  run(
    `INSERT INTO users (id, userId, email, passwordHash, fullName, role, department)
     VALUES (:id, :userId, :email, :passwordHash, :fullName, 'COUNSELLOR', :department)`,
    {
      id: crypto.randomUUID(),
      userId: id('USR'),
      email: 'counsellor@bullyshield.local',
      passwordHash: counsellorHash,
      fullName: 'Jane Okoro',
      department: 'Guidance & Counselling Unit',
    }
  );

  console.log('Seed complete.');
  console.log('  Administrator login: admin@bullyshield.local / Admin@12345');
  console.log('  Counsellor login:    counsellor@bullyshield.local / Counsellor@123');
  console.log('  IMPORTANT: change these passwords immediately in a real deployment.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
