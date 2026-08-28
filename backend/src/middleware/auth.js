const { verifyToken } = require('../utils/token');
const { get } = require('../db');

/**
 * Authentication middleware.
 *
 * Verifies the JWT session token stored in the httpOnly cookie
 * and attaches the current active user to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const payload = verifyToken(token);

    if (!payload?.sub) {
      return res.status(401).json({
        error: 'Invalid or expired session',
      });
    }

    const user = await get(
      'SELECT * FROM users WHERE id = $1',
      [payload.sub]
    );

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Invalid or expired session',
      });
    }

    req.user = user;

    return next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired session',
    });
  }
}

/**
 * Optional authentication middleware.
 *
 * Attaches req.user when a valid active session exists,
 * but allows anonymous requests to continue.
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return next();
    }

    const payload = verifyToken(token);

    if (!payload?.sub) {
      return next();
    }

    const user = await get(
      'SELECT * FROM users WHERE id = $1',
      [payload.sub]
    );

    if (user && user.isActive) {
      req.user = user;
    }

    return next();
  } catch (err) {
    return next();
  }
}

/**
 * Role-Based Access Control middleware.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions for this action',
      });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
};