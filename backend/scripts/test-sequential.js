/**
 * Behavioural test for sequential delivery + violations, using an in-memory
 * stand-in for Supabase (no network, no real DB).
 *   node scripts/test-sequential.js
 */
process.env.SUPABASE_URL = 'https://x.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
process.env.MAX_VIOLATIONS = '3';

const path = require('path');
const assert = require('assert');

// ---------------------------------------------------------- fake database
const db = { questions: [], assessments: [], assessment_attempts: [], profiles: [] };

function builder(table) {
  const st = { op: 'select', filters: [], patch: null, row: null, head: false, count: false };
  const rows = () => db[table].filter((r) => st.filters.every((f) => f(r)));
  const run = () => {
    if (st.op === 'insert') {
      const defaults = table === 'assessment_attempts' ? { current_index: 0, violations: 0, violation_log: [], status: 'in_progress' } : {};
      const row = { id: `att_${db[table].length + 1}`, ...defaults, ...st.row };
      db[table].push(row);
      return { data: [row] };
    }
    if (st.op === 'update') {
      const hit = rows();
      hit.forEach((r) => Object.assign(r, st.patch));
      return { data: hit.map((r) => ({ ...r })) };
    }
    const hit = rows().map((r) => ({ ...r }));
    return st.head ? { count: hit.length, data: null } : { data: hit, count: hit.length };
  };
  const b = {
    select(_c, o) { if (o && o.head) st.head = true; return b; },
    insert(row) { st.op = 'insert'; st.row = row; return b; },
    update(patch) { st.op = 'update'; st.patch = patch; return b; },
    eq(k, v) { st.filters.push((r) => r[k] === v); return b; },
    in(k, vs) { st.filters.push((r) => vs.includes(r[k])); return b; },
    order() { return b; },
    limit() { return b; },
    maybeSingle() { const { data } = run(); return Promise.resolve({ data: data && data[0] ? data[0] : null, error: null }); },
    single() { const { data } = run(); return Promise.resolve({ data: data[0], error: null }); },
    then(res, rej) { return Promise.resolve({ ...run(), error: null }).then(res, rej); },
  };
  return b;
}

const fakeSupabase = { supabaseAdmin: { from: builder }, supabasePublic: { from: builder } };
const supPath = require.resolve(path.resolve(__dirname, '../lib/supabase'));
require.cache[supPath] = { id: supPath, filename: supPath, loaded: true, exports: fakeSupabase };

// stub e-mail so finalise never tries the network
const emailPath = require.resolve(path.resolve(__dirname, '../services/email'));
require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true, exports: { sendResultEmail: async () => ({ sent: false }) } };
const judgePath = require.resolve(path.resolve(__dirname, '../services/judge0'));
require.cache[judgePath] = {
  id: judgePath, filename: judgePath, loaded: true,
  exports: { evaluateSubmission: async () => ({ status: 'scored', points: 0, passed: 0, total: 1 }) },
};

const service = require('../services/assessment');

// ----------------------------------------------------------------- fixtures
const mcq = (i) => ({ id: `m${i}`, kind: 'mcq', active: true, track: 'core-cs', topic: 'T', prompt: `Q${i}`, options: ['a', 'b', 'c', 'd'], correct_index: 1 });
for (let i = 1; i <= 3; i += 1) db.questions.push(mcq(i));
db.questions.push({ id: 'd1', kind: 'dsa', active: true, title: 'Two Sum', description: 'd', template: 'var f = function(){};', function_name: 'f', test_cases: [], difficulty: 'easy' });
db.assessments.push({ id: 1, slug: 'x', title: 'X', active: true, mcq_count: 3, dsa_count: 1, max_attempts: 3, mcq_points: 10, dsa_points: 50, duration_minutes: 90, track: null, category: 'master', email_results: false });

const fail = (m) => { console.error('FAIL', m); process.exit(1); };
const expectReject = async (fn, re, label) => {
  try { await fn(); } catch (e) { if (re.test(e.message)) return; fail(`${label}: wrong error "${e.message}"`); return; }
  fail(`${label}: expected rejection`);
};

