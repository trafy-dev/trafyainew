# Track assessments (6 MCQ-only assessments alongside Master)

Status: approved by user, ready for implementation planning
Date: 2026-09-09

## Problem

The candidate dashboard currently offers one assessment: "Master Assessment"
(45 MCQ + 2 DSA, 90 min, 3 attempts). The question bank in
`assessment-app/src/questions.js` actually contains 6 topic tracks — Core CS,
C++, Java, Python, Web Dev, AI/ML — each with its own 20 MCQs, already merged
into the single `allQuestions` pool the Master Assessment draws from.

We want each track exposed as its own, separate, MCQ-only assessment a
candidate can take independently of Master, in addition to (not instead of)
Master.

## Goals

- 6 new assessments, one per track, each drawing only from that track's 20
  MCQs (no DSA).
- Master Assessment's behavior is completely unchanged: still draws from all
  120 MCQs across all tracks, still 45 MCQ + 2 DSA.
- Track assessments are self-practice: not shown on the admin leaderboard,
  not ranked. Results are visible only to the candidate who took them.
- A candidate can be mid-attempt on Master and a track assessment
  simultaneously — they're entirely independent (separate `assessment_id`,
  separate attempt-count, separate active-attempt state).

## Non-goals

- No leaderboard changes. `leaderboard` view and `/api/leaderboard` stay
  scoped to Master only — untouched.
- No new question content. All 6 tracks' MCQs already exist verbatim in
  `questions.js` (verified against the source repo, prompt + options +
  correctIndex, 119/120 exact matches, 1 case where our copy is already more
  complete — see prior conversation). This spec only adds *access* to
  existing questions, not new ones.
- No change to DSA question handling, Judge0 integration, or DSA scoring.

## Data model changes

### `questions` table

Add one nullable column:

```sql
alter table public.questions add column if not exists track text;
```

- The 120 track MCQs get tagged with one of: `core-cs`, `cpp`, `java`,
  `python`, `webdev`, `aiml` — set at seed time, derived from which of the 6
  arrays in `questions.js` (`coreCS`, `cpp`, `java`, `python`, `webdev`,
  `aiml`) the question came from, *before* they're merged into
  `allQuestions`.
- All DSA questions keep `track = NULL`.
- Question `id`s are unchanged (`hashId('mcq', prompt)`), so this is a
  metadata-only backfill — no re-seeding of content, no id churn, safe to
  re-run.

### `assessments` table

Add one nullable column:

```sql
alter table public.assessments add column if not exists track text;
```

