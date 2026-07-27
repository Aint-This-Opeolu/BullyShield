-- BullyShield database schema
-- Modeled on Chapter 4, Section 4.4.2 (Database Design and Structure)
-- SQLite, accessed via Node's built-in node:sqlite module.

PRAGMA foreign_keys = ON;

-- Table 4.1: Users Table
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  userId        TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  passwordHash  TEXT NOT NULL,
  fullName      TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('STUDENT','ADMINISTRATOR','COUNSELLOR')),
  department    TEXT,
  isActive      INTEGER NOT NULL DEFAULT 1,
  createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Table 4.2: IncidentReports Table
CREATE TABLE IF NOT EXISTS incident_reports (
  id              TEXT PRIMARY KEY,
  reportId        TEXT UNIQUE NOT NULL,
  bullyingType    TEXT NOT NULL CHECK (bullyingType IN ('PHYSICAL','VERBAL','PSYCHOLOGICAL','RELATIONAL','SEXUAL')),
  description     TEXT NOT NULL,       -- AES-256-GCM ciphertext (base64)
  descriptionIv   TEXT NOT NULL,
  descriptionTag  TEXT NOT NULL,
  location        TEXT NOT NULL,
  dateSubmitted   TEXT NOT NULL DEFAULT (datetime('now')),
  isAnonymous     INTEGER NOT NULL DEFAULT 0,
  trackingCode    TEXT UNIQUE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','UNDER_INVESTIGATION','RESOLVED','ESCALATED')),
  reporterId      TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON incident_reports(bullyingType);
CREATE INDEX IF NOT EXISTS idx_reports_date ON incident_reports(dateSubmitted);

-- Table 4.3: Evidence Table
CREATE TABLE IF NOT EXISTS evidence (
  id            TEXT PRIMARY KEY,
  fileId        TEXT UNIQUE NOT NULL,
  reportId      TEXT NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  filePath      TEXT NOT NULL,   -- encrypted-at-rest storage filename
  fileIv        TEXT NOT NULL,
  fileTag       TEXT NOT NULL,
  originalName  TEXT NOT NULL,
  mimeType      TEXT NOT NULL,
  fileSize      INTEGER NOT NULL,
  uploadDate    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_evidence_report ON evidence(reportId);

-- Table 4.4: Cases Table
CREATE TABLE IF NOT EXISTS cases (
  id                TEXT PRIMARY KEY,
  caseId            TEXT UNIQUE NOT NULL,
  reportId          TEXT UNIQUE NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  assignedToId      TEXT REFERENCES users(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','UNDER_INVESTIGATION','RESOLVED','ESCALATED')),
  priority          TEXT NOT NULL DEFAULT 'Normal',
  suggestedHandler  TEXT,
  resolutionOutcome TEXT,
  createdAt         TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cases_assigned ON cases(assignedToId);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);

-- Investigation notes (Section 4.3.2 iii)
CREATE TABLE IF NOT EXISTS case_notes (
  id          TEXT PRIMARY KEY,
  caseId      TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  authorId    TEXT REFERENCES users(id) ON DELETE SET NULL,
  authorName  TEXT NOT NULL,
  note        TEXT NOT NULL,
  createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_case ON case_notes(caseId);

-- Table 4.5: AuditLogs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id                TEXT PRIMARY KEY,
  logId             TEXT UNIQUE NOT NULL,
  userId            TEXT REFERENCES users(id) ON DELETE SET NULL,
  action            TEXT NOT NULL,
  timestamp         TEXT NOT NULL DEFAULT (datetime('now')),
  affectedRecordId  TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
