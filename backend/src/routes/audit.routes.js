const express = require('express');
const { all, get } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/** GET /api/audit-logs — View Audit Logs (4.2.2 iv), Administrator only */
router.get('/', authenticate, authorize('ADMINISTRATOR'), async (req, res) => {
  const logs = all('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500');

  const shaped = logs.map((l) => {
    const user = l.userId ? get('SELECT fullName, role FROM users WHERE id = :id', { id: l.userId }) : null;
    return {
      logId: l.logId,
      action: l.action,
      timestamp: l.timestamp,
      affectedRecordId: l.affectedRecordId,
      performedBy: user ? `${user.fullName} (${user.role})` : 'System / Anonymous',
    };
  });

  return res.json({ logs: shaped });
});

module.exports = router;
