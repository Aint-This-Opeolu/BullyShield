const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { run, get, all } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { generatePrefixedId } = require('../utils/ids');
const { logAction } = require('../utils/audit');

const router = express.Router();

function sanitize(u) {
  if (!u) return u;
  const { passwordHash, ...safe } = u;
  return { ...safe, isActive: !!safe.isActive };
}

/** GET /api/users — Manage User Accounts (4.2.2 v), Administrator only */
router.get('/', authenticate, authorize('ADMINISTRATOR'), async (req, res) => {
  const users = all('SELECT * FROM users ORDER BY createdAt DESC');
  return res.json({ users: users.map(sanitize) });
});

/** Staff directory for the case-assignment dropdown (Counsellors/Admins) */
router.get('/staff', authenticate, authorize('ADMINISTRATOR'), async (req, res) => {
  const staff = all(
    `SELECT id, fullName, role, department FROM users
     WHERE role IN ('COUNSELLOR','ADMINISTRATOR') AND isActive = 1
     ORDER BY fullName ASC`
  );
  return res.json({ staff });
});

/** POST /api/users — create an Administrator or Counsellor account */
router.post(
  '/',
  authenticate,
  authorize('ADMINISTRATOR'),
  [
    body('fullName').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('role').isIn(['ADMINISTRATOR', 'COUNSELLOR']),
    body('password').isLength({ min: 8 }),
    body('department').optional().trim().isLength({ max: 100 }).escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { fullName, email, role, password, department } = req.body;

    const existing = get('SELECT id FROM users WHERE email = :email', { email });
    if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    const userId = generatePrefixedId('USR');

    run(
      `INSERT INTO users (id, userId, email, passwordHash, fullName, role, department)
       VALUES (:id, :userId, :email, :passwordHash, :fullName, :role, :department)`,
      { id, userId, email, passwordHash, fullName, role, department: department || null }
    );

    await logAction({
      userId: req.user.id,
      action: `Created ${role} account for ${email}`,
      affectedRecordId: userId,
    });

    const user = get('SELECT * FROM users WHERE id = :id', { id });
    return res.status(201).json({ user: sanitize(user) });
  }
);

/** PATCH /api/users/:id — activate/deactivate or edit a user account */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMINISTRATOR'),
  [
    body('isActive').optional().isBoolean(),
    body('fullName').optional().trim().isLength({ min: 2, max: 100 }).escape(),
    body('department').optional().trim().isLength({ max: 100 }).escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    if (req.params.id === req.user.id && req.body.isActive === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const target = get('SELECT * FROM users WHERE id = :id', { id: req.params.id });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const isActive = req.body.isActive !== undefined ? (req.body.isActive ? 1 : 0) : target.isActive;
    const fullName = req.body.fullName || target.fullName;
    const department = req.body.department !== undefined ? req.body.department : target.department;

    run(
      `UPDATE users SET isActive = :isActive, fullName = :fullName, department = :department,
       updatedAt = datetime('now') WHERE id = :id`,
      { isActive, fullName, department, id: req.params.id }
    );

    await logAction({
      userId: req.user.id,
      action: `Updated account for ${target.email}`,
      affectedRecordId: target.userId,
    });

    const updated = get('SELECT * FROM users WHERE id = :id', { id: req.params.id });
    return res.json({ user: sanitize(updated) });
  }
);

module.exports = router;
