/**
 * Additional DSA problems for the question pool (topics: arrays, strings,
 * hashing, two pointers, sliding window, stack, binary search, DP, graphs,
 * intervals, heap, backtracking, bit manipulation).
 *
 * Each problem is a classic interview pattern with original wording. The
 * expected outputs are NOT typed by hand: every problem carries a reference
 * solution `ref` and a list of input tuples, and the test cases are derived
 * from them at load time, so a test can never disagree with its own solution.
 * `node db/verify-dsa.js` additionally checks refs against known answers.
 *
 * Problems whose natural answer is not unique (groups, subsets, triplets...)
 * state an explicit output ordering in the description so a correct solution
 * always matches the expected output exactly.
 */

const json = (v) => JSON.stringify(v);
const clone = (v) => JSON.parse(JSON.stringify(v));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const JSDOC_TYPE = { num: 'number', str: 'string', nums: 'number[]', strs: 'string[]', grid: 'string[][]', numgrid: 'number[][]' };

function problem({ slug, title, topic, difficulty, fn, params, returns, intro, examples, constraints, inputs, ref }) {
  const tag = (t) => `<code>${t}</code>`;
  const exHtml = examples
    .map(
      (e, i) =>
        `<strong>Example ${i + 1}:</strong><pre><strong>Input:</strong> ${esc(e.input)}\n<strong>Output:</strong> ${esc(e.output)}` +
        (e.note ? `\n<strong>Explanation:</strong> ${esc(e.note)}` : '') +
        '</pre>'
    )
    .join('');
  const description =
    intro.map((p) => `<p>${p}</p>`).join('') +
    `<br>${exHtml}<br><strong>Constraints:</strong><ul>${constraints.map((c) => `<li>${tag(c)}</li>`).join('')}</ul>`;

  const names = params.map((p) => p[0]);
  const template =
    `/**\n${params.map(([n, t]) => ` * @param {${JSDOC_TYPE[t]}} ${n}`).join('\n')}\n * @return {${JSDOC_TYPE[returns] || returns}}\n */\n` +
    `var ${fn} = function(${names.join(', ')}) {\n    \n};`;

  const testCases = inputs.map((args) => ({
    input: args.map((a) => json(a)).join(', '),
    expectedOutput: json(ref(...clone(args))),
  }));

  return { slug, title, topic, difficulty, functionName: fn, description, template, testCases, ref, inputs };
}

const sortedPair = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const cmpLex = (a, b) => {
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return a.length - b.length;
};

