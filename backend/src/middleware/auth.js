const { verifyToken } = require('../utils/token');
const { get } = require('../db');

/**
 * Authentication Submodule (Section 4.3.3(i)).
 * Verifies the session token (JWT, delivered via httpOnly cookie) and
 * attaches the authenticated user to the request.
 */
async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyToken(token);
    const user = get('SELECT * FROM users WHERE id = :id', { id: payload.sub });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

/**
 * Attaches req.user if a valid session cookie is present, but does not
 * reject the request otherwise. Used for endpoints reachable both by
 * anonymous visitors and logged-in students (e.g. incident submission).
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return next();

    const payload = verifyToken(token);
    const user = get('SELECT * FROM users WHERE id = :id', { id: payload.sub });
    if (user && user.isActive) {
      req.user = user;
    }
    next();
  } catch (err) {
    next();
  }
}

/**
 * Role-Based Access Control (RBAC) Submodule (Section 4.3.3(ii)).
 * Restricts a route to one or more roles, enforcing the principle of
 * least privilege described throughout Section 4.2.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this action' });
    }
    next();
  };
}

module.exports = { authenticate, optionalAuthenticate, authorize };
