const express = require('express');
const rateLimit = require('express-rate-limit');

const service = require('../services/assessment');
const { requireAuth, ensureProfile } = require('../middleware/auth');
const { asyncHandler, badRequest } = require('../middleware/errors');

const router = express.Router();

router.use(requireAuth, ensureProfile);

// Autosave is frequent by design; everything else is not.
const saveLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
const actionLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

/** Current attempt state, or null if the candidate has none in progress. */
router.get(
  '/attempt',
  asyncHandler(async (req, res) => {
    const assessment = await service.getAssessment();
    const attempt = await service.getActiveAttempt(req.user.id, assessment.id);
    if (!attempt || attempt.status !== 'in_progress') {
      const used = await service.countAttempts(req.user.id, assessment.id);
      return res.json({
        attempt: null,
        attemptsUsed: used,
        maxAttempts: assessment.max_attempts,
        canStart: used < assessment.max_attempts,
      });
    }
    res.json(await service.buildAttemptPayload(attempt, assessment, { resumed: true }));
  })
);

/** Start a new attempt, or resume the one in progress. */
router.post(
  '/attempt',
  actionLimiter,
  asyncHandler(async (req, res) => {
    const payload = await service.startOrResume(req.user.id, req.body && req.body.slug);
    res.status(201).json(payload);
  })
);

/** Autosave. Answers are option indices; the server ignores unknown ids. */
router.patch(
  '/attempt/:id',
  saveLimiter,
  asyncHandler(async (req, res) => {
    const { answers, dsaCode } = req.body || {};
    if (answers === undefined && dsaCode === undefined) {
      throw badRequest('Provide "answers" and/or "dsaCode".');
    }
    res.json(await service.saveProgress(req.user.id, req.params.id, { answers, dsaCode }));
  })
);

/** Final submit. Scoring happens here, server-side, and only here. */
router.post(
  '/attempt/:id/submit',
  actionLimiter,
  asyncHandler(async (req, res) => {
    const attempt = await service.submitAttempt(req.user.id, req.params.id);

    req.app.get('io').emit('leaderboard_update', { at: new Date().toISOString() });

    res.json({
      attemptId: attempt.id,
      status: attempt.status,
      mcqScore: attempt.mcq_score,
      dsaScore: attempt.dsa_score,
      totalScore: attempt.total_score,
      maxScore: attempt.max_score,
      correctCount: attempt.correct_count,
      dsaStatus: attempt.dsa_status,
      dsaDetail: attempt.dsa_detail || [],
    });
  })
);

/** This candidate's own past attempts. */
router.get(
  '/results',
  asyncHandler(async (req, res) => {
    res.json(await service.listResults(req.user.id));
  })
);

module.exports = router;
