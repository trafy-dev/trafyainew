const { supabaseAdmin } = require('../lib/supabase');
const { fromSupabase, notFound, conflict, badRequest } = require('../middleware/errors');
const judge0 = require('./judge0');
const env = require('../config/env');

/**
 * Fisher-Yates shuffle.
 * The old code used `sort(() => 0.5 - Math.random())`, which is not a uniform
 * shuffle — some questions were meaningfully likelier to appear than others.
 */
function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function getAssessment(slug = env.assessmentSlug) {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (error) throw fromSupabase(error, 'load assessment');
  if (!data) {
    throw notFound(
      `Assessment "${slug}" is not set up yet. Run "npm run seed" in the backend.`
    );
  }
  return data;
}

/** Strips correct answers. This shape is the ONLY thing sent to a browser. */
function toPublicMcq(question, index) {
  return {
    id: question.id,
    number: index + 1,
    kind: 'mcq',
    topic: question.topic,
    prompt: question.prompt,
    options: question.options,
  };
}

function toPublicDsa(question, index) {
  return {
    id: question.id,
    number: index + 1,
    kind: 'dsa',
    title: question.title,
    description: question.description,
    template: question.template,
    exampleTests: Array.isArray(question.test_cases)
      ? question.test_cases.slice(0, 2).map((t) => ({ input: t.input, expectedOutput: t.expectedOutput }))
      : [],
  };
}

