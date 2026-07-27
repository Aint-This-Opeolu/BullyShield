const express = require('express');
const { get, all } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/dashboard
 * Generate Reports/Dashboard (4.2.2 iii) + Reporting and Analytics
 * Subsystem (4.3.5): totals, status breakdown, type breakdown, recent
 * activity, and a simple monthly trend for the last 6 months.
 */
router.get('/', authenticate, authorize('ADMINISTRATOR'), async (req, res) => {
  const total = get('SELECT COUNT(*) as c FROM incident_reports').c;
  const pending = get(`SELECT COUNT(*) as c FROM incident_reports WHERE status = 'PENDING'`).c;
  const underInvestigation = get(
    `SELECT COUNT(*) as c FROM incident_reports WHERE status = 'UNDER_INVESTIGATION'`
  ).c;
  const resolved = get(`SELECT COUNT(*) as c FROM incident_reports WHERE status = 'RESOLVED'`).c;
  const escalated = get(`SELECT COUNT(*) as c FROM incident_reports WHERE status = 'ESCALATED'`).c;

  const byType = all(
    `SELECT bullyingType as type, COUNT(*) as count FROM incident_reports GROUP BY bullyingType`
  );

  const recentReports = all(
    `SELECT reportId, bullyingType, status, dateSubmitted, location, isAnonymous
     FROM incident_reports ORDER BY dateSubmitted DESC LIMIT 8`
  ).map((r) => ({ ...r, isAnonymous: !!r.isAnonymous }));

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const recentForTrend = all(
    `SELECT dateSubmitted FROM incident_reports WHERE dateSubmitted >= :from`,
    { from: sixMonthsAgo.toISOString() }
  );

  const monthLabels = [];
  const trendMap = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    monthLabels.push({ key, label });
    trendMap[key] = 0;
  }
  recentForTrend.forEach((r) => {
    const d = new Date(r.dateSubmitted);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (trendMap[key] !== undefined) trendMap[key] += 1;
  });

  return res.json({
    totals: { total, pending, underInvestigation, resolved, escalated },
    byType,
    trend: monthLabels.map((m) => ({ month: m.label, count: trendMap[m.key] })),
    recentReports,
  });
});

module.exports = router;
