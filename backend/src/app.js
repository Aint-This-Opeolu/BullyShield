const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { issueCsrfCookie, verifyCsrf } = require('./middleware/csrf');

const authRoutes = require('./routes/auth.routes');
const reportsRoutes = require('./routes/reports.routes');
const evidenceRoutes = require('./routes/evidence.routes');
const casesRoutes = require('./routes/cases.routes');
const usersRoutes = require('./routes/users.routes');
const auditRoutes = require('./routes/audit.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

app.set('trust proxy', 1);

// Security headers (OWASP-aligned, Section 4.1 objective 9)
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// General rate limiting to reduce brute-force / abuse risk
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', generalLimiter);

// Tighter limiter on authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CSRF protection (double-submit cookie) for all state-changing requests
app.use(issueCsrfCookie);
app.use('/api', verifyCsrf);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler (e.g. multer file errors)
app.use((err, req, res, next) => {
  if (err) {
    console.error(err);
    return res.status(err.status || 400).json({ error: err.message || 'Something went wrong' });
  }
  next();
});

module.exports = app;
