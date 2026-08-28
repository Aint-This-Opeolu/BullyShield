require('dotenv').config();

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const {
  run,
  get,
} = require('./index');

const {
  generatePrefixedId,
} = require('../utils/ids');

/**
 * Seeds initial administrator and counsellor accounts.
 */
async function main() {
  const adminEmail =
    'admin@bullyshield.local';

  const existingAdmin = await get(
    'SELECT id FROM users WHERE email = $1',
    [adminEmail]
  );

  if (existingAdmin) {
    console.log(
      'Seed skipped: admin account already exists.'
    );
    return;
  }

  const adminHash =
    await bcrypt.hash(
      'Admin@12345',
      12
    );

  await run(
    `INSERT INTO users
      (
        id,
        "userId",
        email,
        "passwordHash",
        "fullName",
        role,
        department
      )
     VALUES
      ($1, $2, $3, $4, $5, 'ADMINISTRATOR', $6)`,
    [
      crypto.randomUUID(),
      generatePrefixedId('USR'),
      adminEmail,
      adminHash,
      'System Administrator',
      'ICT / Student Affairs',
    ]
  );

  const counsellorHash =
    await bcrypt.hash(
      'Counsellor@123',
      12
    );

  await run(
    `INSERT INTO users
      (
        id,
        "userId",
        email,
        "passwordHash",
        "fullName",
        role,
        department
      )
     VALUES
      ($1, $2, $3, $4, $5, 'COUNSELLOR', $6)`,
    [
      crypto.randomUUID(),
      generatePrefixedId('USR'),
      'counsellor@bullyshield.local',
      counsellorHash,
      'Jane Okoro',
      'Guidance & Counselling Unit',
    ]
  );

  console.log('Seed complete.');
  console.log(
    'Administrator login: admin@bullyshield.local / Admin@12345'
  );
  console.log(
    'Counsellor login: counsellor@bullyshield.local / Counsellor@123'
  );
  console.log(
    'IMPORTANT: change these passwords immediately in a real deployment.'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});