const problems = [
  // ------------------------------------------------------------ EASY
  problem({
    slug: 'valid-parentheses', title: 'Valid Parentheses', topic: 'Stack', difficulty: 'easy',
    fn: 'isValid', params: [['s', 'str']], returns: 'boolean',
    intro: [
      'Given a string <code>s</code> containing only the characters <code>(</code>, <code>)</code>, <code>{</code>, <code>}</code>, <code>[</code> and <code>]</code>, determine whether the input is <strong>valid</strong>.',
      'A string is valid if every open bracket is closed by the same type of bracket, and brackets are closed in the correct order.',
    ],
    examples: [
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
      { input: 's = "([{}])"', output: 'true' },
    ],
    constraints: ['1 <= s.length <= 10^4'],
    inputs: [['()'], ['()[]{}'], ['(]'], ['([)]'], ['{[]}'], ['('], [']'], ['((()))'], ['(()']],
    ref: (s) => {
      const st = []; const m = { ')': '(', ']': '[', '}': '{' };
      for (const c of s) { if (m[c]) { if (st.pop() !== m[c]) return false; } else st.push(c); }
      return st.length === 0;
    },
  }),
  problem({
    slug: 'best-time-to-buy-and-sell-stock', title: 'Best Time to Buy and Sell Stock', topic: 'Arrays', difficulty: 'easy',
    fn: 'maxProfit', params: [['prices', 'nums']], returns: 'num',
    intro: [
      'You are given an array <code>prices</code> where <code>prices[i]</code> is the price of a stock on day <code>i</code>.',
      'Choose one day to buy and a <strong>later</strong> day to sell. Return the maximum profit you can achieve, or <code>0</code> if no profit is possible.',
    ],
    examples: [
      { input: 'prices = [7,1,5,3,6,4]', output: '5', note: 'Buy at 1, sell at 6.' },
      { input: 'prices = [7,6,4,3,1]', output: '0', note: 'Prices only fall, so do not trade.' },
    ],
    constraints: ['1 <= prices.length <= 10^5', '0 <= prices[i] <= 10^4'],
    inputs: [[[7, 1, 5, 3, 6, 4]], [[7, 6, 4, 3, 1]], [[1]], [[2, 4, 1]], [[3, 3, 3]], [[1, 2, 3, 4, 5]], [[2, 1, 2, 0, 1]]],
    ref: (p) => { let lo = Infinity; let best = 0; for (const x of p) { lo = Math.min(lo, x); best = Math.max(best, x - lo); } return best; },
  }),
  problem({
    slug: 'contains-duplicate', title: 'Contains Duplicate', topic: 'Hashing', difficulty: 'easy',
    fn: 'containsDuplicate', params: [['nums', 'nums']], returns: 'boolean',
    intro: ['Given an integer array <code>nums</code>, return <code>true</code> if any value appears <strong>at least twice</strong>, and <code>false</code> if every element is distinct.'],
    examples: [
      { input: 'nums = [1,2,3,1]', output: 'true' },
      { input: 'nums = [1,2,3,4]', output: 'false' },
    ],
    constraints: ['1 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9'],
    inputs: [[[1, 2, 3, 1]], [[1, 2, 3, 4]], [[1]], [[0, 0]], [[-1, -2, -3, -1]], [[9, 8, 7, 6, 5, 4, 3, 2, 1]], [[1000000000, -1000000000, 1000000000]]],
    ref: (n) => new Set(n).size !== n.length,
  }),
  problem({
    slug: 'valid-anagram', title: 'Valid Anagram', topic: 'Strings', difficulty: 'easy',
    fn: 'isAnagram', params: [['s', 'str'], ['t', 'str']], returns: 'boolean',
    intro: ['Given two strings <code>s</code> and <code>t</code>, return <code>true</code> if <code>t</code> is an anagram of <code>s</code> (the same letters with the same counts, in any order), otherwise <code>false</code>.'],
    examples: [
      { input: 's = "anagram", t = "nagaram"', output: 'true' },
      { input: 's = "rat", t = "car"', output: 'false' },
    ],
    constraints: ['1 <= s.length, t.length <= 5 * 10^4', 's and t consist of lowercase English letters'],
    inputs: [['anagram', 'nagaram'], ['rat', 'car'], ['a', 'a'], ['ab', 'a'], ['aacc', 'ccac'], ['listen', 'silent'], ['abc', 'abd']],
    ref: (s, t) => s.split('').sort().join('') === t.split('').sort().join(''),
  }),
  problem({
    slug: 'binary-search', title: 'Binary Search', topic: 'Binary Search', difficulty: 'easy',
    fn: 'search', params: [['nums', 'nums'], ['target', 'num']], returns: 'num',
    intro: ['Given an array of integers <code>nums</code> sorted in ascending order and an integer <code>target</code>, return the index of <code>target</code> in <code>nums</code>, or <code>-1</code> if it is not present.', 'Your algorithm must run in <code>O(log n)</code> time.'],
    examples: [
      { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4' },
      { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1' },
    ],
    constraints: ['1 <= nums.length <= 10^4', 'All values in nums are unique and sorted ascending'],
    inputs: [[[-1, 0, 3, 5, 9, 12], 9], [[-1, 0, 3, 5, 9, 12], 2], [[5], 5], [[5], 4], [[1, 3, 5, 7, 9, 11, 13], 1], [[1, 3, 5, 7, 9, 11, 13], 13], [[2, 4, 6, 8], 8]],
    ref: (n, t) => n.indexOf(t),
  }),
  problem({
    slug: 'move-zeroes', title: 'Move Zeroes', topic: 'Two Pointers', difficulty: 'easy',
    fn: 'moveZeroes', params: [['nums', 'nums']], returns: 'nums',
    intro: ['Given an integer array <code>nums</code>, move all <code>0</code>s to the end while keeping the relative order of the non-zero elements.', 'Return the resulting array.'],
    examples: [
      { input: 'nums = [0,1,0,3,12]', output: '[1,3,12,0,0]' },
      { input: 'nums = [0]', output: '[0]' },
    ],
    constraints: ['1 <= nums.length <= 10^4', '-2^31 <= nums[i] <= 2^31 - 1'],
    inputs: [[[0, 1, 0, 3, 12]], [[0]], [[1, 2, 3]], [[0, 0, 1]], [[4, 0, 5, 0, 0, 6]], [[0, 0, 0]]],
    ref: (n) => [...n.filter((x) => x !== 0), ...n.filter((x) => x === 0)],
  }),
  problem({
    slug: 'longest-common-prefix', title: 'Longest Common Prefix', topic: 'Strings', difficulty: 'easy',
    fn: 'longestCommonPrefix', params: [['strs', 'strs']], returns: 'str',
    intro: ['Write a function that finds the longest common prefix string amongst an array of strings <code>strs</code>.', 'If there is no common prefix, return an empty string <code>""</code>.'],
    examples: [
      { input: 'strs = ["flower","flow","flight"]', output: '"fl"' },
      { input: 'strs = ["dog","racecar","car"]', output: '""' },
    ],
    constraints: ['1 <= strs.length <= 200', '0 <= strs[i].length <= 200', 'strs[i] consists of lowercase English letters'],
    inputs: [[['flower', 'flow', 'flight']], [['dog', 'racecar', 'car']], [['a']], [['ab', 'ab', 'ab']], [['abc', 'ab', 'abcd']], [['', 'b']], [['interview', 'internet', 'internal']]],
    ref: (s) => { let p = s[0]; for (const w of s) while (!w.startsWith(p)) p = p.slice(0, -1); return p; },
  }),
  problem({
    slug: 'climbing-stairs', title: 'Climbing Stairs', topic: 'Dynamic Programming', difficulty: 'easy',
    fn: 'climbStairs', params: [['n', 'num']], returns: 'num',
    intro: ['You are climbing a staircase with <code>n</code> steps. Each time you can climb <code>1</code> or <code>2</code> steps.', 'Return the number of distinct ways you can reach the top.'],
    examples: [
      { input: 'n = 2', output: '2', note: '1+1 or 2.' },
      { input: 'n = 3', output: '3', note: '1+1+1, 1+2, 2+1.' },
    ],
    constraints: ['1 <= n <= 45'],
    inputs: [[1], [2], [3], [4], [5], [10], [30], [45]],
    ref: (n) => { let a = 1; let b = 1; for (let i = 2; i <= n; i += 1) [a, b] = [b, a + b]; return b; },
  }),
  problem({
    slug: 'single-number', title: 'Single Number', topic: 'Bit Manipulation', difficulty: 'easy',
    fn: 'singleNumber', params: [['nums', 'nums']], returns: 'num',
    intro: ['Every element in the integer array <code>nums</code> appears exactly <strong>twice</strong> except for one element that appears once. Return that single element.', 'Aim for linear time and constant extra space.'],
    examples: [
      { input: 'nums = [2,2,1]', output: '1' },
      { input: 'nums = [4,1,2,1,2]', output: '4' },
    ],
    constraints: ['1 <= nums.length <= 3 * 10^4', 'Each element appears twice except one'],
    inputs: [[[2, 2, 1]], [[4, 1, 2, 1, 2]], [[1]], [[-1, -1, -2]], [[7, 3, 5, 3, 7]], [[0, 9, 0]]],
    ref: (n) => n.reduce((a, b) => a ^ b, 0),
  }),

  // ---------------------------------------------------------- MEDIUM
  problem({
    slug: 'longest-substring-without-repeating', title: 'Longest Substring Without Repeating Characters', topic: 'Sliding Window', difficulty: 'medium',
    fn: 'lengthOfLongestSubstring', params: [['s', 'str']], returns: 'num',
    intro: ['Given a string <code>s</code>, return the length of the longest <strong>substring</strong> that contains no repeated characters.'],
    examples: [
      { input: 's = "abcabcbb"', output: '3', note: 'The answer is "abc".' },
      { input: 's = "bbbbb"', output: '1' },
      { input: 's = "pwwkew"', output: '3', note: 'The answer is "wke".' },
    ],
    constraints: ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces'],
    inputs: [['abcabcbb'], ['bbbbb'], ['pwwkew'], [''], [' '], ['au'], ['dvdf'], ['abba'], ['tmmzuxt']],
    ref: (s) => { const seen = new Map(); let lo = 0; let best = 0; for (let i = 0; i < s.length; i += 1) { if (seen.has(s[i]) && seen.get(s[i]) >= lo) lo = seen.get(s[i]) + 1; seen.set(s[i], i); best = Math.max(best, i - lo + 1); } return best; },
  }),
  problem({
    slug: 'product-of-array-except-self', title: 'Product of Array Except Self', topic: 'Arrays', difficulty: 'medium',
    fn: 'productExceptSelf', params: [['nums', 'nums']], returns: 'nums',
    intro: ['Given an integer array <code>nums</code>, return an array <code>answer</code> such that <code>answer[i]</code> equals the product of all elements of <code>nums</code> <strong>except</strong> <code>nums[i]</code>.', 'Solve it without using division, in <code>O(n)</code> time.'],
    examples: [
      { input: 'nums = [1,2,3,4]', output: '[24,12,8,6]' },
      { input: 'nums = [-1,1,0,-3,3]', output: '[0,0,9,0,0]' },
    ],
    constraints: ['2 <= nums.length <= 10^5', '-30 <= nums[i] <= 30', 'The product of any prefix or suffix fits in a 32-bit integer'],
    inputs: [[[1, 2, 3, 4]], [[-1, 1, 0, -3, 3]], [[2, 3]], [[0, 0]], [[5, 0, 2]], [[1, 1, 1, 1]], [[-2, 4, -3]]],
    ref: (n) => { const out = Array(n.length).fill(1); let l = 1; for (let i = 0; i < n.length; i += 1) { out[i] = l; l *= n[i]; } let r = 1; for (let i = n.length - 1; i >= 0; i -= 1) { out[i] *= r; r *= n[i]; } return out.map((x) => (x === 0 ? 0 : x)); },
  }),
  problem({
    slug: 'maximum-subarray', title: 'Maximum Subarray', topic: 'Dynamic Programming', difficulty: 'medium',
    fn: 'maxSubArray', params: [['nums', 'nums']], returns: 'num',
    intro: ['Given an integer array <code>nums</code>, find the contiguous subarray (containing at least one number) with the largest sum, and return that sum.'],
    examples: [
      { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', note: 'The subarray [4,-1,2,1] has the largest sum.' },
      { input: 'nums = [1]', output: '1' },
      { input: 'nums = [5,4,-1,7,8]', output: '23' },
    ],
    constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    inputs: [[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], [[1]], [[5, 4, -1, 7, 8]], [[-3, -2, -1]], [[-1]], [[0, 0, 0]], [[2, -1, 2, -1, 2]]],
    ref: (n) => { let cur = n[0]; let best = n[0]; for (let i = 1; i < n.length; i += 1) { cur = Math.max(n[i], cur + n[i]); best = Math.max(best, cur); } return best; },
  }),
  problem({
    slug: 'merge-intervals', title: 'Merge Intervals', topic: 'Intervals', difficulty: 'medium',
    fn: 'merge', params: [['intervals', 'numgrid']], returns: 'numgrid',
    intro: ['Given an array of <code>intervals</code> where <code>intervals[i] = [start, end]</code>, merge all overlapping intervals and return the non-overlapping intervals that cover all the input, <strong>sorted by start</strong>.', 'Intervals that only touch at an endpoint (for example <code>[1,4]</code> and <code>[4,5]</code>) count as overlapping.'],
    examples: [
      { input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' },
      { input: 'intervals = [[1,4],[4,5]]', output: '[[1,5]]' },
    ],
    constraints: ['1 <= intervals.length <= 10^4', '0 <= start <= end <= 10^4'],
    inputs: [[[[1, 3], [2, 6], [8, 10], [15, 18]]], [[[1, 4], [4, 5]]], [[[1, 4], [0, 4]]], [[[1, 4], [2, 3]]], [[[5, 6]]], [[[8, 10], [1, 3], [2, 6], [15, 18]]], [[[1, 2], [3, 4], [5, 6]]]],
    ref: (iv) => { const s = [...iv].sort((a, b) => a[0] - b[0]); const out = []; for (const [a, b] of s) { if (out.length && a <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], b); else out.push([a, b]); } return out; },
  }),
  problem({
    slug: 'group-anagrams', title: 'Group Anagrams', topic: 'Hashing', difficulty: 'medium',
    fn: 'groupAnagrams', params: [['strs', 'strs']], returns: 'string[][]',
    intro: ['Given an array of strings <code>strs</code>, group the anagrams together.', 'To make the answer unique: sort the words <strong>inside each group</strong> alphabetically, then sort the groups by their <strong>first word</strong> alphabetically.'],
    examples: [
      { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["ate","eat","tea"],["bat"],["nat","tan"]]' },
      { input: 'strs = ["a"]', output: '[["a"]]' },
    ],
    constraints: ['1 <= strs.length <= 10^4', '0 <= strs[i].length <= 100', 'Lowercase English letters only'],
    inputs: [[['eat', 'tea', 'tan', 'ate', 'nat', 'bat']], [['a']], [['']], [['abc', 'bca', 'cab', 'xyz']], [['ab', 'ba', 'ab']], [['listen', 'silent', 'enlist', 'google', 'gogole']]],
    ref: (strs) => { const m = new Map(); for (const w of strs) { const k = w.split('').sort().join(''); if (!m.has(k)) m.set(k, []); m.get(k).push(w); } return [...m.values()].map((g) => g.sort()).sort((a, b) => sortedPair(a[0], b[0])); },
  }),
  problem({
    slug: 'number-of-islands', title: 'Number of Islands', topic: 'Graphs', difficulty: 'medium',
    fn: 'numIslands', params: [['grid', 'grid']], returns: 'num',
    intro: ['Given an <code>m x n</code> grid of characters <code>grid</code> where <code>"1"</code> is land and <code>"0"</code> is water, return the number of islands.', 'An island is formed by connecting adjacent land cells horizontally or vertically. All four edges of the grid are surrounded by water.'],
    examples: [
      { input: 'grid = [["1","1","0"],["1","0","0"],["0","0","1"]]', output: '2' },
      { input: 'grid = [["1","1","1"],["0","1","0"],["1","1","1"]]', output: '1' },
    ],
    constraints: ['1 <= m, n <= 300', 'grid[i][j] is "0" or "1"'],
    inputs: [
      [[['1', '1', '0'], ['1', '0', '0'], ['0', '0', '1']]],
      [[['1', '1', '1'], ['0', '1', '0'], ['1', '1', '1']]],
      [[['0']]], [[['1']]],
      [[['1', '0', '1', '0', '1']]],
      [[['1', '1', '0', '0', '0'], ['1', '1', '0', '0', '0'], ['0', '0', '1', '0', '0'], ['0', '0', '0', '1', '1']]],
    ],
    ref: (g) => { const R = g.length; const C = g[0].length; const seen = g.map((r) => r.map(() => false)); let n = 0; const go = (r, c) => { const st = [[r, c]]; seen[r][c] = true; while (st.length) { const [y, x] = st.pop(); for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ny = y + dy; const nx = x + dx; if (ny >= 0 && nx >= 0 && ny < R && nx < C && !seen[ny][nx] && g[ny][nx] === '1') { seen[ny][nx] = true; st.push([ny, nx]); } } } }; for (let r = 0; r < R; r += 1) for (let c = 0; c < C; c += 1) if (g[r][c] === '1' && !seen[r][c]) { n += 1; go(r, c); } return n; },
  }),
  problem({
    slug: 'coin-change', title: 'Coin Change', topic: 'Dynamic Programming', difficulty: 'medium',
    fn: 'coinChange', params: [['coins', 'nums'], ['amount', 'num']], returns: 'num',
    intro: ['You are given an array <code>coins</code> of distinct denominations and an integer <code>amount</code>. Every denomination can be used any number of times.', 'Return the <strong>fewest</strong> coins needed to make up <code>amount</code>, or <code>-1</code> if it is impossible.'],
    examples: [
      { input: 'coins = [1,2,5], amount = 11', output: '3', note: '11 = 5 + 5 + 1.' },
      { input: 'coins = [2], amount = 3', output: '-1' },
      { input: 'coins = [1], amount = 0', output: '0' },
    ],
    constraints: ['1 <= coins.length <= 12', '1 <= coins[i] <= 2^31 - 1', '0 <= amount <= 10^4'],
    inputs: [[[1, 2, 5], 11], [[2], 3], [[1], 0], [[1], 2], [[186, 419, 83, 408], 6249], [[2, 5, 10, 1], 27], [[5, 7], 3]],
    ref: (coins, amount) => { const dp = Array(amount + 1).fill(Infinity); dp[0] = 0; for (let a = 1; a <= amount; a += 1) for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1); return dp[amount] === Infinity ? -1 : dp[amount]; },
  }),
  problem({
    slug: 'three-sum', title: '3Sum', topic: 'Two Pointers', difficulty: 'medium',
    fn: 'threeSum', params: [['nums', 'nums']], returns: 'numgrid',
    intro: ['Given an integer array <code>nums</code>, return all <strong>unique</strong> triplets <code>[a, b, c]</code> such that <code>a + b + c = 0</code>.', 'To make the answer unique: each triplet must be in ascending order, and the list of triplets must be sorted ascending (compare the first values, then the second, then the third).'],
    examples: [
      { input: 'nums = [-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]' },
      { input: 'nums = [0,1,1]', output: '[]' },
      { input: 'nums = [0,0,0]', output: '[[0,0,0]]' },
    ],
    constraints: ['3 <= nums.length <= 3000', '-10^5 <= nums[i] <= 10^5'],
    inputs: [[[-1, 0, 1, 2, -1, -4]], [[0, 1, 1]], [[0, 0, 0]], [[0, 0, 0, 0]], [[-2, 0, 1, 1, 2]], [[3, -1, -7, 2, 5, -4, 0, 4]], [[1, 2, -2, -1]]],
    ref: (n) => { const a = [...n].sort((x, y) => x - y); const out = []; for (let i = 0; i < a.length - 2; i += 1) { if (i && a[i] === a[i - 1]) continue; let l = i + 1; let r = a.length - 1; while (l < r) { const s = a[i] + a[l] + a[r]; if (s === 0) { out.push([a[i], a[l], a[r]]); l += 1; r -= 1; while (l < r && a[l] === a[l - 1]) l += 1; while (l < r && a[r] === a[r + 1]) r -= 1; } else if (s < 0) l += 1; else r -= 1; } } return out.sort(cmpLex); },
  }),
  problem({
    slug: 'rotting-oranges', title: 'Rotting Oranges', topic: 'Graphs', difficulty: 'medium',
    fn: 'orangesRotting', params: [['grid', 'numgrid']], returns: 'num',
    intro: ['You are given an <code>m x n</code> grid where <code>0</code> is an empty cell, <code>1</code> is a fresh orange and <code>2</code> is a rotten orange.', 'Every minute, each fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten. Return the minimum number of minutes until no fresh orange remains, or <code>-1</code> if that is impossible.'],
    examples: [
      { input: 'grid = [[2,1,1],[1,1,0],[0,1,1]]', output: '4' },
      { input: 'grid = [[2,1,1],[0,1,1],[1,0,1]]', output: '-1', note: 'The bottom-left orange is never reached.' },
      { input: 'grid = [[0,2]]', output: '0' },
    ],
    constraints: ['1 <= m, n <= 10', 'grid[i][j] is 0, 1 or 2'],
    inputs: [[[[2, 1, 1], [1, 1, 0], [0, 1, 1]]], [[[2, 1, 1], [0, 1, 1], [1, 0, 1]]], [[[0, 2]]], [[[0]]], [[[1]]], [[[2, 2], [1, 1], [0, 0], [1, 1]]], [[[1, 2, 1, 1, 2, 1, 1]]]],
    ref: (g) => { const R = g.length; const C = g[0].length; let q = []; let fresh = 0; for (let r = 0; r < R; r += 1) for (let c = 0; c < C; c += 1) { if (g[r][c] === 2) q.push([r, c]); else if (g[r][c] === 1) fresh += 1; } let t = 0; while (q.length && fresh) { const nq = []; for (const [y, x] of q) for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ny = y + dy; const nx = x + dx; if (ny >= 0 && nx >= 0 && ny < R && nx < C && g[ny][nx] === 1) { g[ny][nx] = 2; fresh -= 1; nq.push([ny, nx]); } } q = nq; t += 1; } return fresh ? -1 : t; },
  }),
  problem({
    slug: 'course-schedule', title: 'Course Schedule', topic: 'Graphs', difficulty: 'medium',
    fn: 'canFinish', params: [['numCourses', 'num'], ['prerequisites', 'numgrid']], returns: 'boolean',
    intro: ['There are <code>numCourses</code> courses labelled <code>0</code> to <code>numCourses - 1</code>. Each entry <code>[a, b]</code> in <code>prerequisites</code> means you must take course <code>b</code> before course <code>a</code>.', 'Return <code>true</code> if you can finish all courses, otherwise <code>false</code> (a cycle makes it impossible).'],
    examples: [
      { input: 'numCourses = 2, prerequisites = [[1,0]]', output: 'true' },
      { input: 'numCourses = 2, prerequisites = [[1,0],[0,1]]', output: 'false' },
    ],
    constraints: ['1 <= numCourses <= 2000', '0 <= prerequisites.length <= 5000', 'All pairs are distinct'],
    inputs: [[2, [[1, 0]]], [2, [[1, 0], [0, 1]]], [1, []], [4, [[1, 0], [2, 1], [3, 2]]], [3, [[0, 1], [1, 2], [2, 0]]], [5, [[1, 4], [2, 4], [3, 1], [3, 2]]], [3, [[1, 0], [1, 2], [0, 1]]]],
    ref: (n, pre) => { const g = Array.from({ length: n }, () => []); const deg = Array(n).fill(0); for (const [a, b] of pre) { g[b].push(a); deg[a] += 1; } const q = []; deg.forEach((d, i) => { if (!d) q.push(i); }); let done = 0; while (q.length) { const u = q.shift(); done += 1; for (const v of g[u]) { deg[v] -= 1; if (!deg[v]) q.push(v); } } return done === n; },
  }),
  problem({
    slug: 'top-k-frequent-elements', title: 'Top K Frequent Elements', topic: 'Heap / Hashing', difficulty: 'medium',
    fn: 'topKFrequent', params: [['nums', 'nums'], ['k', 'num']], returns: 'nums',
    intro: ['Given an integer array <code>nums</code> and an integer <code>k</code>, return the <code>k</code> most frequent elements.', 'To make the answer unique: order the result by frequency <strong>descending</strong>, breaking ties by the value <strong>ascending</strong>.'],
    examples: [
      { input: 'nums = [1,1,1,2,2,3], k = 2', output: '[1,2]' },
      { input: 'nums = [4,4,5,5,6], k = 2', output: '[4,5]', note: '4 and 5 both appear twice; 4 comes first.' },
    ],
    constraints: ['1 <= nums.length <= 10^5', '1 <= k <= number of distinct elements'],
    inputs: [[[1, 1, 1, 2, 2, 3], 2], [[1], 1], [[4, 4, 5, 5, 6], 2], [[3, 3, 3, 1, 1, 2], 3], [[-1, -1, 2, 2, 3], 1], [[7, 7, 8, 9, 9, 9, 8], 2]],
    ref: (n, k) => { const m = new Map(); for (const x of n) m.set(x, (m.get(x) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, k).map((e) => e[0]); },
  }),
  problem({
    slug: 'longest-increasing-subsequence', title: 'Longest Increasing Subsequence', topic: 'Dynamic Programming', difficulty: 'medium',
    fn: 'lengthOfLIS', params: [['nums', 'nums']], returns: 'num',
    intro: ['Given an integer array <code>nums</code>, return the length of the longest <strong>strictly increasing</strong> subsequence (elements need not be contiguous).'],
    examples: [
      { input: 'nums = [10,9,2,5,3,7,101,18]', output: '4', note: 'One answer is [2,3,7,101].' },
      { input: 'nums = [7,7,7,7]', output: '1' },
    ],
    constraints: ['1 <= nums.length <= 2500', '-10^4 <= nums[i] <= 10^4'],
    inputs: [[[10, 9, 2, 5, 3, 7, 101, 18]], [[0, 1, 0, 3, 2, 3]], [[7, 7, 7, 7]], [[1]], [[5, 4, 3, 2, 1]], [[1, 2, 3, 4, 5]], [[4, 10, 4, 3, 8, 9]]],
    ref: (n) => { const t = []; for (const x of n) { let lo = 0; let hi = t.length; while (lo < hi) { const m = (lo + hi) >> 1; if (t[m] < x) lo = m + 1; else hi = m; } t[lo] = x; } return t.length; },
  }),
  problem({
    slug: 'subsets', title: 'Subsets', topic: 'Backtracking', difficulty: 'medium',
    fn: 'subsets', params: [['nums', 'nums']], returns: 'numgrid',
    intro: ['Given an integer array <code>nums</code> of <strong>unique</strong> elements, return all possible subsets (the power set), including the empty subset.', 'To make the answer unique: sort the elements inside every subset ascending, then order the list of subsets by <strong>length</strong> first and lexicographically within the same length.'],
    examples: [
      { input: 'nums = [1,2,3]', output: '[[],[1],[2],[3],[1,2],[1,3],[2,3],[1,2,3]]' },
      { input: 'nums = [0]', output: '[[],[0]]' },
    ],
    constraints: ['1 <= nums.length <= 10', '-10 <= nums[i] <= 10', 'All elements are unique'],
    inputs: [[[1, 2, 3]], [[0]], [[3, 1]], [[5, 4, 6, 7]], [[-1, 0, 1]], [[2, 1, 3, 4, 5]]],
    ref: (n) => { const a = [...n].sort((x, y) => x - y); const out = []; const go = (i, cur) => { if (i === a.length) { out.push([...cur]); return; } go(i + 1, cur); cur.push(a[i]); go(i + 1, cur); cur.pop(); }; go(0, []); return out.sort((x, y) => x.length - y.length || cmpLex(x, y)); },
  }),
  problem({
    slug: 'search-in-rotated-sorted-array', title: 'Search in Rotated Sorted Array', topic: 'Binary Search', difficulty: 'medium',
    fn: 'searchRotated', params: [['nums', 'nums'], ['target', 'num']], returns: 'num',
    intro: ['A sorted array of <strong>distinct</strong> integers has been rotated at an unknown pivot, for example <code>[0,1,2,4,5,6,7]</code> becoming <code>[4,5,6,7,0,1,2]</code>.', 'Given the rotated array <code>nums</code> and an integer <code>target</code>, return the index of <code>target</code>, or <code>-1</code> if it is absent. Your solution must run in <code>O(log n)</code>.'],
    examples: [
      { input: 'nums = [4,5,6,7,0,1,2], target = 0', output: '4' },
      { input: 'nums = [4,5,6,7,0,1,2], target = 3', output: '-1' },
      { input: 'nums = [1], target = 0', output: '-1' },
    ],
    constraints: ['1 <= nums.length <= 5000', 'All values are unique'],
    inputs: [[[4, 5, 6, 7, 0, 1, 2], 0], [[4, 5, 6, 7, 0, 1, 2], 3], [[1], 0], [[1], 1], [[3, 1], 1], [[5, 1, 3], 5], [[6, 7, 8, 1, 2, 3, 4], 8], [[1, 2, 3, 4, 5], 4]],
    ref: (n, t) => n.indexOf(t),
  }),
  problem({
    slug: 'word-break', title: 'Word Break', topic: 'Dynamic Programming', difficulty: 'medium',
    fn: 'wordBreak', params: [['s', 'str'], ['wordDict', 'strs']], returns: 'boolean',
    intro: ['Given a string <code>s</code> and a dictionary of strings <code>wordDict</code>, return <code>true</code> if <code>s</code> can be split into a space-separated sequence of one or more dictionary words.', 'The same dictionary word may be reused any number of times.'],
    examples: [
      { input: 's = "leetcode", wordDict = ["leet","code"]', output: 'true' },
      { input: 's = "catsandog", wordDict = ["cats","dog","sand","and","cat"]', output: 'false' },
    ],
    constraints: ['1 <= s.length <= 300', '1 <= wordDict.length <= 1000', 'Lowercase English letters only'],
    inputs: [['leetcode', ['leet', 'code']], ['applepenapple', ['apple', 'pen']], ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], ['a', ['a']], ['ab', ['a']], ['aaaaaaa', ['aaaa', 'aaa']], ['cars', ['car', 'ca', 'rs']]],
    ref: (s, d) => { const set = new Set(d); const dp = Array(s.length + 1).fill(false); dp[0] = true; for (let i = 1; i <= s.length; i += 1) for (let j = 0; j < i; j += 1) if (dp[j] && set.has(s.slice(j, i))) { dp[i] = true; break; } return dp[s.length]; },
  }),
  problem({
    slug: 'kth-largest-element', title: 'Kth Largest Element in an Array', topic: 'Heap / Sorting', difficulty: 'medium',
    fn: 'findKthLargest', params: [['nums', 'nums'], ['k', 'num']], returns: 'num',
    intro: ['Given an integer array <code>nums</code> and an integer <code>k</code>, return the <code>k</code>th largest element in the array.', 'Note that it is the <code>k</code>th largest in sorted order, not the <code>k</code>th distinct element.'],
    examples: [
      { input: 'nums = [3,2,1,5,6,4], k = 2', output: '5' },
      { input: 'nums = [3,2,3,1,2,4,5,5,6], k = 4', output: '4' },
    ],
    constraints: ['1 <= k <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    inputs: [[[3, 2, 1, 5, 6, 4], 2], [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], [[1], 1], [[2, 1], 2], [[7, 7, 7], 2], [[-1, -5, -3], 1], [[9, 4, 7, 1, 8], 5]],
    ref: (n, k) => [...n].sort((a, b) => b - a)[k - 1],
  }),
  problem({
    slug: 'minimum-path-sum', title: 'Minimum Path Sum', topic: 'Dynamic Programming', difficulty: 'medium',
    fn: 'minPathSum', params: [['grid', 'numgrid']], returns: 'num',
    intro: ['Given an <code>m x n</code> grid of non-negative numbers, find a path from the top-left to the bottom-right corner that minimises the sum of all numbers along the path.', 'You may only move <strong>down</strong> or <strong>right</strong> at each step.'],
    examples: [
      { input: 'grid = [[1,3,1],[1,5,1],[4,2,1]]', output: '7', note: 'Path 1 -> 3 -> 1 -> 1 -> 1.' },
      { input: 'grid = [[1,2,3],[4,5,6]]', output: '12' },
    ],
    constraints: ['1 <= m, n <= 200', '0 <= grid[i][j] <= 200'],
    inputs: [[[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], [[[1, 2, 3], [4, 5, 6]]], [[[5]]], [[[1, 2, 3, 4]]], [[[1], [2], [3]]], [[[0, 0], [0, 0]]], [[[7, 1, 3], [2, 9, 1], [8, 1, 1]]]],
    ref: (g) => { const R = g.length; const C = g[0].length; const d = g.map((r) => [...r]); for (let r = 0; r < R; r += 1) for (let c = 0; c < C; c += 1) { if (!r && !c) continue; d[r][c] += Math.min(r ? d[r - 1][c] : Infinity, c ? d[r][c - 1] : Infinity); } return d[R - 1][C - 1]; },
  }),

  // ------------------------------------------------------------ HARD
  problem({
    slug: 'trapping-rain-water', title: 'Trapping Rain Water', topic: 'Two Pointers', difficulty: 'hard',
    fn: 'trap', params: [['height', 'nums']], returns: 'num',
    intro: ['Given <code>n</code> non-negative integers representing an elevation map where each bar has width <code>1</code>, compute how much water it can trap after raining.'],
    examples: [
      { input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output: '6' },
      { input: 'height = [4,2,0,3,2,5]', output: '9' },
    ],
    constraints: ['1 <= height.length <= 2 * 10^4', '0 <= height[i] <= 10^5'],
    inputs: [[[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], [[4, 2, 0, 3, 2, 5]], [[1]], [[3, 3, 3]], [[5, 4, 3, 2, 1]], [[2, 0, 2]], [[3, 0, 0, 2, 0, 4]]],
    ref: (h) => { let l = 0; let r = h.length - 1; let lm = 0; let rm = 0; let w = 0; while (l < r) { if (h[l] < h[r]) { lm = Math.max(lm, h[l]); w += lm - h[l]; l += 1; } else { rm = Math.max(rm, h[r]); w += rm - h[r]; r -= 1; } } return w; },
  }),
  problem({
    slug: 'edit-distance', title: 'Edit Distance', topic: 'Dynamic Programming', difficulty: 'hard',
    fn: 'minDistance', params: [['word1', 'str'], ['word2', 'str']], returns: 'num',
    intro: ['Given two strings <code>word1</code> and <code>word2</code>, return the minimum number of operations required to convert <code>word1</code> into <code>word2</code>.', 'Allowed operations on a word: insert a character, delete a character, or replace a character.'],
    examples: [
      { input: 'word1 = "horse", word2 = "ros"', output: '3', note: 'horse -> rorse -> rose -> ros.' },
      { input: 'word1 = "intention", word2 = "execution"', output: '5' },
    ],
    constraints: ['0 <= word1.length, word2.length <= 500', 'Lowercase English letters only'],
    inputs: [['horse', 'ros'], ['intention', 'execution'], ['', ''], ['a', ''], ['', 'abc'], ['same', 'same'], ['kitten', 'sitting'], ['abc', 'yabd']],
    ref: (a, b) => { const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j += 1) dp[0][j] = j; for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]); return dp[a.length][b.length]; },
  }),
];

module.exports = problems;
