const crypto = require('crypto');

/**
 * CSRF protection (double-submit cookie pattern), covering the CSRF
 * requirement in the Security section. Because auth uses an httpOnly
 * session cookie, state-changing requests must also present a matching
 * CSRF token via the X-CSRF-Token header, sourced from a separate
 * (non-httpOnly) csrfToken cookie that only same-origin JS can read.
 */

const COOKIE_NAME = 'csrfToken';
const HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function issueCsrfCookie(req, res, next) {
  if (!req.cookies?.[COOKIE_NAME]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }
  next();
}

function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[COOKIE_NAME];
  const headerToken = req.headers[HEADER_NAME];

  if (
    !cookieToken ||
    !headerToken ||
    cookieToken.length !== headerToken.length ||
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  next();
}

module.exports = { issueCsrfCookie, verifyCsrf, COOKIE_NAME };
