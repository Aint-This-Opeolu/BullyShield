const crypto = require('crypto');

const COOKIE_NAME = 'csrfToken';
const HEADER_NAME = 'x-csrf-token';

const SAFE_METHODS = new Set([
  'GET',
  'HEAD',
  'OPTIONS',
]);

/**
 * Issues a CSRF cookie when one does not already exist.
 *
 * The CSRF cookie is intentionally readable by same-origin
 * JavaScript so that the frontend can copy it into the
 * X-CSRF-Token request header.
 */
function issueCsrfCookie(req, res, next) {
  const existingToken = req.cookies?.[COOKIE_NAME];
  if (!existingToken) {
    const token = crypto.randomBytes(32).toString('hex');
    req.csrfToken = token;

    res.cookie(COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: 'none',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
  } else {
    req.csrfToken = existingToken;
  }

  return next();
}

/**
 * Verifies the double-submit CSRF token.
 */
function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[COOKIE_NAME];
  const headerToken = req.headers[HEADER_NAME];

  if (
    typeof cookieToken !== 'string' ||
    typeof headerToken !== 'string'
  ) {
    return res.status(403).json({
      error: 'Invalid or missing CSRF token',
    });
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (
    cookieBuffer.length !== headerBuffer.length ||
    !crypto.timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    return res.status(403).json({
      error: 'Invalid or missing CSRF token',
    });
  }

  return next();
}

module.exports = {
  issueCsrfCookie,
  verifyCsrf,
  COOKIE_NAME,
};