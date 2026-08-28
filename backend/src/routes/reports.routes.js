const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { body, validationResult, query } = require('express-validator');

const { run, get, all } = require('../db');
const {
  authenticate,
  optionalAuthenticate,
  authorize,
} = require('../middleware/auth');
const upload = require('../middleware/upload');
const { encrypt, decrypt } = require('../utils/encryption');
const {
  generateTrackingCode,
  generatePrefixedId,
} = require('../utils/ids');
const { logAction } = require('../utils/audit');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const BULLYING_TYPES = [
  'PHYSICAL',
  'VERBAL',
  'PSYCHOLOGICAL',
  'RELATIONAL',
  'SEXUAL',
];

const STATUSES = [
  'PENDING',
  'UNDER_INVESTIGATION',
  'RESOLVED',
  'ESCALATED',
];

/**
 * Algorithm 5 (steps 2-3):
 * Suggest a handler and priority based on bullying type.
 */
function suggestHandler(bullyingType) {
  if (
    bullyingType === 'PSYCHOLOGICAL' ||
    bullyingType === 'RELATIONAL'
  ) {
    return {
      suggestedHandler: 'Counsellor',
      priority: 'Normal',
    };
  }

  if (
    bullyingType === 'PHYSICAL' ||
    bullyingType === 'SEXUAL'
  ) {
    return {
      suggestedHandler: 'DisciplinaryCommittee',
      priority: 'Priority',
    };
  }

  return {
    suggestedHandler: 'Administrator',
    priority: 'Normal',
  };
}

/**
 * Generate a unique tracking code.
 */
async function generateUniqueTrackingCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateTrackingCode();

    const existing = await get(
      'SELECT id FROM incident_reports WHERE "trackingCode" = $1',
      [code]
    );

    if (!existing) {
      return code;
    }
  }

  throw new Error('Failed to generate a unique tracking code');
}

/**
 * Convert common form values to boolean.
 */
function toBool(value) {
  return (
    value === true ||
    value === 'true' ||
    value === '1' ||
    value === 1
  );
}

/**
 * Validate date query parameters safely.
 */
function parseDate(value, endOfDay = false) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

/**
 * POST /api/reports
 *
 * Reporting Subsystem (4.3.1):
 * - Incident Type Selection
 * - Report Details Form
 * - Anonymity Option
 * - Evidence Upload
 * - Submission Confirmation
 *
 * Supports anonymous submissions and authenticated student submissions.
 */
router.post(
  '/',
  optionalAuthenticate,
  upload.array('evidence', 5),
  [
    body('bullyingType')
      .isIn(BULLYING_TYPES)
      .withMessage('Invalid bullying type'),

    body('description')
      .trim()
      .isLength({
        min: 10,
        max: 5000,
      })
      .withMessage(
        'Description must be between 10 and 5000 characters'
      ),

    body('location')
      .trim()
      .isLength({
        min: 2,
        max: 150,
      })
      .withMessage(
        'Location must be between 2 and 150 characters'
      )
      .escape(),

    body('isAnonymous')
      .optional()
      .isBoolean()
      .withMessage('Invalid anonymity value'),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
      });
    }

    const {
      bullyingType,
      description,
      location,
    } = req.body;

    const isAnonymous = toBool(req.body.isAnonymous);

    /*
     * Identified reports require an authenticated Student account.
     * Anonymous reports may be submitted without authentication.
     */
    if (
      !isAnonymous &&
      (!req.user || req.user.role !== 'STUDENT')
    ) {
      return res.status(401).json({
        error:
          'Please log in as a Student to submit an identified report, or choose to report anonymously.',
      });
    }

    const files = req.files || [];

    /*
     * Basic evidence validation.
     *
     * The upload middleware should also enforce its own file-size
     * and MIME-type restrictions.
     */
    if (files.length > 5) {
      return res.status(400).json({
        error: 'A maximum of 5 evidence files is allowed',
      });
    }

    try {
      /*
       * Algorithm 3:
       * Encrypt the report description before persistence.
       */
      const encryptedDescription = encrypt(description);

      const trackingCode =
        await generateUniqueTrackingCode();

      const reportUuid = crypto.randomUUID();

      const reportId = generatePrefixedId('RPT');

      /*
       * Insert incident report.
       */
      await run(
        `INSERT INTO incident_reports
        (
          id,
          "reportId",
          "bullyingType",
          description,
          "descriptionIv",
          "descriptionTag",
          location,
          "isAnonymous",
          "trackingCode",
          status,
          "reporterId"
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          'PENDING',
          $10
        )`,
        [
          reportUuid,
          reportId,
          bullyingType,
          encryptedDescription.ciphertext,
          encryptedDescription.iv,
          encryptedDescription.tag,
          location,
          isAnonymous,
          trackingCode,
          isAnonymous ? null : req.user.id,
        ]
      );

      /*
       * Encrypt and persist evidence files.
       *
       * Only the encrypted file is stored on disk.
       * The original filename and MIME type are stored as metadata.
       */
      for (const file of files) {
        const fileBase64 = file.buffer.toString('base64');

        const encryptedFile = encrypt(fileBase64);

        const storedName =
          `${crypto.randomBytes(16).toString('hex')}.enc`;

        const storedPath = path.join(
          UPLOAD_DIR,
          storedName
        );

        fs.writeFileSync(
          storedPath,
          encryptedFile.ciphertext,
          'utf8'
        );

        await run(
          `INSERT INTO evidence
          (
            id,
            "fileId",
            "reportId",
            "filePath",
            "fileIv",
            "fileTag",
            "originalName",
            "mimeType",
            "fileSize"
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9
          )`,
          [
            crypto.randomUUID(),
            generatePrefixedId('EVD'),
            reportUuid,
            storedName,
            encryptedFile.iv,
            encryptedFile.tag,
            file.originalname,
            file.mimetype,
            file.size,
          ]
        );
      }

      /*
       * Automatically create the associated case.
       *
       * The suggested handler is only a recommendation.
       * The Administrator can assign the case to an actual
       * Administrator or Counsellor later.
       */
      const suggestion =
        suggestHandler(bullyingType);

      const caseId = generatePrefixedId('CSE');

      await run(
        `INSERT INTO cases
        (
          id,
          "caseId",
          "reportId",
          status,
          priority,
          "suggestedHandler"
        )
        VALUES
        (
          $1,
          $2,
          $3,
          'PENDING',
          $4,
          $5
        )`,
        [
          crypto.randomUUID(),
          caseId,
          reportUuid,
          suggestion.priority,
          suggestion.suggestedHandler,
        ]
      );

      /*
       * Audit the submission.
       */
      await logAction({
        userId: isAnonymous
          ? null
          : req.user.id,

        action:
          `Incident report submitted (${bullyingType}${
            isAnonymous ? ', anonymous' : ''
          })`,

        affectedRecordId: reportId,
      });

      return res.status(201).json({
        message: 'Report submitted successfully.',
        reportId,
        trackingCode,
      });
    } catch (error) {
      console.error('Report submission error:', error);

      return res.status(500).json({
        error:
          'Failed to submit report. Please try again.',
      });
    }
  }
);

