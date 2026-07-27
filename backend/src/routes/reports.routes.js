const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { body, validationResult, query } = require('express-validator');
const { db, run, get, all } = require('../db');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { encrypt, decrypt } = require('../utils/encryption');
const { generateTrackingCode, generatePrefixedId } = require('../utils/ids');
const { logAction } = require('../utils/audit');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const BULLYING_TYPES = ['PHYSICAL', 'VERBAL', 'PSYCHOLOGICAL', 'RELATIONAL', 'SEXUAL'];

/** Algorithm 5 (step 2-3): suggest a handler based on bullying type */
function suggestHandler(bullyingType) {
  if (bullyingType === 'PSYCHOLOGICAL' || bullyingType === 'RELATIONAL') {
    return { suggestedHandler: 'Counsellor', priority: 'Normal' };
  }
  if (bullyingType === 'PHYSICAL' || bullyingType === 'SEXUAL') {
    return { suggestedHandler: 'DisciplinaryCommittee', priority: 'Priority' };
  }
  return { suggestedHandler: 'Administrator', priority: 'Normal' };
}

function generateUniqueTrackingCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateTrackingCode();
    const existing = get('SELECT id FROM incident_reports WHERE trackingCode = :code', { code });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique tracking code');
}

function toBool(v) {
  return v === true || v === 'true' || v === '1' || v === 1;
}

/**
 * POST /api/reports
 * Reporting Subsystem (4.3.1): Incident Type Selection, Report Details Form,
 * Anonymity Option, Evidence Upload, Submission Confirmation — all in one
 * multipart submission.
 */
