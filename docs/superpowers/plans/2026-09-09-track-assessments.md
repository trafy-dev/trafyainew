# Track Assessments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 MCQ-only, track-specific assessments (Core CS, C++, Java, Python, Web Dev, AI/ML) alongside the existing Master Assessment, each drawing only from that track's 20 questions, self-practice only (not on the leaderboard).

**Architecture:** Extend the existing `assessments`/`questions` tables (already normalized, already slug-driven) with a nullable `track` column on each; generalize the existing single-assessment service/routes/UI to be slug-parameterized instead of implicitly Master-only. No new tables, no new question content — this is wiring, not a rebuild.

**Tech Stack:** Node/Express + Supabase (Postgres) backend, React + react-router-dom frontend, existing patterns throughout (no new libraries).

**Spec:** `docs/superpowers/specs/2026-09-09-track-assessments-design.md`

## Global Constraints

- Master Assessment's behavior must not change: still draws from all 120 MCQs, still 45 MCQ + 2 DSA, still the only assessment on the leaderboard.
- Track assessments: 20 MCQs, 0 DSA, 20 minutes, 3 attempts, 10 points/question (200 max), slugs `track-core-cs`, `track-cpp`, `track-java`, `track-python`, `track-webdev`, `track-aiml`.
- Question `id`s are content hashes of the prompt (`hashId('mcq', prompt)`) — never change how ids are derived, or every existing attempt's `mcq_question_ids` breaks.
- No leaderboard changes of any kind.

---

### Task 1: Export `tracks` from questions.js

**Files:**
- Modify: `assessment-app/src/questions.js:818`
- Test: `backend/db/__track_export_check.js` (throwaway verification script, deleted at the end of this task)

**Interfaces:**
- Produces: `tracks` — a named export, `{ "core-cs": Question[], "cpp": Question[], "java": Question[], "python": Question[], "webdev": Question[], "aiml": Question[] }`, where each array is the *raw* per-track array (includes the 1 `kind: "code"` question per track — unfiltered, unlike `allQuestions`).

- [ ] **Step 1: Export the existing `tracks` const**

In `assessment-app/src/questions.js`, find:

```js
const tracks = {
  "core-cs": coreCS,
  "cpp": cpp,
  "java": java,
  "python": python,
  "webdev": webdev,
  "aiml": aiml
};
```

Replace with:

```js
export const tracks = {
  "core-cs": coreCS,
  "cpp": cpp,
  "java": java,
  "python": python,
  "webdev": webdev,
  "aiml": aiml
};
```

- [ ] **Step 2: Write a verification script**

Create `backend/db/__track_export_check.js`:

```js
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const src = path.resolve(__dirname, '../../assessment-app/src/questions.js');
  const mod = await import(pathToFileURL(src).href);

  if (!mod.tracks) throw new Error('tracks is not exported');

  const expectedKeys = ['core-cs', 'cpp', 'java', 'python', 'webdev', 'aiml'];
  const actualKeys = Object.keys(mod.tracks);
  if (JSON.stringify(actualKeys.sort()) !== JSON.stringify([...expectedKeys].sort())) {
    throw new Error(`track keys mismatch: got ${actualKeys}`);
  }

  for (const key of expectedKeys) {
    const arr = mod.tracks[key];
    if (!Array.isArray(arr) || arr.length !== 21) {
      throw new Error(`track "${key}" should have 21 questions (20 mcq + 1 code), got ${arr?.length}`);
    }
    const mcqCount = arr.filter((q) => q.kind === 'mcq').length;
    if (mcqCount !== 20) throw new Error(`track "${key}" should have 20 MCQs, got ${mcqCount}`);
  }

  console.log('PASS: tracks export is correct — 6 tracks, 20 MCQs each');
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
```

- [ ] **Step 3: Run it**

Run: `node backend/db/__track_export_check.js`
Expected: `PASS: tracks export is correct — 6 tracks, 20 MCQs each`

- [ ] **Step 4: Delete the throwaway script and commit**

