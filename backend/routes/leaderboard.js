const express = require('express');
const service = require('../services/assessment');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');

const router = express.Router();

/**
 * Best submitted attempt per candidate. Requires a signed-in user, and returns
 * display name and score only — never email addresses.
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const rows = await service.getLeaderboard(limit);
    const me = rows.find((r) => r.userId === req.user.id) || null;
    res.json({ leaderboard: rows, me });
  })
);

module.exports = router;
