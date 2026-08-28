/**
 * ID generation helpers for BullyShield.
 *
 * Uses cryptographically secure random bytes to generate:
 * - Tracking codes for anonymous report tracking
 * - Prefixed IDs for reports, cases, evidence, and users
 */

const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Excludes ambiguous characters: 0, O, 1, I

function randomAlphaNumeric(length) {
  const bytes = crypto.randomBytes(length);

  let result = '';

  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }

  return result;
}

/**
 * Generates an 8-character tracking code.
 *
 * Example:
 *   X7KQ4MNP
 *
 * Uniqueness must be checked by the caller/database.
 */
function generateTrackingCode() {
  return randomAlphaNumeric(8);
}

/**
 * Generates a prefixed identifier.
 *
 * Examples:
 *   RPT-X7KQ4MNP
 *   CSE-4PQ8ZK2H
 *   EVD-M7NQ5R8T
 *   USR-9KX4PQL7
 */
function generatePrefixedId(prefix) {
  if (
    typeof prefix !== 'string' ||
    !/^[A-Z]{2,10}$/.test(prefix)
  ) {
    throw new Error('Invalid ID prefix');
  }

  return `${prefix}-${randomAlphaNumeric(8)}`;
}

module.exports = {
  generateTrackingCode,
  generatePrefixedId,
};