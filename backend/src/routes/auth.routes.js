const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { run, get } = require('../db');
const { signToken } = require('../utils/token');
const { generatePrefixedId } = require('../utils/ids');
const { logAction } = require('../utils/audit');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000, // 8h
  path: '/',
};

function sanitizeUser(user) {
  if (!user) return user;
  const { passwordHash, ...safe } = user;
  return { ...safe, isActive: !!safe.isActive };
}

/**
 * Public self-registration for Students only. Administrator and Counsellor
 * accounts are provisioned by an Administrator via /api/users (Section
 * 4.2.2(v): Manage User Accounts).
 */
router.post(
  '/register',
  [
    body('fullName').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain an uppercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain a number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { fullName, email, password } = req.body;

    const existing = get('SELECT id FROM users WHERE email = :email', { email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Algorithm 1: Password Hashing
    const passwordHash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    const userId = generatePrefixedId('USR');

    run(
      `INSERT INTO users (id, userId, email, passwordHash, fullName, role)
       VALUES (:id, :userId, :email, :passwordHash, :fullName, 'STUDENT')`,
      { id, userId, email, passwordHash, fullName }
    );

    await logAction({ userId: id, action: 'Student account registered' });

    return res.status(201).json({ message: 'Account created. Please log in.' });
  }
);

/** Algorithm 2: Login Authentication */
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const { email, password } = req.body;

    const user = get('SELECT * FROM users WHERE email = :email', { email });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await logAction({ action: `Failed login attempt for ${email}` });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ sub: user.id, role: user.role });
    res.cookie('token', token, COOKIE_OPTS);

    await logAction({ userId: user.id, action: 'User logged in' });

    return res.json({ user: sanitizeUser(user) });
  }
);

router.post('/logout', authenticate, async (req, res) => {
  await logAction({ userId: req.user.id, action: 'User logged out' });
  res.clearCookie('token', { path: '/' });
  return res.json({ message: 'Logged out' });
});

router.get('/me', authenticate, (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
});

module.exports = router;