router.post(
  '/',
  optionalAuthenticate,
  upload.array('evidence', 5),
  [
    body('bullyingType').isIn(BULLYING_TYPES).withMessage('Invalid bullying type'),
    body('description').trim().isLength({ min: 10, max: 5000 }),
    body('location').trim().isLength({ min: 2, max: 150 }).escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { bullyingType, description, location } = req.body;
    const isAnonymous = toBool(req.body.isAnonymous);

    // Identified (non-anonymous) submissions require an authenticated
    // Student account, per Section 4.3.1(iii).
    if (!isAnonymous && (!req.user || req.user.role !== 'STUDENT')) {
      return res
        .status(401)
        .json({ error: 'Please log in as a Student to submit an identified report, or choose to report anonymously.' });
    }

    try {
      // Algorithm 3: Report Data Encryption
      const enc = encrypt(description);
      const trackingCode = generateUniqueTrackingCode();
      const reportUuid = crypto.randomUUID();
      const reportId = generatePrefixedId('RPT');

      run(
        `INSERT INTO incident_reports
          (id, reportId, bullyingType, description, descriptionIv, descriptionTag,
           location, isAnonymous, trackingCode, status, reporterId)
         VALUES
          (:id, :reportId, :bullyingType, :description, :descriptionIv, :descriptionTag,
           :location, :isAnonymous, :trackingCode, 'PENDING', :reporterId)`,
        {
          id: reportUuid,
          reportId,
          bullyingType,
          description: enc.ciphertext,
          descriptionIv: enc.iv,
          descriptionTag: enc.tag,
          location,
          isAnonymous: isAnonymous ? 1 : 0,
          trackingCode,
          reporterId: isAnonymous ? null : req.user.id,
        }
      );

      // Handle evidence files: encrypt each and persist under a random name
      const files = req.files || [];
      for (const file of files) {
        const fileEnc = encrypt(file.buffer.toString('base64'));
        const storedName = `${crypto.randomBytes(16).toString('hex')}.enc`;
        fs.writeFileSync(path.join(UPLOAD_DIR, storedName), fileEnc.ciphertext, 'utf8');

        run(
          `INSERT INTO evidence
            (id, fileId, reportId, filePath, fileIv, fileTag, originalName, mimeType, fileSize)
           VALUES
            (:id, :fileId, :reportId, :filePath, :fileIv, :fileTag, :originalName, :mimeType, :fileSize)`,
          {
            id: crypto.randomUUID(),
            fileId: generatePrefixedId('EVD'),
            reportId: reportUuid,
            filePath: storedName,
            fileIv: fileEnc.iv,
            fileTag: fileEnc.tag,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
          }
        );
      }

      // Auto-create the associated Case with a suggested handler
      // (Algorithm 5, steps 2-3) for the Administrator to confirm/override.
      const suggestion = suggestHandler(bullyingType);
      run(
        `INSERT INTO cases (id, caseId, reportId, status, priority, suggestedHandler)
         VALUES (:id, :caseId, :reportId, 'PENDING', :priority, :suggestedHandler)`,
        {
          id: crypto.randomUUID(),
          caseId: generatePrefixedId('CSE'),
          reportId: reportUuid,
          priority: suggestion.priority,
          suggestedHandler: suggestion.suggestedHandler,
        }
      );

      await logAction({
        userId: isAnonymous ? null : req.user.id,
        action: `Incident report submitted (${bullyingType}${isAnonymous ? ', anonymous' : ''})`,
        affectedRecordId: reportId,
      });

      return res.status(201).json({
        message: 'Report submitted successfully.',
        reportId,
        trackingCode,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to submit report. Please try again.' });
    }
  }
);

/**
 * GET /api/reports/track/:trackingCode
 * Feedback and Tracking Subsystem (4.3.4): status lookup without exposing
 * investigator identity (Algorithm 6, step 7).
 */
router.get('/track/:trackingCode', (req, res) => {
  const { trackingCode } = req.params;
  const report = get(
    'SELECT * FROM incident_reports WHERE trackingCode = :code',
    { code: trackingCode.toUpperCase() }
  );

  if (!report) {
    return res.status(404).json({ error: 'No report found for this tracking code' });
  }

  const caseRow = get('SELECT * FROM cases WHERE reportId = :reportId', { reportId: report.id });

  return res.json({
    reportId: report.reportId,
    bullyingType: report.bullyingType,
    dateSubmitted: report.dateSubmitted,
    status: report.status,
    resolutionOutcome: report.status === 'RESOLVED' ? caseRow?.resolutionOutcome : null,
  });
});

/**
 * GET /api/reports
 * Case Management Subsystem (4.3.2 i): View Reports, filterable by status,
 * bullying type, or date. Administrator only (full visibility).
 */
router.get(
  '/',
  authenticate,
  authorize('ADMINISTRATOR'),
  [
    query('status').optional().isIn(['PENDING', 'UNDER_INVESTIGATION', 'RESOLVED', 'ESCALATED']),
    query('bullyingType').optional().isIn(BULLYING_TYPES),
  ],
  async (req, res) => {
    const { status, bullyingType, from, to, search } = req.query;

    let sql = 'SELECT * FROM incident_reports WHERE 1=1';
    const params = {};

    if (status) {
      sql += ' AND status = :status';
      params.status = status;
    }
    if (bullyingType) {
      sql += ' AND bullyingType = :bullyingType';
      params.bullyingType = bullyingType;
    }
    if (from) {
      sql += ' AND dateSubmitted >= :from';
      params.from = new Date(from).toISOString();
    }
    if (to) {
      sql += ' AND dateSubmitted <= :to';
      params.to = new Date(to).toISOString();
    }
    if (search) {
      sql += ' AND (reportId LIKE :search OR trackingCode LIKE :search OR location LIKE :search)';
      params.search = `%${search}%`;
    }
    sql += ' ORDER BY dateSubmitted DESC';

    const reports = all(sql, params);

    const shaped = reports.map((r) => {
      const reporter = r.isAnonymous
        ? null
        : r.reporterId
        ? get('SELECT fullName, email FROM users WHERE id = :id', { id: r.reporterId })
        : null;
      const evidenceList = all(
        'SELECT fileId, originalName, mimeType, fileSize FROM evidence WHERE reportId = :id',
        { id: r.id }
      );
      const caseRow = get(
        'SELECT * FROM cases WHERE reportId = :id',
        { id: r.id }
      );
      const assignedTo = caseRow?.assignedToId
        ? get('SELECT fullName, role FROM users WHERE id = :id', { id: caseRow.assignedToId })
        : null;

      return {
        id: r.id,
        reportId: r.reportId,
        bullyingType: r.bullyingType,
        description: decrypt(r.description, r.descriptionIv, r.descriptionTag),
        location: r.location,
        dateSubmitted: r.dateSubmitted,
        isAnonymous: !!r.isAnonymous,
        trackingCode: r.trackingCode,
        status: r.status,
        reporter,
        evidence: evidenceList,
        case: caseRow ? { ...caseRow, assignedTo } : null,
      };
    });

    return res.json({ reports: shaped });
  }
);

/**
 * GET /api/reports/:reportId
 * Full detail view for Administrators, or a Counsellor assigned to the
 * associated case.
 */
router.get('/:reportId', authenticate, authorize('ADMINISTRATOR', 'COUNSELLOR'), async (req, res) => {
  const report = get('SELECT * FROM incident_reports WHERE reportId = :reportId', {
    reportId: req.params.reportId,
  });
  if (!report) return res.status(404).json({ error: 'Report not found' });

  const caseRow = get('SELECT * FROM cases WHERE reportId = :id', { id: report.id });

  if (req.user.role === 'COUNSELLOR' && caseRow?.assignedToId !== req.user.id) {
    return res.status(403).json({ error: 'You are not assigned to this case' });
  }

  const reporter = report.isAnonymous
    ? null
    : report.reporterId
    ? get('SELECT fullName, email FROM users WHERE id = :id', { id: report.reporterId })
    : null;
  const evidenceList = all(
    'SELECT fileId, originalName, mimeType, fileSize FROM evidence WHERE reportId = :id',
    { id: report.id }
  );
  const assignedTo = caseRow?.assignedToId
    ? get('SELECT id, fullName, role FROM users WHERE id = :id', { id: caseRow.assignedToId })
    : null;
  const notes = caseRow
    ? all('SELECT * FROM case_notes WHERE caseId = :caseId ORDER BY createdAt DESC', {
        caseId: caseRow.id,
      })
    : [];

  await logAction({
    userId: req.user.id,
    action: 'Viewed incident report detail',
    affectedRecordId: report.reportId,
  });

  return res.json({
    report: {
      id: report.id,
      reportId: report.reportId,
      bullyingType: report.bullyingType,
      description: decrypt(report.description, report.descriptionIv, report.descriptionTag),
      location: report.location,
      dateSubmitted: report.dateSubmitted,
      isAnonymous: !!report.isAnonymous,
      trackingCode: report.trackingCode,
      status: report.status,
      reporter,
      evidence: evidenceList,
      case: caseRow ? { ...caseRow, assignedTo, notes } : null,
    },
  });
});

module.exports = router;
