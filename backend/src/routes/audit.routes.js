const express = require('express');

const { all } = require('../db');

const {
  authenticate,
  authorize,
} = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/audit-logs
 *
 * Administrator only.
 */
router.get(
  '/',
  authenticate,
  authorize('ADMINISTRATOR'),
  async (req, res) => {
    try {
      const logs = await all(
        `SELECT
           a."logId",
           a.action,
           a."timestamp",
           a."affectedRecordId",
           u."fullName",
           u.role
         FROM audit_logs a
         LEFT JOIN users u
           ON u.id = a."userId"
         ORDER BY a."timestamp" DESC
         LIMIT 500`
      );

      const shaped = logs.map((log) => ({
        logId: log.logId,
        action: log.action,
        timestamp: log.timestamp,
        affectedRecordId:
          log.affectedRecordId,

        performedBy:
          log.fullName
            ? `${log.fullName} (${log.role})`
            : 'System / Anonymous',
      }));

      return res.json({
        logs: shaped,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          'Failed to retrieve audit logs',
      });
    }
  }
);

module.exports = router;