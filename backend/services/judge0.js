const axios = require('axios');
const env = require('../config/env');

/**
 * Judge0 code execution.
 *
 * The previous implementation submitted source code with no test cases, never
 * polled for a result, and then awarded a flat +10 points as long as the HTTP
 * request itself succeeded — so it scored candidates on whether Judge0 was
 * reachable, not on whether their code worked.
 *
 * This version runs each test case, waits for the verdict, and awards points
 * proportional to tests passed. If no working key is configured the caller is
 * told so explicitly rather than being handed fabricated points.
 */

const LANGUAGE_JAVASCRIPT = 63;
const POLL_INTERVAL_MS = 900;
const MAX_POLLS = 12;

const isConfigured = () => Boolean(env.judge0Key);

const client = () =>
  axios.create({
    baseURL: `https://${env.judge0Host}`,
    timeout: 15000,
    headers: {
      'x-rapidapi-host': env.judge0Host,
      'x-rapidapi-key': env.judge0Key,
      'content-type': 'application/json',
    },
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps the candidate's function so it reads a test input from stdin, calls
 * their function, and prints a comparable result.
 */
function buildHarness(sourceCode, functionName) {
  return `${sourceCode}

// ---- Trafy test harness ----
const __input = require('fs').readFileSync(0, 'utf8').trim();
try {
  const __args = JSON.parse('[' + __input + ']');
  const __result = ${functionName}(...__args);
  console.log(JSON.stringify(__result));
} catch (e) {
  console.log('__TRAFY_ERROR__: ' + e.message);
}`;
}

function normalise(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s+/g, ' ');
}

/** Compares as JSON where possible so [1,2] matches [1, 2]. */
function matches(actual, expected) {
  const a = normalise(actual);
  const b = normalise(expected);
  if (a === b) return true;
  try {
    return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
  } catch {
    return false;
  }
}

async function runSingleTest(http, sourceCode, functionName, testCase) {
  const submission = await http.post('/submissions?base64_encoded=false&wait=false', {
    source_code: buildHarness(sourceCode, functionName),
    language_id: LANGUAGE_JAVASCRIPT,
    stdin: testCase.input,
  });

  const token = submission.data && submission.data.token;
  if (!token) throw new Error('Judge0 returned no token');

  for (let i = 0; i < MAX_POLLS; i += 1) {
    await sleep(POLL_INTERVAL_MS);
    const { data } = await http.get(`/submissions/${token}?base64_encoded=false`);
    const statusId = data.status && data.status.id;

    // 1 = In Queue, 2 = Processing
    if (statusId === 1 || statusId === 2) continue;

    if (statusId === 3) {
      return { passed: matches(data.stdout, testCase.expectedOutput), stdout: data.stdout };
    }
    return {
      passed: false,
      error: (data.status && data.status.description) || data.stderr || data.compile_output,
    };
  }
  return { passed: false, error: 'Timed out waiting for execution' };
}

/**
 * Runs one DSA submission against its test cases.
 * @returns {{status:'scored'|'unavailable'|'skipped', points:number, passed:number, total:number, reason?:string}}
 */
async function evaluateSubmission({ sourceCode, question, maxPoints }) {
  const testCases = Array.isArray(question.test_cases) ? question.test_cases : [];

  // An untouched template is not an attempt.
  if (!sourceCode || !sourceCode.trim() || sourceCode.trim() === (question.template || '').trim()) {
    return { status: 'scored', points: 0, passed: 0, total: testCases.length, reason: 'No code submitted' };
  }

  if (!isConfigured()) {
    return {
      status: 'unavailable',
      points: 0,
      passed: 0,
      total: testCases.length,
      reason: 'Code execution is not configured (JUDGE0_API_KEY missing)',
    };
  }

  if (testCases.length === 0) {
    return {
      status: 'unavailable',
      points: 0,
      passed: 0,
      total: 0,
      reason: 'This problem has no test cases yet',
    };
  }

  const http = client();
  let passed = 0;

  try {
    for (const testCase of testCases) {
      // eslint-disable-next-line no-await-in-loop
      const result = await runSingleTest(http, sourceCode, question.function_name, testCase);
      if (result.passed) passed += 1;
    }
  } catch (err) {
    const status = err.response && err.response.status;
    console.error('[judge0] execution failed:', status || '', err.message);
    return {
      status: 'unavailable',
      points: 0,
      passed: 0,
      total: testCases.length,
      reason:
        status === 401 || status === 403
          ? 'Code execution rejected the API key'
          : 'Code execution service unavailable',
    };
  }

  const points = Math.round((passed / testCases.length) * maxPoints);
  return { status: 'scored', points, passed, total: testCases.length };
}

module.exports = { evaluateSubmission, isConfigured, LANGUAGE_JAVASCRIPT };