(async () => {
  const U = 'user1';
  const start = await service.startOrResume(U, 'x');
  const id = start.attempt.id;

  // 1. only the current question is delivered
  assert.strictEqual(start.attempt.position, 0);
  assert.strictEqual(start.attempt.total, 4);
  assert.ok(start.question && start.question.prompt, 'has a question');
  assert.strictEqual(start.mcqs, undefined, 'no question list leaks');
  assert.strictEqual(start.question.correct_index, undefined, 'no answer key leaks');
  const firstId = start.question.id;
  const seenPrompts = JSON.stringify(start);
  const others = db.questions.filter((q) => q.id !== firstId && q.kind === 'mcq');
  others.forEach((q) => assert.ok(!seenPrompts.includes(q.prompt), `payload leaks ${q.prompt}`));
  console.log('ok  only current question delivered');

  // 2. cannot advance without answering
  await expectReject(() => service.advance(U, id, {}), /Choose an answer/, 'advance without answer');
  console.log('ok  cannot skip an unanswered MCQ');

  // 3. cannot pre-answer a question that has not been shown
  const attemptRow = db.assessment_attempts[0];
  const seq = [...attemptRow.mcq_question_ids, ...attemptRow.dsa_question_ids];
  await service.saveProgress(U, id, { answers: { [seq[1]]: 2 } });
  assert.strictEqual(db.assessment_attempts[0].answers[seq[1]], undefined, 'future answer rejected');
  console.log('ok  cannot answer upcoming questions');

  // 4. advance with an answer; earlier answer is retained after later autosaves
  let next = await service.advance(U, id, { answer: 1 });
  assert.strictEqual(next.attempt.position, 1);
  assert.strictEqual(next.question.id, seq[1]);
  await service.saveProgress(U, id, { answers: { [seq[1]]: 3 } });
  assert.strictEqual(db.assessment_attempts[0].answers[seq[0]], 1, 'previous answer kept');
  assert.strictEqual(db.assessment_attempts[0].answers[seq[1]], 3);
  console.log('ok  advance works, earlier answers preserved');

  // 5. reached questions can be revisited and changed; upcoming ones cannot be opened
  const back = await service.viewQuestion(U, id, 0);
  assert.strictEqual(back.question.id, seq[0]);
  assert.strictEqual(back.attempt.answers[seq[0]], 1);
  await service.saveProgress(U, id, { answers: { [seq[0]]: 0 } });
  assert.strictEqual(db.assessment_attempts[0].answers[seq[0]], 0, 'reached question editable');
  await expectReject(() => service.viewQuestion(U, id, 2), /not available/, 'view upcoming');
  await expectReject(() => service.setReview(U, id, 3, true), /not available/, 'mark upcoming');
  const grid = back.attempt.grid;
  assert.strictEqual(grid.length, 4);
  assert.deepStrictEqual(grid.map((g) => g.locked), [false, false, true, true]);
  assert.ok(!JSON.stringify(grid).includes('Q'), 'grid carries no content');
  await service.setReview(U, id, 0, true);
  assert.deepStrictEqual(db.assessment_attempts[0].review_marks, [0]);
  // moving forward from a revisited question does not skip the frontier check
  const fwd = await service.advance(U, id, { position: 0 });
  assert.strictEqual(fwd.attempt.position, 1);
  assert.strictEqual(fwd.attempt.frontier, 1);
  assert.strictEqual(fwd.attempt.grid[0].marked, true);
  console.log('ok  revisit/change reached questions, upcoming stay locked, review marks persist');

  // 6. resume returns the same current question, not the first
  const resumed = await service.startOrResume(U, 'x');
  assert.strictEqual(resumed.attempt.position, 1);
  assert.strictEqual(resumed.question.id, seq[1]);
  assert.strictEqual(resumed.attempt.frontier, 1);
  console.log('ok  resume continues on the current question');

  // 7. advance through to the coding problem; template code is rejected
  await service.advance(U, id, { answer: 0 });
  next = await service.advance(U, id, { answer: 2 });
  assert.strictEqual(next.question.kind, 'dsa');
  assert.strictEqual(next.attempt.isLast, true);
  await expectReject(() => service.advance(U, id, { code: 'x' }), /last question/, 'advance past last');
  console.log('ok  reaches the coding question, last question flagged');

  // 8. violations: strikes counted on the server, terminates at the limit
  let v = await service.recordViolation(U, id, 'tab_hidden');
  assert.deepStrictEqual([v.violations, v.terminated], [1, false]);
  v = await service.recordViolation(U, id, 'fullscreen_exit');
  assert.deepStrictEqual([v.violations, v.terminated], [2, false]);
  await expectReject(() => service.recordViolation(U, id, 'nonsense'), /Unknown violation/, 'bad type');
  v = await service.recordViolation(U, id, 'window_blur');
  assert.strictEqual(v.terminated, true);
  assert.strictEqual(db.assessment_attempts[0].status, 'submitted');
  assert.strictEqual(db.assessment_attempts[0].violations, 3);
  assert.strictEqual(db.assessment_attempts[0].violation_log.length, 3);
  console.log('ok  3 violations auto-submit the attempt');

  await expectReject(() => service.recordViolation(U, id, 'tab_hidden'), /already finished/, 'after finish');
  console.log('ok  no changes after submission');

  console.log('\nAll sequential/proctoring checks passed');
})().catch((e) => { console.error(e); process.exit(1); });
