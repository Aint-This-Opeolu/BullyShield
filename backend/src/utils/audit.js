const crypto = require('crypto');
const { run } = require('../db');
const { generatePrefixedId } = require('./ids');

/**
 * Records a security/audit event.
 *
 * userId may be null for anonymous or system actions.
 */
async function logAction({
  userId = null,
  action,
  affectedRecordId = null,
}) {
  if (!action || typeof action !== 'string') {
    return;
  }

  const id = crypto.randomUUID();
  const logId = generatePrefixedId('LOG');

  await run(
    `INSERT INTO audit_logs
      (
        id,
        "logId",
        "userId",
        action,
        "affectedRecordId"
      )
     VALUES ($1, $2, $3, $4, $5)`,
    [
      id,
      logId,
      userId,
      action,
      affectedRecordId,
    ]
  );
}

module.exports = {
  logAction,
};