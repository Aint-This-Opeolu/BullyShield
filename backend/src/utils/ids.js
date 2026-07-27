/**
 * ID generation helpers.
 *
 * generateTrackingCode() implements Algorithm 4 (Tracking Code Generation):
 * a cryptographically secure, uppercase alphanumeric code, checked for
 * uniqueness by the caller before being persisted.
 */

const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes ambiguous chars (0,O,1,I)

function randomAlphaNumeric(length) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** Algorithm 4: Tracking Code Generation (uniqueness is verified by caller) */
function generateTrackingCode() {
  return randomAlphaNumeric(8);
}

function generatePrefixedId(prefix) {
  return `${prefix}-${randomAlphaNumeric(8)}`;
}

module.exports = {
  generateTrackingCode,
  generatePrefixedId,
};
