const express = require('express');

const { get, all } = require('../db');

const {
  authenticate,
  authorize,
} = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/dashboard
 *
 * Administrator dashboard statistics.
 */
router.get(
  '/',
  authenticate,
  authorize('ADMINISTRATOR'),
  async (req, res) => {
    try {
      const total = await get(
        `SELECT COUNT(*)::int AS count
         FROM incident_reports`
      );

      const pending = await get(
        `SELECT COUNT(*)::int AS count
         FROM incident_reports
         WHERE status = 'PENDING'`
      );

      const underInvestigation = await get(
        `SELECT COUNT(*)::int AS count
         FROM incident_reports
         WHERE status = 'UNDER_INVESTIGATION'`
      );

      const resolved = await get(
        `SELECT COUNT(*)::int AS count
         FROM incident_reports
         WHERE status = 'RESOLVED'`
      );

      const escalated = await get(
        `SELECT COUNT(*)::int AS count
         FROM incident_reports
         WHERE status = 'ESCALATED'`
      );

      const byType = await all(
        `SELECT
           "bullyingType" AS type,
           COUNT(*)::int AS count
         FROM incident_reports
         GROUP BY "bullyingType"
         ORDER BY "bullyingType"`
      );

      const recentReports = await all(
        `SELECT
           "reportId",
           "bullyingType",
           status,
           "dateSubmitted",
           "isAnonymous"
         FROM incident_reports
         ORDER BY "dateSubmitted" DESC
         LIMIT 8`
      );

      const sixMonthsAgo = new Date();

      sixMonthsAgo.setMonth(
        sixMonthsAgo.getMonth() - 5
      );

      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(
        0,
        0,
        0,
        0
      );

      const recentForTrend = await all(
        `SELECT "dateSubmitted"
         FROM incident_reports
         WHERE "dateSubmitted" >= $1`,
        [sixMonthsAgo]
      );

      const monthLabels = [];
      const trendMap = {};

      for (let i = 5; i >= 0; i--) {
        const date = new Date();

        date.setMonth(
          date.getMonth() - i
        );

        const key =
          `${date.getFullYear()}-` +
          `${String(
            date.getMonth() + 1
          ).padStart(2, '0')}`;

        const label =
          date.toLocaleString(
            'en-US',
            {
              month: 'short',
              year: '2-digit',
            }
          );

        monthLabels.push({
          key,
          label,
        });

        trendMap[key] = 0;
      }

      recentForTrend.forEach((row) => {
        const date = new Date(
          row.dateSubmitted
        );

        const key =
          `${date.getFullYear()}-` +
          `${String(
            date.getMonth() + 1
          ).padStart(2, '0')}`;

        if (
          trendMap[key] !== undefined
        ) {
          trendMap[key] += 1;
        }
      });

      return res.json({
        totals: {
          total: total.count,
          pending: pending.count,
          underInvestigation:
            underInvestigation.count,
          resolved: resolved.count,
          escalated: escalated.count,
        },

        byType,

        trend: monthLabels.map(
          (month) => ({
            month: month.label,
            count: trendMap[month.key],
          })
        ),

        recentReports,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error:
          'Failed to retrieve dashboard data',
      });
    }
  }
);

module.exports = router;