-- ============================================================================
-- BullyShield PostgreSQL Database Schema
-- ============================================================================

-- ============================================================================
-- Table 4.1: Users
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,

    role TEXT NOT NULL
        CHECK (
            role IN (
                'STUDENT',
                'ADMINISTRATOR',
                'COUNSELLOR'
            )
        ),

    department TEXT,

    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,

    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role
    ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_active
    ON users("isActive");

CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);


-- ============================================================================
-- Table 4.2: Incident Reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS incident_reports (
    id TEXT PRIMARY KEY,

    "reportId" TEXT UNIQUE NOT NULL,

    "bullyingType" TEXT NOT NULL
        CHECK (
            "bullyingType" IN (
                'PHYSICAL',
                'VERBAL',
                'PSYCHOLOGICAL',
                'RELATIONAL',
                'SEXUAL'
            )
        ),

    description TEXT NOT NULL,
    "descriptionIv" TEXT NOT NULL,
    "descriptionTag" TEXT NOT NULL,

    location TEXT NOT NULL,

    "dateSubmitted" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "isAnonymous" BOOLEAN NOT NULL DEFAULT FALSE,

    "trackingCode" TEXT UNIQUE NOT NULL,

    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'UNDER_INVESTIGATION',
                'RESOLVED',
                'ESCALATED'
            )
        ),

    "reporterId" TEXT
        REFERENCES users(id)
        ON DELETE SET NULL,

    /*
     * Anonymous reports must not contain a reporter.
     * Identified reports must have a reporter.
     */
    CONSTRAINT chk_reporter_anonymity
        CHECK (
            ("isAnonymous" = TRUE AND "reporterId" IS NULL)
            OR
            ("isAnonymous" = FALSE AND "reporterId" IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_reports_status
    ON incident_reports(status);

CREATE INDEX IF NOT EXISTS idx_reports_type
    ON incident_reports("bullyingType");

CREATE INDEX IF NOT EXISTS idx_reports_date
    ON incident_reports("dateSubmitted");

CREATE INDEX IF NOT EXISTS idx_reports_reporter
    ON incident_reports("reporterId");


-- ============================================================================
-- Table 4.3: Evidence
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,

    "fileId" TEXT UNIQUE NOT NULL,

    "reportId" TEXT NOT NULL
        REFERENCES incident_reports(id)
        ON DELETE CASCADE,

    "filePath" TEXT NOT NULL,
    "fileIv" TEXT NOT NULL,
    "fileTag" TEXT NOT NULL,

    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,

    "fileSize" INTEGER NOT NULL
        CHECK ("fileSize" >= 0),

    "uploadDate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_report
    ON evidence("reportId");


-- ============================================================================
-- Table 4.4: Cases
-- ============================================================================

CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,

    "caseId" TEXT UNIQUE NOT NULL,

    /*
     * One incident report produces one case.
     */
    "reportId" TEXT UNIQUE NOT NULL
        REFERENCES incident_reports(id)
        ON DELETE CASCADE,

    "assignedToId" TEXT
        REFERENCES users(id)
        ON DELETE SET NULL,

    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'UNDER_INVESTIGATION',
                'RESOLVED',
                'ESCALATED'
            )
        ),

    priority TEXT NOT NULL DEFAULT 'Normal'
        CHECK (
            priority IN (
                'Normal',
                'Priority'
            )
        ),

    "suggestedHandler" TEXT,

    "resolutionOutcome" TEXT,

    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cases_report
    ON cases("reportId");

CREATE INDEX IF NOT EXISTS idx_cases_assigned
    ON cases("assignedToId");

CREATE INDEX IF NOT EXISTS idx_cases_status
    ON cases(status);

CREATE INDEX IF NOT EXISTS idx_cases_priority
    ON cases(priority);


-- ============================================================================
-- Table 4.4.1: Investigation Notes
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_notes (
    id TEXT PRIMARY KEY,

    "caseId" TEXT NOT NULL
        REFERENCES cases(id)
        ON DELETE CASCADE,

    "authorId" TEXT
        REFERENCES users(id)
        ON DELETE SET NULL,

    "authorName" TEXT NOT NULL,

    note TEXT NOT NULL,

    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_case
    ON case_notes("caseId");

CREATE INDEX IF NOT EXISTS idx_notes_author
    ON case_notes("authorId");

CREATE INDEX IF NOT EXISTS idx_notes_created
    ON case_notes("createdAt");


-- ============================================================================
-- Table 4.5: Audit Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,

    "logId" TEXT UNIQUE NOT NULL,

    "userId" TEXT
        REFERENCES users(id)
        ON DELETE SET NULL,

    action TEXT NOT NULL,

    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "affectedRecordId" TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp
    ON audit_logs("timestamp");

CREATE INDEX IF NOT EXISTS idx_audit_user
    ON audit_logs("userId");

CREATE INDEX IF NOT EXISTS idx_audit_record
    ON audit_logs("affectedRecordId");


-- ============================================================================
-- UpdatedAt Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


DROP TRIGGER IF EXISTS trg_cases_updated_at ON cases;

CREATE TRIGGER trg_cases_updated_at
BEFORE UPDATE ON cases
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();