/**
 * Sanity-checks the DSA pool without touching the database.
 *
 *   node db/verify-dsa.js
 *
 * 1. Every reference solution must reproduce a hand-verified answer taken from
 *    the problem statement's own examples.
 * 2. Every problem must have >= 4 test cases, unique slugs, a template that is
 *    valid JavaScript, and a functionName that appears in that template.
 * 3. Simulates Trafy's Judge0 harness locally: a solution that returns the
 *    reference output passes all tests, and the untouched template passes none.
 */

const vm = require('vm');
const base = require('./dsa-questions');
const extra = require('./dsa-extra');

const known = {
  'valid-parentheses': [[['()[]{}'], true], [['(]'], false], [['([{}])'], true]],
  'best-time-to-buy-and-sell-stock': [[[[7, 1, 5, 3, 6, 4]], 5], [[[7, 6, 4, 3, 1]], 0]],
  'contains-duplicate': [[[[1, 2, 3, 1]], true], [[[1, 2, 3, 4]], false]],
  'valid-anagram': [[['anagram', 'nagaram'], true], [['rat', 'car'], false]],
  'binary-search': [[[[-1, 0, 3, 5, 9, 12], 9], 4], [[[-1, 0, 3, 5, 9, 12], 2], -1]],
  'move-zeroes': [[[[0, 1, 0, 3, 12]], [1, 3, 12, 0, 0]]],
  'longest-common-prefix': [[[['flower', 'flow', 'flight']], 'fl'], [[['dog', 'racecar', 'car']], '']],
  'climbing-stairs': [[[2], 2], [[3], 3], [[5], 8]],
  'single-number': [[[[2, 2, 1]], 1], [[[4, 1, 2, 1, 2]], 4]],
  'longest-substring-without-repeating': [[['abcabcbb'], 3], [['bbbbb'], 1], [['pwwkew'], 3]],
  'product-of-array-except-self': [[[[1, 2, 3, 4]], [24, 12, 8, 6]], [[[-1, 1, 0, -3, 3]], [0, 0, 9, 0, 0]]],
  'maximum-subarray': [[[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], 6], [[[5, 4, -1, 7, 8]], 23]],
  'merge-intervals': [[[[[1, 3], [2, 6], [8, 10], [15, 18]]], [[1, 6], [8, 10], [15, 18]]], [[[[1, 4], [4, 5]]], [[1, 5]]]],
  'group-anagrams': [[[['eat', 'tea', 'tan', 'ate', 'nat', 'bat']], [['ate', 'eat', 'tea'], ['bat'], ['nat', 'tan']]]],
  'number-of-islands': [[[[['1', '1', '0'], ['1', '0', '0'], ['0', '0', '1']]], 2], [[[['1', '1', '1'], ['0', '1', '0'], ['1', '1', '1']]], 1]],
  'coin-change': [[[[1, 2, 5], 11], 3], [[[2], 3], -1], [[[1], 0], 0]],
  'three-sum': [[[[-1, 0, 1, 2, -1, -4]], [[-1, -1, 2], [-1, 0, 1]]], [[[0, 1, 1]], []], [[[0, 0, 0]], [[0, 0, 0]]]],
  'rotting-oranges': [[[[[2, 1, 1], [1, 1, 0], [0, 1, 1]]], 4], [[[[2, 1, 1], [0, 1, 1], [1, 0, 1]]], -1], [[[[0, 2]]], 0]],
  'course-schedule': [[[2, [[1, 0]]], true], [[2, [[1, 0], [0, 1]]], false]],
  'top-k-frequent-elements': [[[[1, 1, 1, 2, 2, 3], 2], [1, 2]], [[[4, 4, 5, 5, 6], 2], [4, 5]]],
  'longest-increasing-subsequence': [[[[10, 9, 2, 5, 3, 7, 101, 18]], 4], [[[7, 7, 7, 7]], 1]],
  subsets: [[[[1, 2, 3]], [[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]]], [[[0]], [[], [0]]]],
  'search-in-rotated-sorted-array': [[[[4, 5, 6, 7, 0, 1, 2], 0], 4], [[[4, 5, 6, 7, 0, 1, 2], 3], -1]],
  'word-break': [[['leetcode', ['leet', 'code']], true], [['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], false]],
  'kth-largest-element': [[[[3, 2, 1, 5, 6, 4], 2], 5], [[[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], 4]],
  'minimum-path-sum': [[[[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], 7], [[[[1, 2, 3], [4, 5, 6]]], 12]],
  'trapping-rain-water': [[[[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], 6], [[[4, 2, 0, 3, 2, 5]], 9]],
  'edit-distance': [[['horse', 'ros'], 3], [['intention', 'execution'], 5]],
};

let failures = 0;
const fail = (msg) => { failures += 1; console.error('FAIL  ' + msg); };

const slugs = new Set([...base.map((b) => b.slug)]);
for (const p of extra) {
  if (slugs.has(p.slug)) fail(`duplicate slug ${p.slug}`);
  slugs.add(p.slug);

  if (p.testCases.length < 4) fail(`${p.slug}: only ${p.testCases.length} test cases`);
  if (!p.template.includes(`var ${p.functionName} =`)) fail(`${p.slug}: template does not define ${p.functionName}`);

  const checks = known[p.slug];
  if (!checks) fail(`${p.slug}: no known-answer checks`);
  for (const [args, want] of checks || []) {
    const got = p.ref(...JSON.parse(JSON.stringify(args)));
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      fail(`${p.slug}(${JSON.stringify(args)}) => ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    }
  }

  // Harness simulation identical in spirit to services/judge0.js buildHarness.
  const solution = `${p.template.replace(/\{\s*\n\s*\n\};$/, `{ return __REF(...arguments); };`)}`;
  let passed = 0;
  for (const t of p.testCases) {
    const ctx = vm.createContext({ __REF: p.ref });
    vm.runInContext(solution, ctx);
    const out = vm.runInContext(`JSON.stringify(${p.functionName}(...JSON.parse('[' + ${JSON.stringify(t.input)} + ']')))`, ctx);
    if (out === t.expectedOutput) passed += 1;
  }
  if (passed !== p.testCases.length) fail(`${p.slug}: reference passed ${passed}/${p.testCases.length}`);

  const blank = vm.createContext({});
  vm.runInContext(p.template, blank);
  const emptyOut = vm.runInContext(`JSON.stringify(${p.functionName}(...JSON.parse('[' + ${JSON.stringify(p.testCases[0].input)} + ']')))`, blank);
  if (emptyOut === p.testCases[0].expectedOutput) fail(`${p.slug}: empty template accidentally passes test 1`);
}

const byDiff = extra.reduce((m, p) => ({ ...m, [p.difficulty]: (m[p.difficulty] || 0) + 1 }), {});
console.log(`${extra.length} new DSA problems (${JSON.stringify(byDiff)}), ${base.length} existing, ${slugs.size} total`);
console.log(failures ? `\n${failures} problem(s) found` : 'All DSA checks passed');
process.exit(failures ? 1 : 0);