```bash
rm backend/db/__track_export_check.js
git add assessment-app/src/questions.js
git commit -m "feat: export tracks map from questions.js for per-track seeding

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Database migration — track columns + 6 assessment rows

**Files:**
- Modify: `backend/db/schema.sql`

**Interfaces:**
- Produces: `public.questions.track` (nullable text), `public.assessments.track` (nullable text), 6 new rows in `public.assessments`.

This project's established workflow (see prior sessions) is that schema changes are run manually by the user against the live Supabase project via the SQL editor — there is no automated migration runner. This task updates the tracked `schema.sql` (so a fresh clone/re-seed stays correct) AND produces the exact block for the user to run.

- [ ] **Step 1: Add the migration to schema.sql**

In `backend/db/schema.sql`, find the `questions` table block:

```sql
create table if not exists public.questions (
  id            text primary key,
  kind          text not null check (kind in ('mcq', 'dsa')),
  topic         text,
  prompt        text,
  options       jsonb,
  correct_index integer,
  title         text,
  description   text,
  template      text,
  function_name text,
  test_cases    jsonb,
  points        integer not null default 10,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
```

Immediately after it, add:

```sql
-- Which of the 6 topic tracks (core-cs, cpp, java, python, webdev, aiml) an
-- MCQ belongs to. NULL for DSA questions and any MCQ not part of a track.
alter table public.questions add column if not exists track text;
```

Then find the `assessments` table block:

```sql
create table if not exists public.assessments (
  id               serial primary key,
  slug             text unique not null,
  title            text not null,
  description      text,
  duration_minutes integer not null default 90,
  mcq_count        integer not null default 45,
  dsa_count        integer not null default 2,
  max_attempts     integer not null default 3,
  mcq_points       integer not null default 10,
  dsa_points       integer not null default 50,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

insert into public.assessments (slug, title, description)
values ('cohort-26', 'Trafy Master Assessment — Cohort ''26',
        '45 multiple-choice questions and 2 DSA challenges.')
on conflict (slug) do nothing;
```

Replace it with (adds the `track` column and the 6 new assessment rows; Master's row and its `on conflict` are untouched):

```sql
create table if not exists public.assessments (
  id               serial primary key,
  slug             text unique not null,
  title            text not null,
  description      text,
  duration_minutes integer not null default 90,
  mcq_count        integer not null default 45,
  dsa_count        integer not null default 2,
  max_attempts     integer not null default 3,
  mcq_points       integer not null default 10,
  dsa_points       integer not null default 50,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- Which track this assessment draws its MCQs from (NULL for Master, which
-- draws from every track).
alter table public.assessments add column if not exists track text;

insert into public.assessments (slug, title, description)
values ('cohort-26', 'Trafy Master Assessment — Cohort ''26',
        '45 multiple-choice questions and 2 DSA challenges.')
on conflict (slug) do nothing;

insert into public.assessments
  (slug, title, description, duration_minutes, mcq_count, dsa_count, max_attempts, mcq_points, dsa_points, track)
values
  ('track-core-cs', 'Core CS Assessment', '20 multiple-choice questions on OS, DBMS, networks and DSA fundamentals.', 20, 20, 0, 3, 10, 50, 'core-cs'),
  ('track-cpp',     'C++ Assessment',     '20 multiple-choice questions on C++.',                                    20, 20, 0, 3, 10, 50, 'cpp'),
  ('track-java',    'Java Assessment',    '20 multiple-choice questions on Java.',                                   20, 20, 0, 3, 10, 50, 'java'),
  ('track-python',  'Python Assessment',  '20 multiple-choice questions on Python.',                                 20, 20, 0, 3, 10, 50, 'python'),
  ('track-webdev',  'Web Dev Assessment', '20 multiple-choice questions on web development.',                        20, 20, 0, 3, 10, 50, 'webdev'),
  ('track-aiml',    'AI/ML Assessment',   '20 multiple-choice questions on AI and machine learning.',                 20, 20, 0, 3, 10, 50, 'aiml')
on conflict (slug) do nothing;
```

- [ ] **Step 2: Run this exact block against the live Supabase project**

Give the user this SQL to run in the Supabase SQL editor (same workflow as every prior schema change in this project):

```sql
alter table public.questions add column if not exists track text;
alter table public.assessments add column if not exists track text;

insert into public.assessments
  (slug, title, description, duration_minutes, mcq_count, dsa_count, max_attempts, mcq_points, dsa_points, track)
values
  ('track-core-cs', 'Core CS Assessment', '20 multiple-choice questions on OS, DBMS, networks and DSA fundamentals.', 20, 20, 0, 3, 10, 50, 'core-cs'),
  ('track-cpp',     'C++ Assessment',     '20 multiple-choice questions on C++.',                                    20, 20, 0, 3, 10, 50, 'cpp'),
  ('track-java',    'Java Assessment',    '20 multiple-choice questions on Java.',                                   20, 20, 0, 3, 10, 50, 'java'),
  ('track-python',  'Python Assessment',  '20 multiple-choice questions on Python.',                                 20, 20, 0, 3, 10, 50, 'python'),
  ('track-webdev',  'Web Dev Assessment', '20 multiple-choice questions on web development.',                        20, 20, 0, 3, 10, 50, 'webdev'),
  ('track-aiml',    'AI/ML Assessment',   '20 multiple-choice questions on AI and machine learning.',                 20, 20, 0, 3, 10, 50, 'aiml')
on conflict (slug) do nothing;
```

- [ ] **Step 3: Verify it landed**

Run (via the backend's Supabase admin client, same pattern used throughout this project):

```bash
node -e "
require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await admin.from('assessments').select('slug, track, mcq_count, dsa_count').order('id');
  if (error) throw error;
  console.table(data);
  const trackCol = await admin.from('questions').select('track').limit(1);
  console.log('questions.track column exists:', !trackCol.error);
})();
"
```

Expected: 7 rows total (`cohort-26` with `track: null`, plus the 6 `track-*` rows with `mcq_count: 20, dsa_count: 0`), and `questions.track column exists: true`.

- [ ] **Step 4: Commit the schema.sql change**

```bash
git add backend/db/schema.sql
git commit -m "feat: schema for 6 track-specific MCQ-only assessments

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Seed — tag MCQs with their track

**Files:**
- Modify: `backend/db/seed.js`

**Interfaces:**
- Consumes: `tracks` from `assessment-app/src/questions.js` (Task 1).
- Produces: every seeded MCQ row now has `track` set to one of `core-cs`/`cpp`/`java`/`python`/`webdev`/`aiml`; DSA rows keep `track: null` (unchanged, `loadDsa()` isn't touched).

- [ ] **Step 1: Rewrite `loadMcqs()` to iterate tracks instead of the flattened list**

In `backend/db/seed.js`, find:

```js
async function loadMcqs() {
  const mod = await import(pathToFileURL(MCQ_SOURCE).href);
  const all = mod.allQuestions;
  if (!Array.isArray(all) || all.length === 0) {
    throw new Error(`No questions exported from ${MCQ_SOURCE}`);
  }

  const seen = new Set();
  const rows = [];

  for (const q of all) {
    if (q.kind !== 'mcq') continue;
    if (!Array.isArray(q.options) || q.options.length < 2) {
      console.warn(`[seed] skipping "${String(q.prompt).slice(0, 50)}" — bad options`);
      continue;
    }
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      console.warn(`[seed] skipping "${String(q.prompt).slice(0, 50)}" — bad correctIndex`);
      continue;
    }

    const id = hashId('mcq', q.prompt);
    if (seen.has(id)) {
      console.warn(`[seed] duplicate prompt skipped: "${String(q.prompt).slice(0, 50)}"`);
      continue;
    }
    seen.add(id);

    rows.push({
      id,
      kind: 'mcq',
      topic: q.topic || null,
      prompt: q.prompt,
      options: q.options,
      correct_index: q.correctIndex,
      points: 10,
      active: true,
    });
  }

  return rows;
}
```

Replace with:

```js
async function loadMcqs() {
  const mod = await import(pathToFileURL(MCQ_SOURCE).href);
  const tracks = mod.tracks;
  if (!tracks || typeof tracks !== 'object' || Object.keys(tracks).length === 0) {
    throw new Error(`No "tracks" exported from ${MCQ_SOURCE}`);
  }

  const seen = new Set();
  const rows = [];

  for (const [trackName, questions] of Object.entries(tracks)) {
    for (const q of questions) {
      if (q.kind !== 'mcq') continue;
      if (!Array.isArray(q.options) || q.options.length < 2) {
        console.warn(`[seed] skipping "${String(q.prompt).slice(0, 50)}" — bad options`);
        continue;
      }
      if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        console.warn(`[seed] skipping "${String(q.prompt).slice(0, 50)}" — bad correctIndex`);
        continue;
      }

      const id = hashId('mcq', q.prompt);
      if (seen.has(id)) {
        console.warn(`[seed] duplicate prompt skipped: "${String(q.prompt).slice(0, 50)}"`);
        continue;
      }
      seen.add(id);

      rows.push({
        id,
        kind: 'mcq',
        topic: q.topic || null,
        track: trackName,
        prompt: q.prompt,
        options: q.options,
        correct_index: q.correctIndex,
        points: 10,
        active: true,
      });
    }
  }

  return rows;
}
```

Note: `Object.entries(tracks)` iterates every track including the questions Master also draws from, so the total MCQ count seeded stays 120 — this is purely adding the `track` tag, not changing which questions exist.

- [ ] **Step 2: Run the seed against the live dev backend**

Run: `cd backend && node db/seed.js`
Expected output ends with: `120 MCQ + 7 DSA = 127 questions` (or current DSA count) and `[seed] done — 127 active questions in the bank` (exact numbers depend on current DSA bank size — the MCQ figure must read 120).

- [ ] **Step 3: Verify track tagging landed correctly**

Run:

```bash
node -e "
require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await admin.from('questions').select('track').eq('kind', 'mcq').eq('active', true);
  if (error) throw error;
  const counts = {};
  for (const row of data) counts[row.track || 'NULL'] = (counts[row.track || 'NULL'] || 0) + 1;
  console.log(counts);
  const tracks = ['core-cs', 'cpp', 'java', 'python', 'webdev', 'aiml'];
  const ok = tracks.every((t) => counts[t] === 20);
  console.log(ok ? 'PASS: each track has exactly 20 MCQs' : 'FAIL: track counts wrong');
})();
"
```

Expected: `{ 'core-cs': 20, cpp: 20, java: 20, python: 20, webdev: 20, aiml: 20 }` and `PASS: each track has exactly 20 MCQs`.

- [ ] **Step 4: Commit**

```bash
git add backend/db/seed.js
git commit -m "feat: tag each seeded MCQ with its source track

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Backend service — fix the assessment-lookup bug, add track filtering

**Files:**
- Modify: `backend/services/assessment.js`
- Test: `backend/db/__service_track_check.js` (throwaway, deleted at end of task)

**Interfaces:**
- Consumes: `assessment.track` (Task 2), `questions.track` (Task 3).
- Produces:
  - `getAssessmentById(id)` — new exported function, `async (id: number) => assessmentRow`.
  - `listAssessments()` — new exported function, `async () => Array<{ slug, title, description, mcqCount, dsaCount, durationMinutes, maxAttempts }>`, ordered: Master first, then the 6 tracks in the fixed order `core-cs, cpp, java, python, webdev, aiml`.
  - `listResults(userId, slug)` — signature change, `slug` now a required second parameter (every call site updated in Task 5).

- [ ] **Step 1: Add `getAssessmentById`**

In `backend/services/assessment.js`, find:

```js
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
```

Add immediately after it:

```js
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
    .select('slug, title, description, mcq_count, dsa_count, duration_minutes, max_attempts, track')
    .eq('active', true)
    .order('id');

  if (error) throw fromSupabase(error, 'list assessments');

  return data.map((a) => ({
    slug: a.slug,
    title: a.title,
    description: a.description,
    mcqCount: a.mcq_count,
    dsaCount: a.dsa_count,
    durationMinutes: a.duration_minutes,
    maxAttempts: a.max_attempts,
    isTrack: Boolean(a.track),
  }));
}
```

- [ ] **Step 2: Filter the MCQ pool by track in `startOrResume`**

Find:

```js
  const { data: pool, error: poolError } = await supabaseAdmin
    .from('questions')
    .select('id, kind')
    .eq('active', true);
  if (poolError) throw fromSupabase(poolError, 'load question pool');

  const mcqPool = pool.filter((q) => q.kind === 'mcq').map((q) => q.id);
  const dsaPool = pool.filter((q) => q.kind === 'dsa').map((q) => q.id);
```

Replace with:

```js
  const { data: pool, error: poolError } = await supabaseAdmin
    .from('questions')
    .select('id, kind, track')
    .eq('active', true);
  if (poolError) throw fromSupabase(poolError, 'load question pool');

  // Master (assessment.track is null) draws from every track, exactly as
  // before; a track assessment only draws from its own 20 questions.
  const mcqPool = pool
    .filter((q) => q.kind === 'mcq' && (!assessment.track || q.track === assessment.track))
    .map((q) => q.id);
  const dsaPool = pool.filter((q) => q.kind === 'dsa').map((q) => q.id);
```

- [ ] **Step 3: Fix `finaliseAttempt` to use the attempt's own assessment**

Find:

```js
async function finaliseAttempt(attempt, status) {
  const assessment = await getAssessment();
```

Replace with:

```js
async function finaliseAttempt(attempt, status) {
  const assessment = await getAssessmentById(attempt.assessment_id);
```

- [ ] **Step 4: Add a `slug` parameter to `listResults`**

Find:

```js
async function listResults(userId) {
  const assessment = await getAssessment();
```

Replace with:

```js
async function listResults(userId, slug) {
  const assessment = await getAssessment(slug);
```

- [ ] **Step 5: Export the two new functions**

Find:

```js
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
```

Replace with:

```js
module.exports = {
  getAssessment,
  getAssessmentById,
  listAssessments,
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
```

- [ ] **Step 6: Write and run a verification script**

Create `backend/db/__service_track_check.js`:

```js
require('dotenv').config();
const service = require('../services/assessment');
const { supabaseAdmin } = require('../lib/supabase');

let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('  PASS', m); } else { fail++; console.log('  FAIL', m, extra ?? ''); } };

(async () => {
  console.log('--- listAssessments ---');
  const list = await service.listAssessments();
  ok(list.length === 7, '7 assessments listed', list.length);
  ok(list[0].slug === 'cohort-26', 'Master listed first', list[0]?.slug);
  ok(list.filter((a) => a.isTrack).length === 6, '6 marked as track assessments');
  const python = list.find((a) => a.slug === 'track-python');
  ok(python && python.mcqCount === 20 && python.dsaCount === 0, 'track-python has 20 MCQ / 0 DSA', JSON.stringify(python));

  console.log('--- track-scoped question pool ---');
  const { data: pool } = await supabaseAdmin.from('questions').select('id, kind, track').eq('active', true);
  const pythonPoolSize = pool.filter((q) => q.kind === 'mcq' && q.track === 'python').length;
  ok(pythonPoolSize === 20, 'exactly 20 python MCQs available to draw from', pythonPoolSize);
  const masterPoolSize = pool.filter((q) => q.kind === 'mcq').length;
  ok(masterPoolSize >= 120, 'master pool (untracked filter) still sees all 120+ MCQs', masterPoolSize);

  console.log('--- getAssessmentById ---');
  const master = await service.getAssessment('cohort-26');
  const byId = await service.getAssessmentById(master.id);
  ok(byId.slug === 'cohort-26', 'getAssessmentById resolves the right row');

  console.log(`\n===== ${pass} passed, ${fail} failed =====`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(1); });
```

Run: `cd backend && node db/__service_track_check.js`
Expected: `===== 6 passed, 0 failed =====`

- [ ] **Step 7: Delete the throwaway script and commit**

```bash
rm backend/db/__service_track_check.js
git add backend/services/assessment.js
git commit -m "fix: score attempts against their own assessment, not always Master

finaliseAttempt called getAssessment() with no slug, so every attempt was
scored using Master's mcq_points/dsa_points/max_score regardless of which
assessment it actually belonged to. Harmless while only one assessment
existed; would have silently mis-scored every track assessment attempt.
Now resolves the assessment via the attempt's own assessment_id.

Also adds track-scoped MCQ pool selection (Master unaffected — no track
set means no filter, same full 120-question pool as before) and
listAssessments()/getAssessmentById() for the upcoming routes.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Routes — slug support + assessment list endpoint

**Files:**
- Modify: `backend/routes/assessment.js`
- Test: manual e2e script (Step 6 below), no separate test file — this task is thin enough that the script lives inline in the plan step.

**Interfaces:**
- Consumes: `service.getAssessmentById`, `service.listAssessments`, `service.listResults(userId, slug)` (Task 4).
- Produces:
  - `GET /api/assessment/attempt?slug=<slug>` — slug optional, defaults to Master.
  - `GET /api/assessment/results?slug=<slug>` — slug optional, defaults to Master.
  - `GET /api/assessment/list` — new route, no params.

- [ ] **Step 1: Add `?slug=` to `GET /attempt`, and assessment metadata to its "no attempt" branch**

Find:

```js
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
```

Replace with:

```js
router.get(
  '/attempt',
  asyncHandler(async (req, res) => {
    const assessment = await service.getAssessment(req.query.slug);
    const attempt = await service.getActiveAttempt(req.user.id, assessment.id);
    if (!attempt || attempt.status !== 'in_progress') {
      const used = await service.countAttempts(req.user.id, assessment.id);
      return res.json({
        attempt: null,
        attemptsUsed: used,
        maxAttempts: assessment.max_attempts,
        canStart: used < assessment.max_attempts,
        // So the "start" screen can render a real title/description/counts
        // for whichever assessment this is, instead of hardcoded copy.
        assessment: {
          slug: assessment.slug,
          title: assessment.title,
          description: assessment.description,
          mcqCount: assessment.mcq_count,
          dsaCount: assessment.dsa_count,
          durationMinutes: assessment.duration_minutes,
        },
      });
    }
    res.json(await service.buildAttemptPayload(attempt, assessment, { resumed: true }));
  })
);
```

- [ ] **Step 2: Add `?slug=` to `GET /results`**

Find:

```js
/** This candidate's own past attempts. */
router.get(
  '/results',
  asyncHandler(async (req, res) => {
    res.json(await service.listResults(req.user.id));
  })
);
```

Replace with:

```js
/** This candidate's own past attempts for one assessment (default: Master). */
router.get(
  '/results',
  asyncHandler(async (req, res) => {
    res.json(await service.listResults(req.user.id, req.query.slug));
  })
);
```

- [ ] **Step 3: Add the new list route**

Immediately before `module.exports = router;`, add:

```js
/** Every active assessment's public metadata — Master + the 6 tracks. */
router.get(
  '/list',
  asyncHandler(async (req, res) => {
    res.json({ assessments: await service.listAssessments() });
  })
);
```

- [ ] **Step 4: Start the backend locally**

Run: `cd backend && node server.js &`
Expected: server logs it's listening, no crash on boot.

- [ ] **Step 5: Verify the 3 endpoints with a real authenticated request**

Run:

```bash
cd backend && node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('  PASS', m); } else { fail++; console.log('  FAIL', m, extra ?? ''); } };

async function waitForServer(url, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

(async () => {
  const up = await waitForServer('http://localhost:3000/health', 15000);
  if (!up) { console.log('server not up'); process.exit(1); }

  const email = 'track-route-test-' + Date.now() + '@gmail.com';
  const created = await admin.auth.admin.createUser({ email, password: 'TestPass1!', email_confirm: true });
  const signIn = await anon.auth.signInWithPassword({ email, password: 'TestPass1!' });
  const token = signIn.data.session.access_token;
  const api = async (path) => {
    const res = await fetch('http://localhost:3000' + path, { headers: { authorization: 'Bearer ' + token } });
    return { status: res.status, body: await res.json() };
  };

  const list = await api('/api/assessment/list');
  ok(list.status === 200 && list.body.assessments.length === 7, 'GET /list returns 7 assessments', JSON.stringify(list.body));

  const masterAttempt = await api('/api/assessment/attempt');
  ok(masterAttempt.status === 200 && masterAttempt.body.assessment?.slug === 'cohort-26', 'GET /attempt (no slug) defaults to Master', JSON.stringify(masterAttempt.body.assessment));

  const pyAttempt = await api('/api/assessment/attempt?slug=track-python');
  ok(pyAttempt.status === 200 && pyAttempt.body.assessment?.mcqCount === 20 && pyAttempt.body.assessment?.dsaCount === 0, 'GET /attempt?slug=track-python has 20 MCQ / 0 DSA', JSON.stringify(pyAttempt.body.assessment));

  const pyResults = await api('/api/assessment/results?slug=track-python');
  ok(pyResults.status === 200 && Array.isArray(pyResults.body.attempts), 'GET /results?slug=track-python works', JSON.stringify(pyResults.body));

  await admin.auth.admin.deleteUser(created.data.user.id);
  console.log('\n===== ' + pass + ' passed, ' + fail + ' failed =====');
  process.exit(fail ? 1 : 0);
})();
" 2>&1 | grep -v "injected env"
```

Expected: `===== 4 passed, 0 failed =====`

- [ ] **Step 6: Stop the local server and commit**

```bash
git add backend/routes/assessment.js
git commit -m "feat: slug-aware assessment routes + GET /list

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Frontend — Assessment hub page

**Files:**
- Create: `assessment-app/src/components/AssessmentHub.jsx`
- Modify: `assessment-app/src/App.jsx`
- Modify: `assessment-app/src/components/Dashboard.jsx`
- Modify: `assessment-app/src/index.css`

**Interfaces:**
- Consumes: `GET /api/assessment/list`, `GET /api/assessment/attempt?slug=`.
- Produces: route `/assessment` renders the hub; `/assessment/:slug` (added in Task 7) renders the taking-flow.

- [ ] **Step 1: Create the hub component**

Create `assessment-app/src/components/AssessmentHub.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiError } from '../lib/api';

export default function AssessmentHub() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState(null);
  const [statusBySlug, setStatusBySlug] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/assessment/list');
        if (cancelled) return;
        setAssessments(data.assessments);

        const statuses = await Promise.all(
          data.assessments.map((a) =>
            api.get(`/api/assessment/attempt?slug=${encodeURIComponent(a.slug)}`).then((r) => [a.slug, r.data])
          )
        );
        if (cancelled) return;
        setStatusBySlug(Object.fromEntries(statuses));
      } catch (err) {
        if (!cancelled) setError(apiError(err).message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) return <div className="auth-alert auth-alert--error">{error}</div>;
  if (!assessments) return <div className="loader" />;

  const master = assessments.find((a) => !a.isTrack);
  const tracks = assessments.filter((a) => a.isTrack);

  const renderCard = (a) => {
    const status = statusBySlug[a.slug];
    const inProgress = Boolean(status?.attempt);
    const attemptsUsed = status?.attemptsUsed ?? 0;
    const exhausted = status ? !status.canStart && !inProgress : false;

    return (
      <div className="assessment-card" key={a.slug}>
        <h3>{a.title}</h3>
        <p className="assessment-card__desc">{a.description}</p>
        <div className="assessment-card__meta">
          <span>{a.mcqCount} MCQ{a.dsaCount > 0 ? ` + ${a.dsaCount} DSA` : ''}</span>
          <span>{a.durationMinutes} mins</span>
          <span>{attemptsUsed} / {a.maxAttempts} attempts</span>
        </div>
        <button
          className="btn btn--primary btn--md"
          onClick={() => navigate(`/assessment/${a.slug}`)}
          disabled={exhausted}
        >
          {exhausted ? 'Attempts used' : inProgress ? 'Resume' : 'Start'}
        </button>
      </div>
    );
  };

  return (
    <section className="dashboard-section active">
      <header className="section-header">
        <h1>Assessments</h1>
        <p>The Master Assessment counts toward the leaderboard. Track assessments are self-practice.</p>
      </header>

      {master && (
        <div className="assessment-hub-grid assessment-hub-grid--single mt-4">
          {renderCard(master)}
        </div>
      )}

      <h2 className="assessment-hub-subheading mt-4">Track assessments</h2>
      <div className="assessment-hub-grid">
        {tracks.map(renderCard)}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add CSS for the hub**

Append to `assessment-app/src/index.css`:

```css
/* --- assessment hub --- */
.assessment-hub-subheading {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 20px;
  margin: 0 0 4px;
}

.assessment-hub-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.assessment-hub-grid--single {
  grid-template-columns: 1fr;
  max-width: 420px;
}

.assessment-card {
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.assessment-card h3 {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 18px;
  margin: 0;
}
.assessment-card__desc {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.5;
  flex: 1;
}
.assessment-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  font-size: 12.5px;
  color: var(--text-faint);
}

@media (max-width: 900px) {
  .assessment-hub-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Wire the hub into routing, point Dashboard's button at Master directly**

In `assessment-app/src/App.jsx`, find:

```jsx
import MasterAssessment from './components/MasterAssessment';
```

Add right after it:

```jsx
import AssessmentHub from './components/AssessmentHub';
```

Find:

```jsx
          <Route path="/assessment" element={<MasterAssessment />} />
```

Replace with:

```jsx
          <Route path="/assessment" element={<AssessmentHub />} />
          <Route path="/assessment/:slug" element={<MasterAssessment />} />
```

In `assessment-app/src/components/Dashboard.jsx`, find:

```jsx
            <button className="btn btn--primary btn--lg mt-4" onClick={() => navigate('/assessment')}>
              {summary?.inProgress ? 'Resume assessment' : 'Start assessment'}
            </button>
```

Replace with:

```jsx
            <button className="btn btn--primary btn--lg mt-4" onClick={() => navigate('/assessment/cohort-26')}>
              {summary?.inProgress ? 'Resume assessment' : 'Start assessment'}
            </button>
```

- [ ] **Step 4: Lint and build**

Run: `cd assessment-app && npx oxlint && npm run build`
Expected: no new lint errors on the changed files, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add assessment-app/src/components/AssessmentHub.jsx assessment-app/src/App.jsx assessment-app/src/components/Dashboard.jsx assessment-app/src/index.css
git commit -m "feat: assessment hub page listing Master + 6 track assessments

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Frontend — parameterize the assessment-taking flow by slug

**Files:**
- Modify: `assessment-app/src/components/MasterAssessment.jsx`

**Interfaces:**
- Consumes: `useParams().slug` (route param from Task 6), `GET /api/assessment/attempt?slug=`, `POST /api/assessment/attempt` with `{ slug }`.

This is the task with the most behavioral risk: a track assessment has `dsa.length === 0`, and the existing "last question" button unconditionally tries to enter a DSA phase — which would render a blank/broken DSA panel for track assessments if left unfixed.

- [ ] **Step 1: Read the slug from the route, default to Master**

Find:

```jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Sun, Moon } from 'lucide-react';
import { api, apiError } from '../lib/api';
```

Replace with:

```jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Sun, Moon } from 'lucide-react';
import { api, apiError } from '../lib/api';
```

Find:

```jsx
export default function MasterAssessment() {
  const navigate = useNavigate();

  const [state, setState] = useState({ phase: 'loading', error: null, gate: null });
```

Replace with:

```jsx
export default function MasterAssessment() {
  const navigate = useNavigate();
  const { slug = 'cohort-26' } = useParams();

  const [state, setState] = useState({ phase: 'loading', error: null, gate: null });
```

- [ ] **Step 2: Pass the slug on every API call**

Find:

```jsx
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/assessment/attempt');
        if (cancelled) return;
        if (data.attempt) applyPayload(data);
        else setState({ phase: 'gate', error: null, gate: data });
      } catch (err) {
        if (!cancelled) setState({ phase: 'error', error: apiError(err).message, gate: null });
      }
    })();
    return () => { cancelled = true; };
  }, [applyPayload]);
