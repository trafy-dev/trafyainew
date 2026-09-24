const { supabaseAdmin } = require('../lib/supabase');
const { fromSupabase, notFound, conflict, badRequest } = require('../middleware/errors');
const judge0 = require('./judge0');
const env = require('../config/env');
const email = require('./email');

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


/**
 * Employability Index draws its MCQs evenly across every track (core CS, each
 * language, web, AI/ML, aptitude) instead of purely at random, so the skill
 * breakdown in the result email is meaningful: each area gets roughly the same
 * number of questions.
 */
function drawBalancedMcqs(pool, count) {
  const byTrack = new Map();
  for (const q of pool) {
    if (q.kind !== 'mcq' || !q.track) continue;
    if (!byTrack.has(q.track)) byTrack.set(q.track, []);
    byTrack.get(q.track).push(q.id);
  }
  const queues = shuffle([...byTrack.values()].map((ids) => shuffle(ids)));
  const picked = [];
  while (picked.length < count && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (picked.length >= count) break;
      if (q.length) picked.push(q.pop());
    }
  }
  return shuffle(picked);
}

/** One easy plus one medium problem when available; otherwise falls back to random. */
function drawBalancedDsa(pool, count) {
  const dsa = pool.filter((q) => q.kind === 'dsa');
  const bucket = (d) => shuffle(dsa.filter((q) => q.difficulty === d).map((q) => q.id));
  const order = [bucket('easy'), bucket('medium'), bucket('hard')];
  const picked = [];
  for (const b of order) {
    if (picked.length < count && b.length) picked.push(b[0]);
  }
  const rest = shuffle(dsa.map((q) => q.id).filter((id) => !picked.includes(id)));
  return picked.concat(rest).slice(0, count);
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

/** Looks an assessment up by its own numeric id — used when scoring an
 *  attempt, where we must use THAT attempt's assessment config, not
 *  whichever assessment the caller happens to be working with. */
async function getAssessmentById(id) {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw fromSupabase(error, 'load assessment');
  if (!data) throw notFound(`Assessment id ${id} not found.`);
  return data;
}

/** Public list of every active assessment, for the assessment hub page. */
async function listAssessments() {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .select('slug, title, description, mcq_count, dsa_count, duration_minutes, max_attempts, track, category, email_results')
    .eq('active', true)
    .order('id');

  if (error) throw fromSupabase(error, 'list assessments');

  const rank = { master: 0, employability: 1, track: 2 };
  const categoryOf = (a) => a.category || (a.track ? 'track' : 'master');
  data.sort((a, b) => rank[categoryOf(a)] - rank[categoryOf(b)]);

  return data.map((a) => ({
    slug: a.slug,
    title: a.title,
    description: a.description,
    mcqCount: a.mcq_count,
    dsaCount: a.dsa_count,
    durationMinutes: a.duration_minutes,
    maxAttempts: a.max_attempts,
    isTrack: Boolean(a.track),
    category: categoryOf(a),
    emailsResults: Boolean(a.email_results),
  }));
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
    .select('id, kind, track, difficulty')
    .eq('active', true);
  if (poolError) throw fromSupabase(poolError, 'load question pool');

  // Master (assessment.track is null) draws from every track, exactly as
  // before; a track assessment only draws from its own 20 questions.
  const mcqPool = pool
    .filter((q) => q.kind === 'mcq' && (!assessment.track || q.track === assessment.track))
    .map((q) => q.id);
  const dsaPool = pool.filter((q) => q.kind === 'dsa').map((q) => q.id);

  if (mcqPool.length < assessment.mcq_count || dsaPool.length < assessment.dsa_count) {
    throw badRequest(
      `The question bank is too small (${mcqPool.length} MCQ, ${dsaPool.length} DSA). ` +
        `Run "npm run seed" in the backend.`
    );
  }

  let mcqIds;
  let dsaIds;
  if (assessment.category === 'employability') {
    mcqIds = drawBalancedMcqs(pool, assessment.mcq_count);
    dsaIds = drawBalancedDsa(pool, assessment.dsa_count);
  } else {
    mcqIds = shuffle(mcqPool).slice(0, assessment.mcq_count);
    dsaIds = shuffle(dsaPool).slice(0, assessment.dsa_count);
  }

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

/**
 * Questions are unlocked in order. `current_index` is the furthest question
 * reached (the frontier); anything beyond it has never left the server, so
 * upcoming questions cannot be read from the page or the network tab.
 * Reached questions can be revisited and changed until submission.
 */
const sequenceOf = (attempt) => [...(attempt.mcq_question_ids || []), ...(attempt.dsa_question_ids || [])];
const frontierOf = (attempt) => attempt.current_index || 0;

/** Per-question status for the navigation grid. Carries no question content. */
function buildGrid(attempt, templates) {
  const mcqIds = attempt.mcq_question_ids || [];
  const answers = attempt.answers || {};
  const code = attempt.dsa_code || {};
  const review = new Set(attempt.review_marks || []);
  const frontier = frontierOf(attempt);
  return sequenceOf(attempt).map((qid, i) => {
    const isMcq = i < mcqIds.length;
    const src = code[qid];
    return {
      position: i,
      kind: isMcq ? 'mcq' : 'dsa',
      locked: i > frontier,
      answered: isMcq
        ? Number.isInteger(answers[qid])
        : typeof src === 'string' && src.trim() !== '' && src.trim() !== (templates[qid] || '').trim(),
      marked: review.has(i),
    };
  });
}

async function buildAttemptPayload(attempt, assessment, meta = {}) {
  const seq = sequenceOf(attempt);
  const mcqCount = (attempt.mcq_question_ids || []).length;
  const frontier = Math.min(frontierOf(attempt), seq.length - 1);
  const requested = Number.isInteger(meta.position) ? meta.position : frontier;
  const idx = Math.max(0, Math.min(requested, frontier));
  const qid = seq[idx];
  const isMcq = idx < mcqCount;

  const dsaIds = attempt.dsa_question_ids || [];
  const rows = await fetchQuestionsByIds(isMcq ? [qid, ...dsaIds] : dsaIds);
  const row = rows.find((r) => r.id === qid);
  const templates = Object.fromEntries(rows.filter((r) => r.kind === 'dsa').map((r) => [r.id, r.template || '']));
  const question = isMcq ? toPublicMcq(row, idx) : toPublicDsa(row, idx - mcqCount);

  const used = await countAttempts(attempt.user_id, assessment.id);
  const storedAnswer = (attempt.answers || {})[qid];
  const storedCode = (attempt.dsa_code || {})[qid];

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
      position: idx,
      frontier,
      total: seq.length,
      mcqTotal: mcqCount,
      isLast: idx >= seq.length - 1,
      grid: buildGrid(attempt, templates),
      answers: isMcq && storedAnswer !== undefined ? { [qid]: storedAnswer } : {},
      dsaCode: !isMcq && storedCode !== undefined ? { [qid]: storedCode } : {},
      violations: attempt.violations || 0,
      maxViolations: env.maxViolations,
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
    question,
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

  // Any reached question may be written; upcoming ones cannot be pre-answered.
  const reached = new Set(sequenceOf(attempt).slice(0, frontierOf(attempt) + 1));

  if (answers && typeof answers === 'object') {
    const merged = { ...(attempt.answers || {}) };
    for (const [qid, value] of Object.entries(answers)) {
      if (reached.has(qid) && (attempt.mcq_question_ids || []).includes(qid) && Number.isInteger(value) && value >= 0 && value < 8) {
        merged[qid] = value;
      }
    }
    patch.answers = merged;
  }

  if (dsaCode && typeof dsaCode === 'object') {
    const merged = { ...(attempt.dsa_code || {}) };
    for (const [qid, code] of Object.entries(dsaCode)) {
      if (reached.has(qid) && (attempt.dsa_question_ids || []).includes(qid) && typeof code === 'string') {
        merged[qid] = code.slice(0, 50000);
      }
    }
    patch.dsa_code = merged;
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
  const assessment = await getAssessmentById(attempt.assessment_id);

  const mcqIds = attempt.mcq_question_ids || [];
  const dsaIds = attempt.dsa_question_ids || [];
  const [mcqRows, dsaRows] = await Promise.all([
    fetchQuestionsByIds(mcqIds),
    fetchQuestionsByIds(dsaIds),
  ]);

  const answers = attempt.answers || {};
  let correctCount = 0;
  const skills = {}; // per-track { correct, total }, shown in the result email
  for (const question of mcqRows) {
    const given = answers[question.id];
    const isCorrect = Number.isInteger(given) && given === question.correct_index;
    if (isCorrect) correctCount += 1;
    const key = question.track || 'general';
    skills[key] = skills[key] || { correct: 0, total: 0 };
    skills[key].total += 1;
    if (isCorrect) skills[key].correct += 1;
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
    topic_breakdown: skills,
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

  // Fire-and-forget: a slow or failing mail provider must never delay or fail
  // a candidate's submission.
  if (assessment.email_results) {
    deliverResultEmail(updated, assessment, { skills, dsaDetail, mcqTotal: mcqRows.length }).catch((err) =>
      console.error('[email] result delivery failed:', err.message)
    );
  }
  return updated;
}

async function deliverResultEmail(attempt, assessment, extra) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email, display_name')
    .eq('id', attempt.user_id)
    .maybeSingle();
  if (!profile || !profile.email) return;

  const result = await email.sendResultEmail({
    to: profile.email,
    name: profile.display_name,
    assessmentTitle: assessment.title,
    totalScore: attempt.total_score,
    maxScore: attempt.max_score,
    mcqScore: attempt.mcq_score,
    dsaScore: attempt.dsa_score,
    correctCount: attempt.correct_count,
    mcqTotal: extra.mcqTotal,
    dsaDetail: extra.dsaDetail,
    dsaStatus: attempt.dsa_status,
    skills: extra.skills,
    attemptNumber: attempt.attempt_number,
    maxAttempts: assessment.max_attempts,
    submittedAt: attempt.submitted_at,
  });

  if (result.sent) {
    await supabaseAdmin
      .from('assessment_attempts')
      .update({ result_emailed_at: new Date().toISOString() })
      .eq('id', attempt.id);
  }
}

async function loadOwnedActive(userId, attemptId, what) {
  const { data: attempt, error } = await supabaseAdmin
    .from('assessment_attempts')
    .select('*')
    .eq('id', attemptId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw fromSupabase(error, `load attempt for ${what}`);
  if (!attempt) throw notFound('Attempt not found.');
  if (attempt.status !== 'in_progress') throw conflict('This attempt is already finished.');
  if (new Date(attempt.expires_at).getTime() <= Date.now()) {
    const finished = await finaliseAttempt(attempt, 'expired');
    throw conflict('Time is up. Your assessment was submitted automatically.', { attemptId: finished.id });
  }
  return attempt;
}

/**
 * Saves the question at `position` and moves to position + 1. Moving past the
 * frontier unlocks the next question, which requires the current one to be
 * completed (an MCQ answered, or code that differs from the template).
 */
async function advance(userId, attemptId, { position, answer, code } = {}) {
  const attempt = await loadOwnedActive(userId, attemptId, 'advance');
  const seq = sequenceOf(attempt);
  const frontier = frontierOf(attempt);
  const idx = Number.isInteger(position) ? position : frontier;
  const qid = seq[idx];
  const mcqCount = (attempt.mcq_question_ids || []).length;

  if (idx < 0 || idx > frontier) throw badRequest('That question is not available yet.');
  if (idx >= seq.length - 1) throw badRequest('This is the last question. Submit to finish.');

  const patch = { last_saved_at: new Date().toISOString() };
  const unlocking = idx === frontier;
  if (unlocking) patch.current_index = frontier + 1;

  if (idx < mcqCount) {
    const value = Number.isInteger(answer) ? answer : (attempt.answers || {})[qid];
    const valid = Number.isInteger(value) && value >= 0 && value < 8;
    if (unlocking && !valid) throw badRequest('Choose an answer before moving on.');
    if (valid) patch.answers = { ...(attempt.answers || {}), [qid]: value };
  } else {
    const [question] = await fetchQuestionsByIds([qid]);
    const source = typeof code === 'string' ? code : (attempt.dsa_code || {})[qid];
    const written = Boolean(source && source.trim() && source.trim() !== (question.template || '').trim());
    if (unlocking && !written) throw badRequest('Write a solution before moving on.');
    if (typeof source === 'string') patch.dsa_code = { ...(attempt.dsa_code || {}), [qid]: source.slice(0, 50000) };
  }

  let query = supabaseAdmin
    .from('assessment_attempts')
    .update(patch)
    .eq('id', attemptId)
    .eq('status', 'in_progress');
  if (unlocking) query = query.eq('current_index', frontier);
  const { data: updated, error } = await query.select().maybeSingle();
  if (error) throw fromSupabase(error, 'advance attempt');
  if (!updated) throw conflict('That question was already completed. Refresh to continue.');

  const assessment = await getAssessmentById(updated.assessment_id);
  return buildAttemptPayload(updated, assessment, { position: idx + 1 });
}

/** Opens a question that has already been reached (for review/changes). */
async function viewQuestion(userId, attemptId, position) {
  const attempt = await loadOwnedActive(userId, attemptId, 'view');
  if (!Number.isInteger(position) || position < 0 || position > frontierOf(attempt)) {
    throw badRequest('That question is not available yet.');
  }
  const assessment = await getAssessmentById(attempt.assessment_id);
  return buildAttemptPayload(attempt, assessment, { position });
}

/** Marks or unmarks a reached question for review. */
async function setReview(userId, attemptId, position, marked) {
  const attempt = await loadOwnedActive(userId, attemptId, 'review');
  if (!Number.isInteger(position) || position < 0 || position > frontierOf(attempt)) {
    throw badRequest('That question is not available yet.');
  }
  const set = new Set(attempt.review_marks || []);
  if (marked) set.add(position); else set.delete(position);
  const review_marks = [...set].sort((a, b) => a - b);
  const { error } = await supabaseAdmin
    .from('assessment_attempts')
    .update({ review_marks })
    .eq('id', attemptId)
    .eq('status', 'in_progress');
  if (error) throw fromSupabase(error, 'mark for review');
  return { reviewMarks: review_marks };
}

const VIOLATION_TYPES = new Set(['fullscreen_exit', 'tab_hidden', 'window_blur']);

/**
 * Records a focus/fullscreen violation reported by the browser. The strike
 * count lives on the server; reaching the limit submits the attempt as-is.
 */
async function recordViolation(userId, attemptId, type) {
  if (!VIOLATION_TYPES.has(type)) throw badRequest('Unknown violation type.');
  const attempt = await loadOwnedActive(userId, attemptId, 'violation');

  const violations = (attempt.violations || 0) + 1;
  const log = [...(attempt.violation_log || []), { type, at: new Date().toISOString() }].slice(-50);

  const { error } = await supabaseAdmin
    .from('assessment_attempts')
    .update({ violations, violation_log: log })
    .eq('id', attemptId)
    .eq('status', 'in_progress');
  if (error) throw fromSupabase(error, 'record violation');

  if (violations >= env.maxViolations) {
    const result = await finaliseAttempt({ ...attempt, violations, violation_log: log }, 'submitted');
    return { violations, max: env.maxViolations, terminated: true, result };
  }
  return { violations, max: env.maxViolations, terminated: false };
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

async function listResults(userId, slug) {
  const assessment = await getAssessment(slug);
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
    country: row.country || null,
    university: row.university || null,
    githubUrl: row.github_url || null,
    leetcodeUrl: row.leetcode_url || null,
    linkedinUrl: row.linkedin_url || null,
    instagramUrl: row.instagram_url || null,
    portfolioUrl: row.portfolio_url || null,
    projectUrl: row.project_url || null,
    totalScore: row.total_score,
    maxScore: row.max_score,
    correctCount: row.correct_count,
    submittedAt: row.submitted_at,
  }));
}

module.exports = {
  getAssessment,
  getAssessmentById,
  listAssessments,
  startOrResume,
  getActiveAttempt,
  buildAttemptPayload,
  saveProgress,
  advance,
  viewQuestion,
  setReview,
  recordViolation,
  submitAttempt,
  listResults,
  getLeaderboard,
  countAttempts,
  shuffle,
  drawBalancedMcqs,
  drawBalancedDsa,
};
