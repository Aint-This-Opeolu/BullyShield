const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const { run, get, all } = require('../db');
const {
  authenticate,
  authorize,
} = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();

const STATUSES = [
  'PENDING',
  'UNDER_INVESTIGATION',
  'RESOLVED',
  'ESCALATED',
];

/**
 * Builds the complete case representation.
 */
async function shapeCase(c) {
  const report = await get(
    'SELECT * FROM incident_reports WHERE "id" = $1',
    [c.reportId]
  );

  const reporter =
    report &&
    !report.isAnonymous &&
    report.reporterId
      ? await get(
          'SELECT "fullName", "email" FROM users WHERE "id" = $1',
          [report.reporterId]
        )
      : null;

  const assignedTo = c.assignedToId
    ? await get(
        'SELECT "id", "fullName", "role" FROM users WHERE "id" = $1',
        [c.assignedToId]
      )
    : null;

  const notes = await all(
    `SELECT *
     FROM case_notes
     WHERE "caseId" = $1
     ORDER BY "createdAt" DESC`,
    [c.id]
  );

  return {
    id: c.id,
    caseId: c.caseId,
    status: c.status,
    priority: c.priority,
    suggestedHandler: c.suggestedHandler,
    resolutionOutcome: c.resolutionOutcome,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    assignedTo,
    notes,

    report: report
      ? {
          reportId: report.reportId,
          bullyingType: report.bullyingType,
          location: report.location,
          dateSubmitted: report.dateSubmitted,
          isAnonymous: Boolean(report.isAnonymous),
          trackingCode: report.trackingCode,
          reporter,
        }
      : null,
  };
}

/**
 * GET /api/cases
 *
 * Administrator: view all cases.
 */
router.get(
  '/',
  authenticate,
  authorize('ADMINISTRATOR'),
  async (req, res) => {
    try {
      const cases = await all(
        `SELECT *
         FROM cases
         ORDER BY "createdAt" DESC`
      );

      const shapedCases = await Promise.all(
        cases.map(shapeCase)
      );

      return res.json({
        cases: shapedCases,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: 'Failed to retrieve cases',
      });
    }
  }
);

/**
 * GET /api/cases/assigned
 *
 * Counsellor: view cases assigned to them.
 */
router.get(
  '/assigned',
  authenticate,
  authorize('COUNSELLOR'),
  async (req, res) => {
    try {
      const cases = await all(
        `SELECT *
         FROM cases
         WHERE "assignedToId" = $1
         ORDER BY "createdAt" DESC`,
        [req.user.id]
      );

      const shapedCases = await Promise.all(
        cases.map(shapeCase)
      );

      return res.json({
        cases: shapedCases,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: 'Failed to retrieve assigned cases',
      });
    }
  }
);

/**
 * GET /api/cases/:caseId
 */
router.get(
  '/:caseId',
  authenticate,
  authorize('ADMINISTRATOR', 'COUNSELLOR'),
  async (req, res) => {
    try {
      const c = await get(
        `SELECT *
         FROM cases
         WHERE "caseId" = $1`,
        [req.params.caseId]
      );

      if (!c) {
        return res.status(404).json({
          error: 'Case not found',
        });
      }

      if (
        req.user.role === 'COUNSELLOR' &&
        c.assignedToId !== req.user.id
      ) {
        return res.status(403).json({
          error: 'You are not assigned to this case',
        });
      }

      return res.json({
        case: await shapeCase(c),
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: 'Failed to retrieve case',
      });
    }
  }
);

/**
 * PATCH /api/cases/:caseId/assign
 *
 * Administrator assigns a case to an active counsellor.
 */