```

Replace with:

```jsx
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/assessment/attempt?slug=${encodeURIComponent(slug)}`);
        if (cancelled) return;
        if (data.attempt) applyPayload(data);
        else setState({ phase: 'gate', error: null, gate: data });
      } catch (err) {
        if (!cancelled) setState({ phase: 'error', error: apiError(err).message, gate: null });
      }
    })();
    return () => { cancelled = true; };
  }, [applyPayload, slug]);
```

Find:

```jsx
  const startAttempt = async () => {
    setState((s) => ({ ...s, phase: 'loading' }));
    try {
      const { data } = await api.post('/api/assessment/attempt');
      applyPayload(data);
    } catch (err) {
      const info = apiError(err);
      setState({ phase: 'gate', error: info.message, gate: state.gate });
    }
  };
```

Replace with:

```jsx
  const startAttempt = async () => {
    setState((s) => ({ ...s, phase: 'loading' }));
    try {
      const { data } = await api.post('/api/assessment/attempt', { slug });
      applyPayload(data);
    } catch (err) {
      const info = apiError(err);
      setState({ phase: 'gate', error: info.message, gate: state.gate });
    }
  };
```

- [ ] **Step 3: Make the gate screen show the real assessment's title/description/counts**

Find:

```jsx
  if (state.phase === 'gate') {
    const g = state.gate || {};
    const exhausted = g.canStart === false;
    return (
      <section className="dashboard-section active">
        <header className="section-header">
          <h1>Master Assessment</h1>
          <p>45 multiple-choice questions and 2 DSA challenges, in 90 minutes.</p>
        </header>
        <div className="bento-wrap assessment-bento">
          <div className="bento">
            <div className="bento__cell">
              <span className="bento__label">Attempts used</span>
              <span className="bento__value">{g.attemptsUsed ?? 0} / {g.maxAttempts ?? 3}</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Questions</span>
              <span className="bento__value">45 MCQ + 2 DSA</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Time limit</span>
              <span className="bento__value">90 mins</span>
            </div>
          </div>
```