/**
 * GET /api/reports/track/:trackingCode
 *
 * Feedback and Tracking Subsystem (4.3.4).
 *
 * Allows a reporter to check the progress of a report without
 * exposing investigator/counsellor identity.
 */
router.get(
  '/track/:trackingCode',
  async (req, res) => {
    try {
      const trackingCode =
        String(req.params.trackingCode || '')
          .trim()
          .toUpperCase();

      const report = await get(
        `SELECT
          "reportId",
          "bullyingType",
          "dateSubmitted",
          status,
          id
         FROM incident_reports
         WHERE "trackingCode" = $1`,
        [trackingCode]
      );

      if (!report) {
        return res.status(404).json({
          error:
            'No report found for this tracking code',
        });
      }

      const caseRow = await get(
        `SELECT
          status,
          "resolutionOutcome"
         FROM cases
         WHERE "reportId" = $1`,
        [report.id]
      );

      return res.json({
        reportId: report.reportId,
        bullyingType: report.bullyingType,
        dateSubmitted: report.dateSubmitted,
        status: report.status,
        resolutionOutcome:
          report.status === 'RESOLVED'
            ? caseRow?.resolutionOutcome || null
            : null,
      });
    } catch (error) {
      console.error(
        'Report tracking error:',
        error
      );

      return res.status(500).json({
        error: 'Failed to track report',
      });
    }
  }
);

/**
 * GET /api/reports
 *
 * Case Management Subsystem (4.3.2 i).
 *
 * Administrator only.
 *
 * Supports filtering by:
 * - status
 * - bullying type
 * - date range
 * - report/tracking code/location search
 */
