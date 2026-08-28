const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const {
  body,
  validationResult,
} = require('express-validator');

const { run, get, all } = require('../db');

const {
  authenticate,
  authorize,
} = require('../middleware/auth');

const {
  generatePrefixedId,
} = require('../utils/ids');

const {
  logAction,
} = require('../utils/audit');

const router = express.Router();

function sanitize(user) {
  if (!user) return user;

  const {
    passwordHash,
    ...safe
  } = user;

  return {
    ...safe,
    isActive: Boolean(
      safe.isActive
    ),
  };
}

/**
 * GET /api/users
 *
 * Administrator only.
 */
router.get(
  '/',
  authenticate,
  authorize('ADMINISTRATOR'),
  async (req, res) => {
    try {
      const users = await all(
        `SELECT *
         FROM users
         ORDER BY "createdAt" DESC`
      );

      return res.json({
        users: users.map(sanitize),
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          'Failed to retrieve users',
      });
    }
  }
);

/**
 * GET /api/users/staff
 *
 * Active administrators and counsellors.
 */
router.get(
  '/staff',
  authenticate,
  authorize('ADMINISTRATOR'),
  async (req, res) => {
    try {
      const staff = await all(
        `SELECT
           id,
           "fullName",
           role,
           department
         FROM users
         WHERE role IN (
           'COUNSELLOR',
           'ADMINISTRATOR'
         )
         AND "isActive" = TRUE
         ORDER BY "fullName" ASC`
      );

      return res.json({
        staff,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          'Failed to retrieve staff',
      });
    }
  }
);

/**
 * POST /api/users
 *
 * Creates an Administrator or Counsellor account.
 */
router.post(
  '/',
  authenticate,
  authorize('ADMINISTRATOR'),
  [
    body('fullName')
      .trim()
      .isLength({
        min: 2,
        max: 100,
      })
      .escape(),

    body('email')
      .isEmail()
      .normalizeEmail(),

    body('role')
      .isIn([
        'ADMINISTRATOR',
        'COUNSELLOR',
      ]),

    body('password')
      .isLength({
        min: 8,
      })
      .withMessage(
        'Password must be at least 8 characters'
      ),

    body('department')
      .optional()
      .trim()
      .isLength({
        max: 100,
      })
      .escape(),
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
      role,
      password,
      department,
    } = req.body;

    try {
      const existing = await get(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existing) {
        return res.status(409).json({
          error:
            'A user with this email already exists',
        });
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const id =
        crypto.randomUUID();

      const userId =
        generatePrefixedId('USR');

      await run(
        `INSERT INTO users
          (
            id,
            "userId",
            email,
            "passwordHash",
            "fullName",
            role,
            department
          )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          userId,
          email,
          passwordHash,
          fullName,
          role,
          department || null,
        ]
      );

      await logAction({
        userId: req.user.id,
        action:
          `Created ${role} account for ${email}`,
        affectedRecordId: userId,
      });

      const user = await get(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );

      return res.status(201).json({
        user: sanitize(user),
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          'Failed to create user account',
      });
    }
  }
);

/**
 * PATCH /api/users/:id
 *
 * Activate/deactivate or edit a user.
 */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMINISTRATOR'),
  [
    body('isActive')
      .optional()
      .isBoolean(),

    body('fullName')
      .optional()
      .trim()
      .isLength({
        min: 2,
        max: 100,
      })
      .escape(),

    body('department')
      .optional()
      .trim()
      .isLength({
        max: 100,
      })
      .escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
      });
    }

    try {
      if (
        req.params.id === req.user.id &&
        req.body.isActive === false
      ) {
        return res.status(400).json({
          error:
            'You cannot deactivate your own account',
        });
      }

      const target = await get(
        'SELECT * FROM users WHERE id = $1',
        [req.params.id]
      );

      if (!target) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      const isActive =
        req.body.isActive !== undefined
          ? Boolean(req.body.isActive)
          : target.isActive;

      const fullName =
        req.body.fullName !== undefined
          ? req.body.fullName
          : target.fullName;

      const department =
        req.body.department !== undefined
          ? req.body.department
          : target.department;

      await run(
        `UPDATE users
         SET
           "isActive" = $1,
           "fullName" = $2,
           department = $3
         WHERE id = $4`,
        [
          isActive,
          fullName,
          department,
          req.params.id,
        ]
      );

      await logAction({
        userId: req.user.id,
        action:
          `Updated account for ${target.email}`,
        affectedRecordId:
          target.userId,
      });

      const updated = await get(
        'SELECT * FROM users WHERE id = $1',
        [req.params.id]
      );

      return res.json({
        user: sanitize(updated),
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          'Failed to update user account',
      });
    }
  }
);

module.exports = router;