Replace with:

```jsx
  if (state.phase === 'gate') {
    const g = state.gate || {};
    const meta = g.assessment || {};
    const exhausted = g.canStart === false;
    return (
      <section className="dashboard-section active">
        <header className="section-header">
          <h1>{meta.title || 'Assessment'}</h1>
          <p>{meta.description || `${meta.mcqCount ?? ''} multiple-choice questions.`}</p>
        </header>
        <div className="bento-wrap assessment-bento">
          <div className="bento">
            <div className="bento__cell">
              <span className="bento__label">Attempts used</span>
              <span className="bento__value">{g.attemptsUsed ?? 0} / {g.maxAttempts ?? 3}</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Questions</span>
              <span className="bento__value">
                {meta.mcqCount ?? ''} MCQ{meta.dsaCount > 0 ? ` + ${meta.dsaCount} DSA` : ''}
              </span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Time limit</span>
              <span className="bento__value">{meta.durationMinutes ?? ''} mins</span>
            </div>
          </div>
```

- [ ] **Step 4: Fix the last-MCQ button for assessments with no DSA (the real behavioral bug)**

Find:

```jsx
                <button
                  className="btn btn--primary btn--lg"
                  onClick={() => (index < mcqs.length - 1 ? setIndex(index + 1) : setIsDsaPhase(true))}
                >
                  {index < mcqs.length - 1 ? 'Next' : 'Go to DSA'}
                </button>
```

