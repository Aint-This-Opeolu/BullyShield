const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DATABASE_FILE
  ? path.resolve(process.env.DATABASE_FILE)
  : path.join(DATA_DIR, 'bullyshield.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function ensureSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
}

ensureSchema();

/** Runs a write statement (INSERT/UPDATE/DELETE) with named or positional params. */
function run(sql, params = {}) {
  const stmt = db.prepare(sql);
  return stmt.run(params);
}

/** Returns the first matching row, or undefined. */
function get(sql, params = {}) {
  const stmt = db.prepare(sql);
  return stmt.get(params);
}

/** Returns all matching rows. */
function all(sql, params = {}) {
  const stmt = db.prepare(sql);
  return stmt.all(params);
}

module.exports = { db, run, get, all, ensureSchema, DB_PATH };
