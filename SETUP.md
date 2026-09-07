# Trafy Assessment Platform — Setup

Four things to configure, in this order. Steps 1–3 are yours (they need dashboard
access); step 4 is a single command.

---

## 1. Google OAuth

You do **not** paste the Google client ID into any file in this repo. Supabase
holds it, and the app asks Supabase to do the OAuth dance.

**In Google Cloud Console** → APIs & Services → Credentials → *Create OAuth client ID*
→ Application type: **Web application**.

- **Authorised JavaScript origins**
  ```
  http://localhost:5173
  ```
- **Authorised redirect URI** — this must be your *Supabase* callback, not your app:
  ```
  https://<your-project-ref>.supabase.co/auth/v1/callback
  ```
  Find `<your-project-ref>` in `SUPABASE_URL` in `backend/.env`.

Copy the **Client ID** and **Client secret**.

**In the Supabase dashboard** → Authentication → Providers → **Google**:
- toggle **Enable**
- paste the Client ID and Client secret
- Save

**In the Supabase dashboard** → Authentication → URL Configuration:
- **Site URL**: `http://localhost:5173`
- **Redirect URLs**: add `http://localhost:5173/**`

> When you deploy, add the production origin in all three places above.

### Email/password
Already on by default. Authentication → Providers → Email. If **Confirm email** is
enabled, new signups must click the emailed link before they can sign in — the
login screen tells them so. Turn it off during testing if you prefer.

---

## 2. Database schema

Supabase dashboard → **SQL Editor** → New query → paste the whole of
[`backend/db/schema.sql`](backend/db/schema.sql) → **Run**.

It is idempotent, so it is safe to re-run.

This creates `profiles`, `questions`, `assessments`, `assessment_attempts`, the
`leaderboard` view, the signup trigger, and the RLS policies.

> The old `backend/db.sql` is superseded — don't run it.

**Note on `questions`:** RLS is on with *no* select policy, deliberately. Correct
answers are unreachable with the anon key; only the server's service_role key can
read them. Don't add a policy there.

---

## 3. Environment files

**`backend/.env`** — already migrated to the new variable names, with your existing
URL, anon key and Judge0 key preserved. One value is still a placeholder:

```
SUPABASE_SERVICE_ROLE_KEY=PASTE_YOUR_SERVICE_ROLE_KEY_HERE
```

Get it from **Project Settings → API → Project API keys → `service_role`**
(click *Reveal*). It's a different key from the anon one — the server refuses to
start if you paste the same value twice.

**`assessment-app/.env`** — create it (see `.env.example`):

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon key, NOT service_role>
VITE_API_URL=http://localhost:3000
```

> Anything in a `VITE_*` variable is shipped to the browser. The service_role key
> must never appear in this file.

---

## 4. Seed the question bank

```bash
cd backend
npm run seed
```

Loads 120 MCQs from `assessment-app/src/questions.js` plus 7 DSA problems from
`db/dsa-questions.js`. Re-running is safe — ids are content hashes, so it updates
rather than duplicates.

---

## Running

```bash
cd backend && npm run dev          # http://localhost:3000
cd assessment-app && npm run dev   # http://localhost:5173
```

---

## How the assessment works now

**Attempts.** Three per candidate. The leaderboard shows each candidate's best
score. A fourth start attempt is refused by the server, not just hidden in the UI.

**Question sets are per-candidate and server-pinned.** On start, the server draws
45 MCQs and 2 DSA problems, stores those ids on the attempt row, and sends the
questions **without correct answers**. Refreshing re-serves the same set.

**Autosave and resume.** Every answer and keystroke-batch is saved (debounced
~800ms). Closing the tab loses nothing. Reopening resumes the same attempt.

**The clock is the server's.** `expires_at` is set at start. Closing the tab does
not pause it. On submit — or on the next request after expiry — the server scores
whatever was saved. The on-screen timer is display only.

**Scoring is server-side only.** MCQs are compared against `correct_index` in the
database. The client never sends a score, and could not compute one if it wanted
to. Max score is 45×10 + 2×50 = **550**; the UI treats 60% as a pass.

**DSA.** Each problem runs against its test cases via Judge0 and earns points in
proportion to tests passed. Your current `JUDGE0_API_KEY` returns **403**, so DSA
currently reports `dsa_status: "unavailable"` and scores 0 — shown honestly in the
UI as "could not be executed", never as a silent zero or as fabricated points.
Get a working key from
[RapidAPI → Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce) and put
it in `backend/.env` to enable it. MCQ scoring is unaffected.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Server exits with "Missing required environment variable" | Fill in `backend/.env` |
| Server exits saying the two keys are identical | You pasted the anon key into `SUPABASE_SERVICE_ROLE_KEY` |
| Login screen says Supabase isn't configured | `assessment-app/.env` missing — create it and restart Vite |
| "The question bank is too small" | Run `npm run seed` |
| `Assessment "cohort-26" is not set up` | Run `schema.sql` first, then seed |
| Google login returns `redirect_uri_mismatch` | The redirect URI in GCP must be the **Supabase** `/auth/v1/callback` URL, not your app's |
| Google login lands back on the login page | Add `http://localhost:5173/**` to Supabase → Authentication → URL Configuration → Redirect URLs |
| Leaderboard shows "Reconnecting…" | Backend not running, or the origin isn't in `CORS_ORIGINS` |