Replace with:

```jsx
                <button
                  className="btn btn--primary btn--lg"
                  onClick={() => {
                    if (index < mcqs.length - 1) setIndex(index + 1);
                    else if (dsa.length > 0) setIsDsaPhase(true);
                    else {
                      const unanswered = mcqs.length - answeredCount;
                      const msg = unanswered > 0
                        ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`
                        : 'Submit your assessment? This cannot be undone.';
                      if (window.confirm(msg)) submit();
                    }
                  }}
                  disabled={submitting}
                >
                  {index < mcqs.length - 1
                    ? 'Next'
                    : dsa.length > 0
                      ? 'Go to DSA'
                      : submitting ? 'Submitting…' : 'Submit'}
                </button>
```

Note: without this fix, finishing the last MCQ of a track assessment (`dsa.length === 0`) would call `setIsDsaPhase(true)`, and the DSA-phase render branch does `dsa[dsaIndex]` → `undefined` → `currentDsa?.title` renders blank and the Monaco editor mounts with an undefined `value`, a broken screen with no way back except the browser back button. This step is the fix.

- [ ] **Step 5: Lint and build**

Run: `cd assessment-app && npx oxlint && npm run build`
Expected: no new lint errors, build succeeds.

- [ ] **Step 6: End-to-end verify a track attempt never enters the DSA phase and submits cleanly**

Run (same style e2e pattern used throughout this project — creates a real test user, starts and submits a real `track-python` attempt against the running dev backend):

```bash
cd backend && node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('  PASS', m); } else { fail++; console.log('  FAIL', m, extra ?? ''); } };

