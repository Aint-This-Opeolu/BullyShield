const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { run, get, all } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();

const STATUSES = ['PENDING', 'UNDER_INVESTIGATION', 'RESOLVED', 'ESCALATED'];

function shapeCase(c) {
  const report = get('SELECT * FROM incident_reports WHERE id = :id', { id: c.reportId });
  const reporter =
    report && !report.isAnonymous && report.reporterId
      ? get('SELECT fullName, email FROM users WHERE id = :id', { id: report.reporterId })
      : null;
  const assignedTo = c.assignedToId
    ? get('SELECT id, fullName, role FROM users WHERE id = :id', { id: c.assignedToId })
    : null;
  const notes = all('SELECT * FROM case_notes WHERE caseId = :caseId ORDER BY createdAt DESC', {
    caseId: c.id,
  });

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
          isAnonymous: !!report.isAnonymous,
          trackingCode: report.trackingCode,
          reporter,
        }
      : null,
  };
}

/** GET /api/cases — Manage Cases (4.2.2 ii): Administrator, all cases */
router.get('/', authenticate, authorize('ADMINISTRATOR'), async (req, res) => {
  const cases = all('SELECT * FROM cases ORDER BY createdAt DESC');
  return res.json({ cases: cases.map(shapeCase) });
});

/** GET /api/cases/assigned — Counsellor Control Centre (4.2.3 i) */
router.get('/assigned', authenticate, authorize('COUNSELLOR'), async (req, res) => {
  const cases = all('SELECT * FROM cases WHERE assignedToId = :id ORDER BY createdAt DESC', {
    id: req.user.id,
  });
  return res.json({ cases: cases.map(shapeCase) });
});

router.get('/:caseId', authenticate, authorize('ADMINISTRATOR', 'COUNSELLOR'), async (req, res) => {
  const c = get('SELECT * FROM cases WHERE caseId = :caseId', { caseId: req.params.caseId });
  if (!c) return res.status(404).json({ error: 'Case not found' });
  if (req.user.role === 'COUNSELLOR' && c.assignedToId !== req.user.id) {
    return res.status(403).json({ error: 'You are not assigned to this case' });
  }
  return res.json({ case: shapeCase(c) });
});

/**
 * PATCH /api/cases/:caseId/assign
 * Algorithm 5 (steps 4-6): Administrator confirms or overrides the
 * suggested assignment, updates assignedTo, and sets status to
 * "Under Investigation".
 */
router.patch(
  '/:caseId/assign',
  authenticate,
  authorize('ADMINISTRATOR'),
  [body('assignedToId').isString().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { assignedToId } = req.body;

    const staff = get('SELECT * FROM users WHERE id = :id', { id: assignedToId });
    if (!staff || !['ADMINISTRATOR', 'COUNSELLOR'].includes(staff.role) || !staff.isActive) {
      return res.status(400).json({ error: 'Selected staff member is not valid' });
    }

    const existing = get('SELECT * FROM cases WHERE caseId = :caseId', { caseId: req.params.caseId });
    if (!existing) return res.status(404).json({ error: 'Case not found' });

    run(
      `UPDATE cases SET assignedToId = :assignedToId, status = 'UNDER_INVESTIGATION',
       updatedAt = datetime('now') WHERE caseId = :caseId`,
      { assignedToId, caseId: req.params.caseId }
    );
    run(`UPDATE incident_reports SET status = 'UNDER_INVESTIGATION' WHERE id = :id`, {
      id: existing.reportId,
    });

    await logAction({
      userId: req.user.id,
      action: `Case assigned to ${staff.fullName} (${staff.role})`,
      affectedRecordId: existing.caseId,
    });

    const updated = get('SELECT * FROM cases WHERE caseId = :caseId', { caseId: req.params.caseId });
    return res.json({ message: 'Case assigned', case: updated });
  }
);

/**
 * PATCH /api/cases/:caseId/status
 * Algorithm 6: Case Status Update and Feedback Notification.
 * Administrator, or the Counsellor assigned to the case.
 */
router.patch(
  '/:caseId/status',
  authenticate,
  authorize('ADMINISTRATOR', 'COUNSELLOR'),
  [
    body('status').isIn(STATUSES),
    body('resolutionOutcome').optional().trim().isLength({ max: 3000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const existing = get('SELECT * FROM cases WHERE caseId = :caseId', { caseId: req.params.caseId });
    if (!existing) return res.status(404).json({ error: 'Case not found' });

    if (req.user.role === 'COUNSELLOR' && existing.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'You are not assigned to this case' });
    }

    const { status } = req.body;
    const resolutionOutcome =
      status === 'RESOLVED' ? req.body.resolutionOutcome || existing.resolutionOutcome || 'Resolved.' : existing.resolutionOutcome;

    run(
      `UPDATE cases SET status = :status, resolutionOutcome = :resolutionOutcome,
       updatedAt = datetime('now') WHERE caseId = :caseId`,
      { status, resolutionOutcome, caseId: req.params.caseId }
    );
    run(`UPDATE incident_reports SET status = :status WHERE id = :id`, {
      status,
      id: existing.reportId,
    });

    await logAction({
      userId: req.user.id,
      action: `Case status updated to ${status}`,
      affectedRecordId: existing.caseId,
    });

    const updated = get('SELECT * FROM cases WHERE caseId = :caseId', { caseId: req.params.caseId });
    return res.json({ message: 'Case status updated', case: updated });
  }
);

/** POST /api/cases/:caseId/notes — Investigation Submenu (4.3.2 iii) */
router.post(
  '/:caseId/notes',
  authenticate,
  authorize('ADMINISTRATOR', 'COUNSELLOR'),
  [body('note').trim().isLength({ min: 1, max: 2000 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const existing = get('SELECT * FROM cases WHERE caseId = :caseId', { caseId: req.params.caseId });
    if (!existing) return res.status(404).json({ error: 'Case not found' });

    if (req.user.role === 'COUNSELLOR' && existing.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'You are not assigned to this case' });
    }

    const noteId = crypto.randomUUID();
    run(
      `INSERT INTO case_notes (id, caseId, authorId, authorName, note)
       VALUES (:id, :caseId, :authorId, :authorName, :note)`,
      {
        id: noteId,
        caseId: existing.id,
        authorId: req.user.id,
        authorName: req.user.fullName,
        note: req.body.note,
      }
    );

    await logAction({
      userId: req.user.id,
      action: 'Investigation note added',
      affectedRecordId: existing.caseId,
    });

    const note = get('SELECT * FROM case_notes WHERE id = :id', { id: noteId });
    return res.status(201).json({ note });
  }
);

module.exports = router;
