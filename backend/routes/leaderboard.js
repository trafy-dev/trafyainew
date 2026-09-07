const express = require('express');
const service = require('../services/assessment');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');

const router = express.Router();

/**
 * Best submitted attempt per candidate. Admin-only: candidates track their
 * own progress on the Results page instead. requireAdmin is the real
 * enforcement — the frontend hiding the nav link is only a UI convenience.
 */
router.get(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const rows = await service.getLeaderboard(limit);
    const me = rows.find((r) => r.userId === req.user.id) || null;
    res.json({ leaderboard: rows, me });
  })
);

module.exports = router;
