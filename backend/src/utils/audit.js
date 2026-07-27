const crypto = require('crypto');
const { run } = require('../db');
const { generatePrefixedId } = require('./ids');

/**
 * Audit Logging Submodule (Section 4.3.3(iv)).
 * Silently records every significant action performed across all
 * subsystems, creating a tamper-evident trail for accountability
 * (referenced throughout Section 4.2.4 and Algorithms 2, 5, and 6).
 */
async function logAction({ userId = null, action, affectedRecordId = null }) {
  try {
    run(
      `INSERT INTO audit_logs (id, logId, userId, action, affectedRecordId)
       VALUES (:id, :logId, :userId, :action, :affectedRecordId)`,
      {
        id: crypto.randomUUID(),
        logId: generatePrefixedId('LOG'),
        userId,
        action,
        affectedRecordId,
      }
    );
  } catch (err) {
    // Audit logging must never crash the primary request flow, but failures
    // are surfaced in the server logs for operational visibility.
    console.error('Audit log write failed:', err.message);
  }
}

module.exports = { logAction };
