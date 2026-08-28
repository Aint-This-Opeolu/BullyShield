const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  body,
  validationResult,
} = require('express-validator');

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
  maxAge: 8 * 60 * 60 * 1000,
  path: '/',
};

function sanitizeUser(user) {
  if (!user) return user;

  const {
    passwordHash,
    ...safe
  } = user;

  return {
    ...safe,
    isActive: Boolean(safe.isActive),
  };
}

/**
 * POST /api/auth/register
 *
 * Student self-registration.
 */
router.post(
  '/register',
  [
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .escape(),

    body('email')
      .isEmail()
      .normalizeEmail(),

    body('password')
      .isLength({ min: 8 })
      .withMessage(
        'Password must be at least 8 characters'
      )
      .matches(/[A-Z]/)
      .withMessage(
        'Password must contain an uppercase letter'
      )
      .matches(/[0-9]/)
      .withMessage(
        'Password must contain a number'
      ),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
      });
    }

    const {
      fullName,
      email,
      password,
    } = req.body;

    try {
      const existing = await get(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existing) {
        return res.status(409).json({
          error:
            'An account with this email already exists',
        });
      }

      const passwordHash = await bcrypt.hash(
        password,
        12
      );

      const id = crypto.randomUUID();
      const userId = generatePrefixedId('USR');

      await run(
        `INSERT INTO users
          (
            id,
            "userId",
            email,
            "passwordHash",
            "fullName",
            role
          )
         VALUES ($1, $2, $3, $4, $5, 'STUDENT')`,
        [
          id,
          userId,
          email,
          passwordHash,
          fullName,
        ]
      );

      await logAction({
        userId: id,
        action: 'Student account registered',
        affectedRecordId: userId,
      });

      return res.status(201).json({
        message: 'Account created. Please log in.',
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          'Failed to create account. Please try again.',
      });
    }
  }
);

/**
 * POST /api/auth/login
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail(),

    body('password')
      .notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid email or password',
      });
    }

    const {
      email,
      password,
    } = req.body;

    try {
      const user = await get(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (!user || !user.isActive) {
        return res.status(401).json({
          error: 'Invalid email or password',
        });
      }

      const valid = await bcrypt.compare(
        password,
        user.passwordHash
      );

      if (!valid) {
        await logAction({
          action: 'Failed login attempt',
          affectedRecordId: user.userId,
        });

        return res.status(401).json({
          error: 'Invalid email or password',
        });
      }

      const token = signToken({
        sub: user.id,
        role: user.role,
      });

      res.cookie(
        'token',
        token,
        COOKIE_OPTS
      );

      await logAction({
        userId: user.id,
        action: 'User logged in',
        affectedRecordId: user.userId,
      });

      return res.json({
        user: sanitizeUser(user),
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: 'Login failed. Please try again.',
      });
    }
  }
);

/**
 * POST /api/auth/logout
 */
router.post(
  '/logout',
  authenticate,
  async (req, res) => {
    try {
      await logAction({
        userId: req.user.id,
        action: 'User logged out',
        affectedRecordId: req.user.userId,
      });

      res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure:
          process.env.NODE_ENV === 'production',
        path: '/',
      });

      return res.json({
        message: 'Logged out',
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: 'Failed to log out',
      });
    }
  }
);

/**
 * GET /api/auth/me
 */
router.get(
  '/me',
  authenticate,
  (req, res) => {
    return res.json({
      user: sanitizeUser(req.user),
    });
  }
);

module.exports = router;