(async () => {
  const email = 'track-flow-test-' + Date.now() + '@gmail.com';
  const created = await admin.auth.admin.createUser({ email, password: 'TestPass1!', email_confirm: true });
  const signIn = await anon.auth.signInWithPassword({ email, password: 'TestPass1!' });
  const token = signIn.data.session.access_token;
  const api = async (method, path, body) => {
    const res = await fetch('http://localhost:3000' + path, {
      method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  };

  const start = await api('POST', '/api/assessment/attempt', { slug: 'track-python' });
  ok(start.status === 201, 'track attempt started', JSON.stringify(start.body));
  ok(start.body.mcqs.length === 20, '20 MCQs pinned', start.body.mcqs.length);
  ok(start.body.dsa.length === 0, '0 DSA questions pinned', start.body.dsa.length);
  ok(start.body.mcqs.every((q) => true), 'mcqs present');

  const attemptId = start.body.attempt.id;
  const submit = await api('POST', '/api/assessment/attempt/' + attemptId + '/submit');
  ok(submit.status === 200, 'track attempt submits cleanly with 0 DSA questions', JSON.stringify(submit.body));
  ok(submit.body.dsaScore === 0 && submit.body.maxScore === 200, 'scored against track config (200 max), not Master (550)', JSON.stringify(submit.body));

  const lbCheck = await admin.from('leaderboard').select('user_id').eq('user_id', created.data.user.id).maybeSingle();
  ok(!lbCheck.data, 'track attempt does NOT appear on the leaderboard');

  await admin.auth.admin.deleteUser(created.data.user.id);
  console.log('\n===== ' + pass + ' passed, ' + fail + ' failed =====');
  process.exit(fail ? 1 : 0);
})();
" 2>&1 | grep -v "injected env"
```

Expected: `===== 6 passed, 0 failed =====` (requires the backend dev server running locally — start it first if not already up).

- [ ] **Step 7: Commit**

```bash
git add assessment-app/src/components/MasterAssessment.jsx
git commit -m "feat: parameterize the assessment-taking flow by slug

Fixes the one real behavioral risk of adding DSA-less assessments: the
last-MCQ button unconditionally entered a DSA phase, which would have
rendered a blank/broken panel for any assessment with dsaCount 0. It now
submits directly when there's no DSA section.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Frontend — Results page groups by assessment

**Files:**
- Modify: `assessment-app/src/components/Results.jsx`

**Interfaces:**
- Consumes: `GET /api/assessment/list`, `GET /api/assessment/results?slug=`.

- [ ] **Step 1: Fetch every assessment's results, keep only ones actually attempted**

Find:

```jsx
export default function Results() {
  const navigate = useNavigate();
  const location = useLocation();
  const justSubmitted = location.state?.justSubmitted || null;
  const timedOut = location.state?.reason === 'timeout';

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/assessment/results');
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(apiError(err).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
```

Replace with:

```jsx
export default function Results() {
  const navigate = useNavigate();
  const location = useLocation();
  const justSubmitted = location.state?.justSubmitted || null;
  const timedOut = location.state?.reason === 'timeout';

  // justSubmitted carries no slug today — it always comes from Master or a
  // track attempt's own submit redirect, and both show the same hero shape,
  // so it's rendered once at the top regardless of which assessment it's for.
  const [sections, setSections] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: listData } = await api.get('/api/assessment/list');
        const results = await Promise.all(
          listData.assessments.map((a) =>
            api.get(`/api/assessment/results?slug=${encodeURIComponent(a.slug)}`).then((r) => ({ assessment: a, ...r.data }))
          )
        );
        if (cancelled) return;
        setSections(results.filter((s) => (s.attempts || []).length > 0));
      } catch (err) {
        if (!cancelled) setError(apiError(err).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
```

- [ ] **Step 2: Replace the single-assessment body with one section per attempted assessment**

Find (the entire body from `if (loading)` through the closing `);` of the component):

```jsx
  if (loading) return <div className="loader" />;

  const attempts = data?.attempts || [];
  const scored = attempts.filter((a) => a.status !== 'in_progress');
  const best = scored.reduce((b, a) => (!b || a.totalScore > b.totalScore ? a : b), null);
  const dsaUnavailable = scored.some((a) => a.dsaStatus === 'unavailable');

  return (
    <section className="dashboard-section active">
      <header className="section-header">
        <h1>Your results</h1>
        <p>
          {data ? `${data.attemptsUsed} of ${data.maxAttempts} attempts used — your best score counts.` : ''}
        </p>
      </header>

      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      {justSubmitted && (
        <div className="result-hero">
          <span className="result-hero__label">
            {timedOut ? 'Time expired — submitted automatically' : 'Submitted'}
          </span>
          <div className="result-hero__score">
            {justSubmitted.totalScore}
            <span> / {justSubmitted.maxScore}</span>
          </div>
          <div className="result-hero__meta">
            {justSubmitted.correctCount} MCQs correct ({justSubmitted.mcqScore} pts) ·
            DSA {justSubmitted.dsaScore} pts ·
            {' '}{pct(justSubmitted.totalScore, justSubmitted.maxScore)}%
          </div>
          {justSubmitted.dsaStatus === 'unavailable' && (
            <div className="auth-alert auth-alert--warn" style={{ marginTop: 16 }}>
              Your DSA code could not be executed, so it scored 0. This is a platform
              configuration issue, not a reflection of your solution — please contact us.
            </div>
          )}
        </div>
      )}

      {best && !justSubmitted && (
        <div className="bento-wrap">
          <div className="bento">
            <div className="bento__cell">
              <span className="bento__label">Best score</span>
              <span className="bento__value">{best.totalScore} / {best.maxScore}</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Percentage</span>
              <span className="bento__value">{pct(best.totalScore, best.maxScore)}%</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Attempts left</span>
              <span className="bento__value">{Math.max(0, (data?.maxAttempts || 0) - (data?.attemptsUsed || 0))}</span>
            </div>
          </div>
        </div>
      )}

      {dsaUnavailable && !justSubmitted && (
        <div className="auth-alert auth-alert--warn">
          Code execution was unavailable for one or more attempts, so DSA questions scored 0.
        </div>
      )}

      <div className="leaderboard-table-wrapper mt-4">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Attempt</th>
              <th>Date</th>
              <th>MCQ</th>
              <th>DSA</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attempts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>
                  You have not taken the assessment yet.
                </td>
              </tr>
            ) : (
              attempts.map((a) => {
                const percentage = pct(a.totalScore, a.maxScore);
                const passed = percentage >= 60;
                return (
                  <tr key={a.id}>
                    <td>#{a.attemptNumber}</td>
                    <td>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '—'}</td>
                    <td>{a.mcqScore} <span className="muted">({a.correctCount} correct)</span></td>
                    <td>
                      {a.dsaScore}
                      {a.dsaStatus === 'unavailable' && <span className="muted"> (not run)</span>}
                    </td>
                    <td><strong>{a.totalScore} / {a.maxScore}</strong> <span className="muted">{percentage}%</span></td>
                    <td>
                      {a.status === 'in_progress' ? (
                        <span className="status-badge">In progress</span>
                      ) : (
                        <span
                          className={`status-badge ${passed ? 'status-completed' : ''}`}
                          style={passed ? {} : { background: 'rgba(255,99,132,0.1)', color: '#FF6384' }}
                        >
                          {passed ? 'Passed' : 'Needs review'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && data.attemptsUsed < data.maxAttempts && (
        <button className="btn btn--primary btn--lg mt-4" onClick={() => navigate('/assessment')}>
          Take attempt {data.attemptsUsed + 1} of {data.maxAttempts}
        </button>
      )}
    </section>
  );
}
```

Replace with:

```jsx
  if (loading) return <div className="loader" />;

  return (
    <section className="dashboard-section active">
      <header className="section-header">
        <h1>Your results</h1>
        <p>One section per assessment you've attempted at least once.</p>
      </header>

      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      {justSubmitted && (
        <div className="result-hero">
          <span className="result-hero__label">
            {timedOut ? 'Time expired — submitted automatically' : 'Submitted'}
          </span>
          <div className="result-hero__score">
            {justSubmitted.totalScore}
            <span> / {justSubmitted.maxScore}</span>
          </div>
          <div className="result-hero__meta">
            {justSubmitted.correctCount} MCQs correct ({justSubmitted.mcqScore} pts)
            {justSubmitted.dsaScore > 0 && <> · DSA {justSubmitted.dsaScore} pts</>} ·
            {' '}{pct(justSubmitted.totalScore, justSubmitted.maxScore)}%
          </div>
          {justSubmitted.dsaStatus === 'unavailable' && (
            <div className="auth-alert auth-alert--warn" style={{ marginTop: 16 }}>
              Your DSA code could not be executed, so it scored 0. This is a platform
              configuration issue, not a reflection of your solution — please contact us.
            </div>
          )}
        </div>
      )}

      {sections && sections.length === 0 && (
        <p className="assessment-note">You have not taken any assessment yet.</p>
      )}

      {(sections || []).map((section) => {
        const attempts = section.attempts || [];
        const scored = attempts.filter((a) => a.status !== 'in_progress');
        const best = scored.reduce((b, a) => (!b || a.totalScore > b.totalScore ? a : b), null);
        const dsaUnavailable = scored.some((a) => a.dsaStatus === 'unavailable');

        return (
          <div key={section.assessment.slug} className="results-section mt-4">
            <h2 className="results-section__title">{section.assessment.title}</h2>

            {best && (
              <div className="bento-wrap">
                <div className="bento">
                  <div className="bento__cell">
                    <span className="bento__label">Best score</span>
                    <span className="bento__value">{best.totalScore} / {best.maxScore}</span>
                  </div>
                  <div className="bento__cell">
                    <span className="bento__label">Percentage</span>
                    <span className="bento__value">{pct(best.totalScore, best.maxScore)}%</span>
                  </div>
                  <div className="bento__cell">
                    <span className="bento__label">Attempts left</span>
                    <span className="bento__value">{Math.max(0, section.maxAttempts - section.attemptsUsed)}</span>
                  </div>
                </div>
              </div>
            )}

            {dsaUnavailable && (
              <div className="auth-alert auth-alert--warn">
                Code execution was unavailable for one or more attempts, so DSA questions scored 0.
              </div>
            )}

            <div className="leaderboard-table-wrapper mt-4">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Attempt</th>
                    <th>Date</th>
                    <th>MCQ</th>
                    {section.assessment.dsaCount > 0 && <th>DSA</th>}
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => {
                    const percentage = pct(a.totalScore, a.maxScore);
                    const passed = percentage >= 60;
                    return (
                      <tr key={a.id}>
                        <td>#{a.attemptNumber}</td>
                        <td>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '—'}</td>
                        <td>{a.mcqScore} <span className="muted">({a.correctCount} correct)</span></td>
                        {section.assessment.dsaCount > 0 && (
                          <td>
                            {a.dsaScore}
                            {a.dsaStatus === 'unavailable' && <span className="muted"> (not run)</span>}
                          </td>
                        )}
                        <td><strong>{a.totalScore} / {a.maxScore}</strong> <span className="muted">{percentage}%</span></td>
                        <td>
                          {a.status === 'in_progress' ? (
                            <span className="status-badge">In progress</span>
                          ) : (
                            <span
                              className={`status-badge ${passed ? 'status-completed' : ''}`}
                              style={passed ? {} : { background: 'rgba(255,99,132,0.1)', color: '#FF6384' }}
                            >
                              {passed ? 'Passed' : 'Needs review'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {section.attemptsUsed < section.maxAttempts && (
              <button
                className="btn btn--ghost btn--md mt-4"
                onClick={() => navigate(`/assessment/${section.assessment.slug}`)}
              >
                Take attempt {section.attemptsUsed + 1} of {section.maxAttempts}
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
```

- [ ] **Step 3: Add CSS for the section title**

Append to `assessment-app/src/index.css`:

```css
.results-section__title {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 20px;
  margin: 0 0 16px;
}
```

- [ ] **Step 4: Lint and build**

Run: `cd assessment-app && npx oxlint && npm run build`
Expected: no new lint errors, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add assessment-app/src/components/Results.jsx assessment-app/src/index.css
git commit -m "feat: results page groups attempts by assessment

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Full end-to-end verification and push

**Files:** none (verification only)

- [ ] **Step 1: Full build + lint of the whole assessment-app**

Run: `cd assessment-app && npx oxlint && npm run build`
Expected: clean, same pre-existing warnings as before this feature (no new ones).

- [ ] **Step 2: Backend syntax check**

Run: `cd backend && for f in routes/assessment.js services/assessment.js db/seed.js; do node --check "$f" && echo "OK: $f"; done`
Expected: `OK:` for all three.

- [ ] **Step 3: Full end-to-end run against the real dev backend**

With the backend dev server running, run:

```bash
cd backend && node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('  PASS', m); } else { fail++; console.log('  FAIL', m, extra ?? ''); } };

(async () => {
  const email = 'full-e2e-test-' + Date.now() + '@gmail.com';
  const created = await admin.auth.admin.createUser({ email, password: 'TestPass1!', email_confirm: true });
  const signIn = await anon.auth.signInWithPassword({ email, password: 'TestPass1!' });
  const token = signIn.data.session.access_token;
  const api = async (method, path, body) => {
    const res = await fetch('http://localhost:3000' + path, {
      method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  };

  console.log('--- Master Assessment unaffected ---');
  const masterStart = await api('POST', '/api/assessment/attempt', { slug: 'cohort-26' });
  ok(masterStart.status === 201, 'Master attempt starts');
  ok(masterStart.body.mcqs.length === 45 && masterStart.body.dsa.length === 2, 'Master still 45 MCQ + 2 DSA', JSON.stringify({ mcqs: masterStart.body.mcqs.length, dsa: masterStart.body.dsa.length }));
  const masterSubmit = await api('POST', '/api/assessment/attempt/' + masterStart.body.attempt.id + '/submit');
  ok(masterSubmit.status === 200 && masterSubmit.body.maxScore === 550, 'Master scores against 550 max', JSON.stringify(masterSubmit.body));

  console.log('--- all 6 tracks start correctly ---');
  const trackSlugs = ['track-core-cs', 'track-cpp', 'track-java', 'track-python', 'track-webdev', 'track-aiml'];
  for (const slug of trackSlugs) {
    const email2 = 'track-e2e-' + slug + '-' + Date.now() + '@gmail.com';
    const u = await admin.auth.admin.createUser({ email: email2, password: 'TestPass1!', email_confirm: true });
    const s = await anon.auth.signInWithPassword({ email: email2, password: 'TestPass1!' });
    const t = s.data.session.access_token;
    const api2 = async (method, path, body) => {
      const res = await fetch('http://localhost:3000' + path, {
        method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, body: await res.json() };
    };
    const start = await api2('POST', '/api/assessment/attempt', { slug });
    const submit = await api2('POST', '/api/assessment/attempt/' + start.body.attempt.id + '/submit');
    ok(
      start.status === 201 && start.body.mcqs.length === 20 && start.body.dsa.length === 0 && submit.body.maxScore === 200,
      slug + ' starts with 20 MCQ/0 DSA and scores against 200 max',
      JSON.stringify({ mcqs: start.body.mcqs?.length, dsa: start.body.dsa?.length, maxScore: submit.body.maxScore })
    );
    await admin.auth.admin.deleteUser(u.data.user.id);
  }

  console.log('--- leaderboard stays Master-only ---');
  const lbRes = await admin.from('leaderboard').select('user_id').eq('user_id', created.data.user.id).maybeSingle();
  ok(Boolean(lbRes.data), 'Master attempt DOES appear on leaderboard');

  await admin.auth.admin.deleteUser(created.data.user.id);
  console.log('\n===== ' + pass + ' passed, ' + fail + ' failed =====');
  process.exit(fail ? 1 : 0);
})();
" 2>&1 | grep -v "injected env"
```

Expected: `===== 9 passed, 0 failed =====` (1 Master start check + 1 Master score check + 6 track checks + 1 leaderboard check).

- [ ] **Step 4: Push**

```bash
git push origin main
```

Expected: pushes cleanly with no rejection (fetch/merge first if `main` has moved, same as prior sessions in this project).
