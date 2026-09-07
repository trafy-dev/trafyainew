/**
 * Seeds the question bank into Supabase.
 *
 * MCQs are read from the React app's questions.js so there is a single source
 * of truth. That file reuses ids (`q1`..`q20` restart in every track, giving
 * only 20 unique ids across 120 questions), so ids here are a content hash of
 * the prompt instead — stable across reorderings and safe to re-run.
 *
 *   node db/seed.js          seed/refresh questions
 *   node db/seed.js --reset  also deactivate questions no longer in source
 */

const crypto = require('crypto');
const path = require('path');
const { pathToFileURL } = require('url');

const { supabaseAdmin } = require('../lib/supabase');
const dsaQuestions = require('./dsa-questions');

const MCQ_SOURCE = path.resolve(__dirname, '../../assessment-app/src/questions.js');

const hashId = (prefix, text) =>
  `${prefix}_${crypto.createHash('sha1').update(text.trim()).digest('hex').slice(0, 16)}`;

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

function loadDsa() {
  return dsaQuestions.map((q) => ({
    id: hashId('dsa', q.slug),
    kind: 'dsa',
    topic: 'DSA',
    title: q.title,
    description: q.description,
    template: q.template,
    function_name: q.functionName,
    test_cases: q.testCases,
    points: 50,
    active: true,
  }));
}

async function upsertAll(rows) {
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabaseAdmin.from('questions').upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`upsert failed: ${error.message}`);
    process.stdout.write(`  ...${Math.min(i + CHUNK, rows.length)}/${rows.length}\r`);
  }
  process.stdout.write('\n');
}

async function main() {
  console.log('[seed] loading questions...');
  const mcqs = await loadMcqs();
  const dsa = loadDsa();
  const all = [...mcqs, ...dsa];

  console.log(`[seed] ${mcqs.length} MCQ + ${dsa.length} DSA = ${all.length} questions`);

  if (mcqs.length < 45) {
    console.warn(`[seed] WARNING: only ${mcqs.length} MCQs — the assessment needs 45.`);
  }

  await upsertAll(all);

  if (process.argv.includes('--reset')) {
    const keep = all.map((r) => r.id);
    const { error } = await supabaseAdmin
      .from('questions')
      .update({ active: false })
      .not('id', 'in', `(${keep.map((k) => `"${k}"`).join(',')})`);
    if (error) console.warn('[seed] deactivation of stale questions failed:', error.message);
    else console.log('[seed] stale questions deactivated');
  }

  const { count } = await supabaseAdmin
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('active', true);

  const { data: assessment } = await supabaseAdmin
    .from('assessments')
    .select('slug, title, mcq_count, dsa_count, max_attempts')
    .eq('slug', 'cohort-26')
    .maybeSingle();

  console.log(`[seed] done — ${count} active questions in the bank`);
  if (assessment) {
    console.log(
      `[seed] assessment "${assessment.slug}": ${assessment.mcq_count} MCQ + ` +
        `${assessment.dsa_count} DSA, ${assessment.max_attempts} attempts allowed`
    );
  } else {
    console.warn('[seed] WARNING: no "cohort-26" assessment row — run db/schema.sql first.');
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err.message);
  process.exit(1);
});
