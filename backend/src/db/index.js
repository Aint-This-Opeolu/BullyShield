const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required.');
}

const prisma = new PrismaClient();

/**
 * Runs an INSERT, UPDATE, or DELETE statement.
 */
async function run(sql, params = []) {
  return prisma.$executeRawUnsafe(sql, ...params);
}

/**
 * Returns the first matching row.
 */
async function get(sql, params = []) {
  const result = await prisma.$queryRawUnsafe(sql, ...params);
  return result.rows[0];
}

/**
 * Returns all matching rows.
 */
async function all(sql, params = []) {
  const result = await prisma.$queryRawUnsafe(sql, ...params);
  return result.rows;
}

module.exports = {
  prisma,
  run,
  get,
  all,
};