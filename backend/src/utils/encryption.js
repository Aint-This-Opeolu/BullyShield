/**
 * Encryption Submodule (Section 4.3.3 / Algorithm 3: Report Data Encryption)
 *
 * Encrypts sensitive data at rest using AES-256-GCM, which provides both
 * confidentiality and integrity (authentication tag) for stored data such
 * as incident descriptions and evidence file references. TLS/HTTPS at the
 * transport layer covers "in transit" encryption as described in 4.3.3(iii);
 * that is a deployment/reverse-proxy concern documented in the README.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended IV length for GCM

function getKey() {
  const raw = process.env.ENCRYPTION_KEY || '';
  // Derive a stable 32-byte key from whatever secret is configured, so the
  // app tolerates keys that aren't exactly 32 raw bytes long.
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypts plaintext and returns the ciphertext, IV, and auth tag,
 * all base64-encoded for storage in TEXT/VARCHAR database columns.
 */
function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: authTag.toString('base64'),
  };
}

/**
 * Decrypts a ciphertext previously produced by encrypt().
 */
function decrypt(ciphertext, iv, tag) {
  const key = getKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