async function fetchQuestionsByIds(ids) {
  if (!ids.length) return [];
  const { data, error } = await supabaseAdmin.from('questions').select('*').in('id', ids);
  if (error) throw fromSupabase(error, 'load questions');
  const byId = new Map(data.map((q) => [q.id, q]));
  // Preserve the pinned order rather than whatever Postgres returns.
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/** Marks an in-progress attempt whose clock ran out as expired, and scores it. */
async function expireIfElapsed(attempt) {
  if (attempt.status !== 'in_progress') return attempt;
  if (new Date(attempt.expires_at).getTime() > Date.now()) return attempt;
  return finaliseAttempt(attempt, 'expired');
}

async function getActiveAttempt(userId, assessmentId) {
  const { data, error } = await supabaseAdmin
    .from('assessment_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('assessment_id', assessmentId)
    .eq('status', 'in_progress')
    .maybeSingle();

  if (error) throw fromSupabase(error, 'load active attempt');
  if (!data) return null;
  return expireIfElapsed(data);
}

async function countAttempts(userId, assessmentId) {
  const { count, error } = await supabaseAdmin
    .from('assessment_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('assessment_id', assessmentId);

  if (error) throw fromSupabase(error, 'count attempts');
  return count || 0;
}

/**
 * Starts a new attempt, or returns the one already in progress so a refresh
 * resumes rather than restarting.
 */
async function startOrResume(userId, slug) {
  const assessment = await getAssessment(slug);

  const active = await getActiveAttempt(userId, assessment.id);
  if (active && active.status === 'in_progress') {
    return buildAttemptPayload(active, assessment, { resumed: true });
  }

  const used = await countAttempts(userId, assessment.id);
  if (used >= assessment.max_attempts) {
    throw conflict(
      `You have used all ${assessment.max_attempts} attempts for this assessment.`,
      { attemptsUsed: used, maxAttempts: assessment.max_attempts }
    );
  }

  const { data: pool, error: poolError } = await supabaseAdmin
    .from('questions')
    .select('id, kind')
    .eq('active', true);
  if (poolError) throw fromSupabase(poolError, 'load question pool');

  const mcqPool = pool.filter((q) => q.kind === 'mcq').map((q) => q.id);
  const dsaPool = pool.filter((q) => q.kind === 'dsa').map((q) => q.id);

  if (mcqPool.length < assessment.mcq_count || dsaPool.length < assessment.dsa_count) {
    throw badRequest(
      `The question bank is too small (${mcqPool.length} MCQ, ${dsaPool.length} DSA). ` +
        `Run "npm run seed" in the backend.`
    );
  }

  const mcqIds = shuffle(mcqPool).slice(0, assessment.mcq_count);
  const dsaIds = shuffle(dsaPool).slice(0, assessment.dsa_count);

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + assessment.duration_minutes * 60 * 1000);

  const { data: created, error: insertError } = await supabaseAdmin
    .from('assessment_attempts')
    .insert({
      user_id: userId,
      assessment_id: assessment.id,
      attempt_number: used + 1,
      status: 'in_progress',
      mcq_question_ids: mcqIds,
      dsa_question_ids: dsaIds,
      answers: {},
      dsa_code: {},
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      max_score:
        assessment.mcq_count * assessment.mcq_points + assessment.dsa_count * assessment.dsa_points,
    })
    .select()
    .single();

  if (insertError) {
    // The partial unique index means a double-click can race here.
    if (insertError.code === '23505') {
      const existing = await getActiveAttempt(userId, assessment.id);
      if (existing) return buildAttemptPayload(existing, assessment, { resumed: true });
    }
    throw fromSupabase(insertError, 'create attempt');
  }

  return buildAttemptPayload(created, assessment, { resumed: false });
}

async function buildAttemptPayload(attempt, assessment, meta = {}) {
  const mcqIds = attempt.mcq_question_ids || [];
  const dsaIds = attempt.dsa_question_ids || [];
  const [mcqRows, dsaRows] = await Promise.all([
    fetchQuestionsByIds(mcqIds),
    fetchQuestionsByIds(dsaIds),
  ]);

  const used = await countAttempts(attempt.user_id, assessment.id);

  return {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      attemptNumber: attempt.attempt_number,
      attemptsUsed: used,
      maxAttempts: assessment.max_attempts,
      startedAt: attempt.started_at,
      expiresAt: attempt.expires_at,
      secondsRemaining: Math.max(
        0,
        Math.floor((new Date(attempt.expires_at).getTime() - Date.now()) / 1000)
      ),
      answers: attempt.answers || {},
      dsaCode: attempt.dsa_code || {},
      resumed: Boolean(meta.resumed),
    },
    assessment: {
      slug: assessment.slug,
      title: assessment.title,
      durationMinutes: assessment.duration_minutes,
      mcqPoints: assessment.mcq_points,
      dsaPoints: assessment.dsa_points,
      maxScore: attempt.max_score,
    },
    mcqs: mcqRows.map(toPublicMcq),
    dsa: dsaRows.map(toPublicDsa),
  };
}

/**
 * Persists in-progress answers. Called on every change so a crashed browser
 * costs nothing. Rejects writes to a finished or expired attempt.
 */
async function saveProgress(userId, attemptId, { answers, dsaCode }) {
  const { data: attempt, error } = await supabaseAdmin
    .from('assessment_attempts')
    .select('*')
    .eq('id', attemptId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw fromSupabase(error, 'load attempt for save');
  if (!attempt) throw notFound('Attempt not found.');
  if (attempt.status !== 'in_progress') throw conflict('This attempt is already finished.');

  if (new Date(attempt.expires_at).getTime() <= Date.now()) {
    const finished = await finaliseAttempt(attempt, 'expired');
    throw conflict('Time is up — your assessment was submitted automatically.', {
      attemptId: finished.id,
    });
  }

  const patch = { last_saved_at: new Date().toISOString() };

  if (answers && typeof answers === 'object') {
    const allowed = new Set(attempt.mcq_question_ids || []);
    const clean = {};
    for (const [qid, value] of Object.entries(answers)) {
      if (allowed.has(qid) && Number.isInteger(value) && value >= 0 && value < 8) clean[qid] = value;
    }
    patch.answers = clean;
  }

  if (dsaCode && typeof dsaCode === 'object') {
    const allowed = new Set(attempt.dsa_question_ids || []);
    const clean = {};
    for (const [qid, code] of Object.entries(dsaCode)) {
      if (allowed.has(qid) && typeof code === 'string') clean[qid] = code.slice(0, 50000);
    }
    patch.dsa_code = clean;
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('assessment_attempts')
    .update(patch)
    .eq('id', attemptId)
    .eq('status', 'in_progress')
    .select()
    .single();

  if (updateError) throw fromSupabase(updateError, 'save progress');
  return { savedAt: updated.last_saved_at };
}

/**
 * Scores an attempt server-side against its own pinned questions and closes it.
 * The client never contributes to the score — this is the fix for the forgery
 * hole, and for the MCQ double-count in the old implementation.
 */
async function finaliseAttempt(attempt, status) {
  const assessment = await getAssessment();

  const mcqIds = attempt.mcq_question_ids || [];
  const dsaIds = attempt.dsa_question_ids || [];
  const [mcqRows, dsaRows] = await Promise.all([
    fetchQuestionsByIds(mcqIds),
    fetchQuestionsByIds(dsaIds),
  ]);

  const answers = attempt.answers || {};
  let correctCount = 0;
  for (const question of mcqRows) {
    const given = answers[question.id];
    if (Number.isInteger(given) && given === question.correct_index) correctCount += 1;
  }
  const mcqScore = correctCount * assessment.mcq_points;

  const dsaCode = attempt.dsa_code || {};
  const dsaDetail = [];
  let dsaScore = 0;
  let dsaStatus = 'scored';

  for (const question of dsaRows) {
    // eslint-disable-next-line no-await-in-loop
    const result = await judge0.evaluateSubmission({
      sourceCode: dsaCode[question.id],
      question,
      maxPoints: assessment.dsa_points,
    });
    dsaScore += result.points;
    if (result.status === 'unavailable') dsaStatus = 'unavailable';
    dsaDetail.push({
      questionId: question.id,
      title: question.title,
      passed: result.passed,
      total: result.total,
      points: result.points,
      status: result.status,
      reason: result.reason || null,
    });
  }

  const patch = {
    status,
    submitted_at: new Date().toISOString(),
    mcq_score: mcqScore,
    dsa_score: dsaScore,
    total_score: mcqScore + dsaScore,
    correct_count: correctCount,
    dsa_status: dsaStatus,
    dsa_detail: dsaDetail,
    max_score:
      assessment.mcq_count * assessment.mcq_points + assessment.dsa_count * assessment.dsa_points,
  };

  const { data: updated, error } = await supabaseAdmin
    .from('assessment_attempts')
    .update(patch)
    .eq('id', attempt.id)
    .eq('status', 'in_progress')
    .select()
    .maybeSingle();

  if (error) throw fromSupabase(error, 'finalise attempt');
  // Lost a race with another finaliser; return the row as it now stands.
  if (!updated) {
    const { data: current } = await supabaseAdmin
      .from('assessment_attempts')
      .select('*')
      .eq('id', attempt.id)
      .single();
    return current;
  }
  return updated;
}

async function submitAttempt(userId, attemptId) {
  const { data: attempt, error } = await supabaseAdmin
    .from('assessment_attempts')
    .select('*')
    .eq('id', attemptId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw fromSupabase(error, 'load attempt for submit');
  if (!attempt) throw notFound('Attempt not found.');
  if (attempt.status !== 'in_progress') {
    throw conflict('This attempt has already been submitted.', { attemptId: attempt.id });
  }

  const expired = new Date(attempt.expires_at).getTime() <= Date.now();
  return finaliseAttempt(attempt, expired ? 'expired' : 'submitted');
}

async function listResults(userId) {
  const assessment = await getAssessment();
  const { data, error } = await supabaseAdmin
    .from('assessment_attempts')
    .select('*')
    .eq('user_id', userId)
    .eq('assessment_id', assessment.id)
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (error) throw fromSupabase(error, 'load results');

  return {
    maxAttempts: assessment.max_attempts,
    attemptsUsed: data.length,
    attempts: data.map((a) => ({
      id: a.id,
      attemptNumber: a.attempt_number,
      status: a.status,
      startedAt: a.started_at,
      submittedAt: a.submitted_at,
      mcqScore: a.mcq_score,
      dsaScore: a.dsa_score,
      totalScore: a.total_score,
      maxScore: a.max_score,
      correctCount: a.correct_count,
      dsaStatus: a.dsa_status,
      dsaDetail: a.dsa_detail || [],
    })),
  };
}

async function getLeaderboard(limit = 50) {
  const { data, error } = await supabaseAdmin
    .from('leaderboard')
    .select('*')
    .order('total_score', { ascending: false })
    .order('submitted_at', { ascending: true })
    .limit(limit);

  if (error) throw fromSupabase(error, 'load leaderboard');
  return data.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    displayName: row.display_name || 'Anonymous Candidate',
    totalScore: row.total_score,
    maxScore: row.max_score,
    correctCount: row.correct_count,
    submittedAt: row.submitted_at,
  }));
}

module.exports = {
  getAssessment,
  startOrResume,
  getActiveAttempt,
  buildAttemptPayload,
  saveProgress,
  submitAttempt,
  listResults,
  getLeaderboard,
  countAttempts,
  shuffle,
};