Seed 6 new rows (Master's existing row is untouched, `track` stays `NULL`):

| slug | title | track | mcq_count | dsa_count | duration_minutes | max_attempts | mcq_points |
|---|---|---|---|---|---|---|---|
| `track-core-cs` | Core CS Assessment | `core-cs` | 20 | 0 | 20 | 3 | 10 |
| `track-cpp` | C++ Assessment | `cpp` | 20 | 0 | 20 | 3 | 10 |
| `track-java` | Java Assessment | `java` | 20 | 0 | 20 | 3 | 10 |
| `track-python` | Python Assessment | `python` | 20 | 0 | 20 | 3 | 10 |
| `track-webdev` | Web Dev Assessment | `webdev` | 20 | 0 | 20 | 3 | 10 |
| `track-aiml` | AI/ML Assessment | `aiml` | 20 | 0 | 20 | 3 | 10 |

`mcq_points: 10` matches Master's per-question point value, so a full-marks
track attempt scores 200/200 — consistent scoring language across the app,
no new mental model for "what does a point mean."

Slugs are prefixed `track-` to keep them unambiguous from any future
non-track assessment and to avoid ever colliding with `cohort-26`.

## Backend changes

### Bug fixes (pre-existing, surfaced by this feature — fix regardless)

**`finaliseAttempt`** (`backend/services/assessment.js`) currently calls
`getAssessment()` with no slug when scoring, so it always scores against
Master's `mcq_points`/`dsa_points`/`mcq_count`/`dsa_count`/`max_score`
regardless of which assessment the attempt actually belongs to. Harmless
today because only one assessment exists; would silently mis-score every
track attempt once a second assessment exists. Fix: look up the assessment
by `attempt.assessment_id` (the attempt's own foreign key) instead of by an
externally-passed slug.

**`listResults`** and **`GET /api/assessment/results`** are hardcoded the
same way — always return Master's attempts only. Fix: accept a `slug` and
filter by that assessment's id; default to Master's slug so the existing
Results page keeps working unchanged.

**`GET /api/assessment/attempt`** is hardcoded to `getAssessment()` (no
slug) for checking active-attempt/attempt-count state. Fix: accept `?slug=`,
default to Master.

### Question-pool scoping

In `startOrResume`, the MCQ pool query currently is:

```js
const { data: pool } = await supabaseAdmin.from('questions').select('id, kind').eq('active', true);
const mcqPool = pool.filter(q => q.kind === 'mcq').map(q => q.id);
```

Change: when `assessment.track` is set, add `.eq('track', assessment.track)`
to the query (or filter client-side after fetch — either works; DB-side
filter is cheaper). When `assessment.track` is `NULL` (Master), no track
filter is applied — behavior is byte-for-byte identical to today, drawing
from the full 120-question pool regardless of track. This is the one
functional risk point in the whole change, so it gets explicit test
coverage (see Testing).

### API surface

- `POST /api/assessment/attempt` — already accepts `{ slug }` in the body.
  No change needed; track assessments just pass their own slug.
- `GET /api/assessment/attempt?slug=track-python` — new query param,
  defaults to Master's slug if omitted.
- `PATCH /api/assessment/attempt/:id` (autosave) — unchanged; already
  operates on a specific attempt by id, slug-agnostic.
- `POST /api/assessment/attempt/:id/submit` — unchanged route; fixed
  internally via the `finaliseAttempt` bug fix above.
- `GET /api/assessment/results?slug=track-python` — new query param,
  defaults to Master's slug if omitted (keeps current callers working).

## Frontend changes

### Navigation

Sidebar's "Assessment" item now routes to an **Assessment hub** page
(`/assessment`) instead of straight into Master's flow.

### Assessment hub (`/assessment`)

- Master Assessment card at top — same content as today's Dashboard bento
  (status, 45 MCQ + 2 DSA, 90 min, attempts, best score), "Start/Resume"
  button. This is the *existing* Dashboard.jsx content moved here, not
  duplicated.
- Below it, a grid of 6 track cards: title, "20 MCQs · 20 mins", attempts
  used (`x / 3`), best score if any, Start/Resume button. Clicking navigates
  to `/assessment/track-<slug>`.
- The Overview page (`/`) keeps its current Master-focused summary + side
  rail unchanged — the hub is reached via the sidebar's "Assessment" link,
  not a redesign of Overview.

### Taking an assessment (`/assessment/:slug`)

The existing MCQ-taking flow (currently inside `MasterAssessment.jsx`) is
parameterized by the route's `:slug` instead of being hardcoded to Master:

- Fetches `/api/assessment/attempt?slug=:slug` for status,
  `POST /api/assessment/attempt` with `{ slug }` to start/resume.
- Renders the DSA pane/tab only when the assessment payload's `dsaCount > 0`
  (Master: yes; all 6 tracks: no) — no separate "track" component needed,
  same component, conditional rendering.
- Submit/autosave/timer logic is unchanged; it already operates on the
  attempt id, not the slug.

### Results (`/results`)

Groups attempts by assessment instead of assuming Master is the only one:
a section (or tab) per assessment the candidate has actually attempted at
least once, each showing that assessment's own attempts table
(`GET /api/assessment/results?slug=...`, one call per assessment section,
or a single new "all my results across assessments" shape — implementation
detail for the plan, not the design).

## Error handling

- Starting a track attempt when the question pool for that track is smaller
  than `mcq_count` throws the same `badRequest` the code already throws for
  Master ("question bank is too small... run npm run seed") — no new error
  path, this is just the existing guard rail applying correctly once tracks
  are wired in.
- An unknown/inactive slug (typo'd URL, disabled assessment) returns the
  existing `notFound` from `getAssessment` — no change needed.

## Testing

- Seed-time: assert each track's MCQ pool count is exactly 20 after seeding
  (matches source data, catches any tagging mistake immediately).
- Backend: for a track assessment, `startOrResume` only ever selects
  question ids whose `track` matches; for Master, selection is unrestricted
  and still draws from all 120 (regression check on the one risky line).
- Backend: `finaliseAttempt` scores a track attempt using *that assessment's*
  `mcq_points`/`max_score`, not Master's — direct regression test for the
  bug fix, using two different `mcq_points` values to make a mix-up
  detectable.
- Backend: `listResults`/`GET /attempt` with and without `?slug=` return the
  right assessment's data and default to Master when omitted.
- Manual/E2E: start, autosave, submit a track assessment end-to-end against
  the real dev backend; confirm it does **not** appear in
  `GET /api/leaderboard` output.