router.get(
  '/',
  authenticate,
  authorize('ADMINISTRATOR'),
  [
    query('status')
      .optional()
      .isIn(STATUSES),

    query('bullyingType')
      .optional()
      .isIn(BULLYING_TYPES),

    query('from')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date'),

    query('to')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date'),

    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage(
        'Search term must not exceed 100 characters'
      ),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
      });
    }

    try {
      const {
        status,
        bullyingType,
        from,
        to,
        search,
      } = req.query;

      let sql = `
        SELECT *
        FROM incident_reports
        WHERE 1 = 1
      `;

      const params = [];
      let paramIndex = 1;

      if (status) {
        sql += ` AND "status" = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (bullyingType) {
        sql += ` AND "bullyingType" = $${paramIndex}`;
        params.push(bullyingType);
        paramIndex++;
      }

      if (from) {
        const fromDate = parseDate(from);

        if (!fromDate) {
          return res.status(400).json({
            error: 'Invalid start date',
          });
        }

        sql += ` AND "dateSubmitted" >= $${paramIndex}`;
        params.push(fromDate);
        paramIndex++;
      }

      if (to) {
        const toDate = parseDate(to, true);

        if (!toDate) {
          return res.status(400).json({
            error: 'Invalid end date',
          });
        }

        sql += ` AND "dateSubmitted" <= $${paramIndex}`;
        params.push(toDate);
        paramIndex++;
      }

      if (search) {
        const searchTerm = `%${String(search)}%`;

        sql += `
          AND (
            "reportId" ILIKE $${paramIndex}
            OR "trackingCode" ILIKE $${paramIndex}
            OR "location" ILIKE $${paramIndex}
          )
        `;

        params.push(searchTerm);
        paramIndex++;
      }

      sql += `
        ORDER BY "dateSubmitted" DESC
      `;

      const reports = await all(sql, params);

      const shaped = await Promise.all(
        reports.map(async (report) => {
          const reporter =
            report.isAnonymous
              ? null
              : report.reporterId
                ? await get(
                    `SELECT
                      "fullName",
                      email
                     FROM users
                     WHERE id = $1`,
                    [report.reporterId]
                  )
                : null;

          const evidenceList = await all(
            `SELECT
              "fileId",
              "originalName",
              "mimeType",
              "fileSize",
              "uploadDate"
             FROM evidence
             WHERE "reportId" = $1
             ORDER BY "uploadDate" DESC`,
            [report.id]
          );

          const caseRow = await get(
            `SELECT *
             FROM cases
             WHERE "reportId" = $1`,
            [report.id]
          );

          let assignedTo = null;

          if (caseRow?.assignedToId) {
            assignedTo = await get(
              `SELECT
                id,
                "fullName",
                role
               FROM users
               WHERE id = $1`,
              [caseRow.assignedToId]
            );
          }

          return {
            id: report.id,
            reportId: report.reportId,
            bullyingType: report.bullyingType,
            description: decrypt(
              report.description,
              report.descriptionIv,
              report.descriptionTag
            ),
            location: report.location,
            dateSubmitted: report.dateSubmitted,
            isAnonymous: Boolean(
              report.isAnonymous
            ),
            trackingCode: report.trackingCode,
            status: report.status,
            reporter,
            evidence: evidenceList,
            case: caseRow
              ? {
                  ...caseRow,
                  assignedTo,
                }
              : null,
          };
        })
      );

      return res.json({
        reports: shaped,
      });
    } catch (error) {
      console.error(
        'Report retrieval error:',
        error
      );

      return res.status(500).json({
        error: 'Failed to retrieve reports',
      });
    }
  }
);

/**
 * GET /api/reports/:reportId
 *
 * Full report detail.
 *
 * Administrator:
 * - Can view any report.
 *
 * Counsellor:
 * - Can only view the report associated with a case
 *   assigned to that counsellor.
 */
router.get(
  '/:reportId',
  authenticate,
  authorize(
    'ADMINISTRATOR',
    'COUNSELLOR'
  ),
  async (req, res) => {
    try {
      const report = await get(
        `SELECT *
         FROM incident_reports
         WHERE "reportId" = $1`,
        [req.params.reportId]
      );

      if (!report) {
        return res.status(404).json({
          error: 'Report not found',
        });
      }

      const caseRow = await get(
        `SELECT *
         FROM cases
         WHERE "reportId" = $1`,
        [report.id]
      );

      /*
       * Counsellors may only access reports belonging
       * to cases assigned to them.
       */
      if (
        req.user.role === 'COUNSELLOR' &&
        caseRow?.assignedToId !== req.user.id
      ) {
        return res.status(403).json({
          error:
            'You are not assigned to this case',
        });
      }

      const reporter =
        report.isAnonymous
          ? null
          : report.reporterId
            ? await get(
                `SELECT
                  "fullName",
                  email
                 FROM users
                 WHERE id = $1`,
                [report.reporterId]
              )
            : null;

      const evidenceList = await all(
        `SELECT
          "fileId",
          "originalName",
          "mimeType",
          "fileSize",
          "uploadDate"
         FROM evidence
         WHERE "reportId" = $1
         ORDER BY "uploadDate" DESC`,
        [report.id]
      );

      let assignedTo = null;

      if (caseRow?.assignedToId) {
        assignedTo = await get(
          `SELECT
            id,
            "fullName",
            role
           FROM users
           WHERE id = $1`,
          [caseRow.assignedToId]
        );
      }

      let notes = [];

      if (caseRow) {
        notes = await all(
          `SELECT *
           FROM case_notes
           WHERE "caseId" = $1
           ORDER BY "createdAt" DESC`,
          [caseRow.id]
        );
      }

      await logAction({
        userId: req.user.id,
        action:
          'Viewed incident report detail',
        affectedRecordId: report.reportId,
      });

      return res.json({
        report: {
          id: report.id,
          reportId: report.reportId,
          bullyingType: report.bullyingType,
          description: decrypt(
            report.description,
            report.descriptionIv,
            report.descriptionTag
          ),
          location: report.location,
          dateSubmitted: report.dateSubmitted,
          isAnonymous: Boolean(
            report.isAnonymous
          ),
          trackingCode: report.trackingCode,
          status: report.status,
          reporter,
          evidence: evidenceList,
          case: caseRow
            ? {
                ...caseRow,
                assignedTo,
                notes,
              }
            : null,
        },
      });
    } catch (error) {
      console.error(
        'Report detail error:',
        error
      );

      return res.status(500).json({
        error: 'Failed to retrieve report',
      });
    }
  }
);

module.exports = router;