router.patch(
  '/:caseId/assign',
  authenticate,
  authorize('ADMINISTRATOR'),
  [
    body('assignedToId')
      .isString()
      .notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
      });
    }

    try {
      const { assignedToId } = req.body;

      const staff = await get(
        `SELECT *
         FROM users
         WHERE "id" = $1`,
        [assignedToId]
      );

      if (
        !staff ||
        staff.role !== 'COUNSELLOR' ||
        !staff.isActive
      ) {
        return res.status(400).json({
          error: 'Selected staff member is not a valid active counsellor',
        });
      }

      const existing = await get(
        `SELECT *
         FROM cases
         WHERE "caseId" = $1`,
        [req.params.caseId]
      );

      if (!existing) {
        return res.status(404).json({
          error: 'Case not found',
        });
      }

      await run(
        `UPDATE cases
         SET
           "assignedToId" = $1,
           "status" = 'UNDER_INVESTIGATION',
           "updatedAt" = NOW()
         WHERE "caseId" = $2`,
        [
          assignedToId,
          req.params.caseId,
        ]
      );

      await run(
        `UPDATE incident_reports
         SET "status" = 'UNDER_INVESTIGATION'
         WHERE "id" = $1`,
        [existing.reportId]
      );

      await logAction({
        userId: req.user.id,
        action: `Case assigned to ${staff.fullName} (${staff.role})`,
        affectedRecordId: existing.caseId,
      });

      const updated = await get(
        `SELECT *
         FROM cases
         WHERE "caseId" = $1`,
        [req.params.caseId]
      );

      return res.json({
        message: 'Case assigned',
        case: await shapeCase(updated),
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: 'Failed to assign case',
      });
    }
  }
);

/**
 * PATCH /api/cases/:caseId/status
 */
router.patch(
  '/:caseId/status',
  authenticate,
  authorize('ADMINISTRATOR', 'COUNSELLOR'),
  [
    body('status')
      .isIn(STATUSES),

    body('resolutionOutcome')
      .optional()
      .trim()
      .isLength({ max: 3000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
      });
    }

    try {
      const existing = await get(
        `SELECT *
         FROM cases
         WHERE "caseId" = $1`,
        [req.params.caseId]
      );

      if (!existing) {
        return res.status(404).json({
          error: 'Case not found',
        });
      }

      if (
        req.user.role === 'COUNSELLOR' &&
        existing.assignedToId !== req.user.id
      ) {
        return res.status(403).json({
          error: 'You are not assigned to this case',
        });
      }

      const { status } = req.body;

      const resolutionOutcome =
        status === 'RESOLVED'
          ? req.body.resolutionOutcome ||
            existing.resolutionOutcome ||
            'Resolved.'
          : existing.resolutionOutcome;

      await run(
        `UPDATE cases
         SET
           "status" = $1,
           "resolutionOutcome" = $2,
           "updatedAt" = NOW()
         WHERE "caseId" = $3`,
        [
          status,
          resolutionOutcome,
          req.params.caseId,
        ]
      );

      await run(
        `UPDATE incident_reports
         SET "status" = $1
         WHERE "id" = $2`,
        [
          status,
          existing.reportId,
        ]
      );

      await logAction({
        userId: req.user.id,
        action: `Case status updated to ${status}`,
        affectedRecordId: existing.caseId,
      });

      const updated = await get(
        `SELECT *
         FROM cases
         WHERE "caseId" = $1`,
        [req.params.caseId]
      );

      return res.json({
        message: 'Case status updated',
        case: await shapeCase(updated),
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: 'Failed to update case status',
      });
    }
  }
);

/**
 * POST /api/cases/:caseId/notes
 */
router.post(
  '/:caseId/notes',
  authenticate,
  authorize('ADMINISTRATOR', 'COUNSELLOR'),
  [
    body('note')
      .trim()
      .isLength({
        min: 1,
        max: 2000,
      }),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
      });
    }

    try {
      const existing = await get(
        `SELECT *
         FROM cases
         WHERE "caseId" = $1`,
        [req.params.caseId]
      );

      if (!existing) {
        return res.status(404).json({
          error: 'Case not found',
        });
      }

      if (
        req.user.role === 'COUNSELLOR' &&
        existing.assignedToId !== req.user.id
      ) {
        return res.status(403).json({
          error: 'You are not assigned to this case',
        });
      }

      const noteId = crypto.randomUUID();

      await run(
        `INSERT INTO case_notes
         (
           "id",
           "caseId",
           "authorId",
           "authorName",
           "note"
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          noteId,
          existing.id,
          req.user.id,
          req.user.fullName,
          req.body.note,
        ]
      );

      await logAction({
        userId: req.user.id,
        action: 'Investigation note added',
        affectedRecordId: existing.caseId,
      });

      const note = await get(
        `SELECT *
         FROM case_notes
         WHERE "id" = $1`,
        [noteId]
      );

      return res.status(201).json({
        note,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: 'Failed to add investigation note',
      });
    }
  }
);

module.exports = router;