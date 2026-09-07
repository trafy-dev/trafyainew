/**
 * DSA problems for the master assessment.
 *
 * These previously lived inline in MasterAssessment.jsx with no test cases at
 * all, which is why the old backend awarded a flat +10 without ever checking
 * anything. Each problem now carries a function_name and real test cases.
 *
 * Test-case input format: the arguments as they would appear inside a call,
 * comma-separated. The Judge0 harness wraps it as `[<input>]` and spreads it,
 * so "121" means fn(121) and "[1,2], 3" means fn([1,2], 3).
 */

module.exports = [
  {
    slug: 'maximal-path-quality',
    title: 'Maximum Path Quality of a Graph',
    functionName: 'maximalPathQuality',
    description:
      '<p>There is an undirected graph with <code>n</code> nodes numbered from <code>0</code> to <code>n - 1</code>. You are given a 0-indexed integer array <code>values</code> where <code>values[i]</code> is the value of the <code>i<sup>th</sup></code> node, a 0-indexed 2D array <code>edges</code> where <code>edges[j] = [u, v, time]</code>, and an integer <code>maxTime</code>.</p><p>A <strong>valid path</strong> starts at node <code>0</code>, ends at node <code>0</code>, and takes <strong>at most</strong> <code>maxTime</code> seconds. You may visit the same node multiple times. The <strong>quality</strong> of a valid path is the sum of the values of the <strong>unique</strong> nodes visited.</p><p>Return the <strong>maximum</strong> quality of a valid path.</p><br><strong>Example:</strong><pre><strong>Input:</strong> values = [0,32,10,43], edges = [[0,1,10],[1,2,15],[0,3,10]], maxTime = 49\n<strong>Output:</strong> 75</pre><br><strong>Constraints:</strong><ul><li><code>1 &lt;= n &lt;= 1000</code></li><li><code>0 &lt;= edges.length &lt;= 2000</code></li><li>At most four edges per node.</li></ul>',
    template:
      '/**\n * @param {number[]} values\n * @param {number[][]} edges\n * @param {number} maxTime\n * @return {number}\n */\nvar maximalPathQuality = function(values, edges, maxTime) {\n    \n};',
    testCases: [
      { input: '[0,32,10,43], [[0,1,10],[1,2,15],[0,3,10]], 49', expectedOutput: '75' },
      { input: '[5,10,15,20], [[0,1,10],[1,2,10],[0,3,10]], 30', expectedOutput: '25' },
      { input: '[1,2,3,4], [[0,1,10],[1,2,11],[2,3,12],[1,3,13]], 50', expectedOutput: '7' },
      { input: '[0,1,2], [[1,2,10]], 10', expectedOutput: '0' },
    ],
  },
  {
    slug: 'palindrome-number',
    title: 'Palindrome Number',
    functionName: 'isPalindrome',
    description:
      '<p>Given an integer <code>x</code>, return <code>true</code> if <code>x</code> is a <strong>palindrome</strong>, and <code>false</code> otherwise.</p><br><strong>Example 1:</strong><pre><strong>Input:</strong> x = 121\n<strong>Output:</strong> true</pre><strong>Example 2:</strong><pre><strong>Input:</strong> x = -121\n<strong>Output:</strong> false\n<strong>Explanation:</strong> Reads 121- from right to left.</pre><br><strong>Constraints:</strong><ul><li><code>-2<sup>31</sup> &lt;= x &lt;= 2<sup>31</sup> - 1</code></li></ul><p><strong>Follow up:</strong> Could you solve it without converting the integer to a string?</p>',
    template:
      '/**\n * @param {number} x\n * @return {boolean}\n */\nvar isPalindrome = function(x) {\n    \n};',
    testCases: [
      { input: '121', expectedOutput: 'true' },
      { input: '-121', expectedOutput: 'false' },
      { input: '10', expectedOutput: 'false' },
      { input: '0', expectedOutput: 'true' },
      { input: '1234321', expectedOutput: 'true' },
    ],
  },
  {
    slug: 'maximal-rectangle',
    title: 'Maximal Rectangle',
    functionName: 'maximalRectangle',
    description:
      '<p>Given a <code>rows x cols</code> binary <code>matrix</code> filled with <code>0</code>\'s and <code>1</code>\'s, find the largest rectangle containing only <code>1</code>\'s and return its area.</p><br><strong>Example:</strong><pre><strong>Input:</strong> matrix = [["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]\n<strong>Output:</strong> 6</pre><br><strong>Constraints:</strong><ul><li><code>1 &lt;= rows, cols &lt;= 200</code></li><li><code>matrix[i][j]</code> is <code>\'0\'</code> or <code>\'1\'</code>.</li></ul>',
    template:
      '/**\n * @param {character[][]} matrix\n * @return {number}\n */\nvar maximalRectangle = function(matrix) {\n    \n};',
    testCases: [
      {
        input: '[["1","0","1","0","0"],["1","0","1","1","1"],["1","1","1","1","1"],["1","0","0","1","0"]]',
        expectedOutput: '6',
      },
      { input: '[["0"]]', expectedOutput: '0' },
      { input: '[["1"]]', expectedOutput: '1' },
      { input: '[["1","1"],["1","1"]]', expectedOutput: '4' },
    ],
  },
  {
    slug: 'generate-parentheses',
    title: 'Generate Parentheses',
    functionName: 'generateParenthesis',
    description:
      '<p>Given <code>n</code> pairs of parentheses, write a function to generate all combinations of well-formed parentheses.</p><p><em>Return them in the standard backtracking order — always placing an opening bracket before a closing one.</em></p><br><strong>Example 1:</strong><pre><strong>Input:</strong> n = 3\n<strong>Output:</strong> ["((()))","(()())","(())()","()(())","()()()"]</pre><strong>Example 2:</strong><pre><strong>Input:</strong> n = 1\n<strong>Output:</strong> ["()"]</pre><br><strong>Constraints:</strong><ul><li><code>1 &lt;= n &lt;= 8</code></li></ul>',
    template:
      '/**\n * @param {number} n\n * @return {string[]}\n */\nvar generateParenthesis = function(n) {\n    \n};',
    testCases: [
      { input: '1', expectedOutput: '["()"]' },
      { input: '2', expectedOutput: '["(())","()()"]' },
      { input: '3', expectedOutput: '["((()))","(()())","(())()","()(())","()()()"]' },
    ],
  },
  {
    slug: 'find-min-rotated',
    title: 'Find Minimum in Rotated Sorted Array',
    functionName: 'findMin',
    description:
      '<p>Suppose an array of length <code>n</code> sorted in ascending order is <strong>rotated</strong> between <code>1</code> and <code>n</code> times. Given the sorted rotated array <code>nums</code> of <strong>unique</strong> elements, return the minimum element.</p><p>You must write an algorithm that runs in <code>O(log n)</code> time.</p><br><strong>Example:</strong><pre><strong>Input:</strong> nums = [3,4,5,1,2]\n<strong>Output:</strong> 1</pre><br><strong>Constraints:</strong><ul><li><code>1 &lt;= n &lt;= 5000</code></li><li>All integers of <code>nums</code> are unique.</li></ul>',
    template:
      '/**\n * @param {number[]} nums\n * @return {number}\n */\nvar findMin = function(nums) {\n    \n};',
    testCases: [
      { input: '[3,4,5,1,2]', expectedOutput: '1' },
      { input: '[4,5,6,7,0,1,2]', expectedOutput: '0' },
      { input: '[11,13,15,17]', expectedOutput: '11' },
      { input: '[2,1]', expectedOutput: '1' },
      { input: '[1]', expectedOutput: '1' },
    ],
  },
  {
    slug: 'next-greater-element-i',
    title: 'Next Greater Element I',
    functionName: 'nextGreaterElement',
    description:
      '<p>The <strong>next greater element</strong> of some element <code>x</code> in an array is the <strong>first greater</strong> element to the <strong>right</strong> of <code>x</code> in the same array.</p><p>You are given two <strong>distinct 0-indexed</strong> integer arrays <code>nums1</code> and <code>nums2</code>, where <code>nums1</code> is a subset of <code>nums2</code>. For each element of <code>nums1</code>, find the next greater element of that value in <code>nums2</code>. If there is none, the answer is <code>-1</code>.</p><br><strong>Example:</strong><pre><strong>Input:</strong> nums1 = [4,1,2], nums2 = [1,3,4,2]\n<strong>Output:</strong> [-1,3,-1]</pre><br><strong>Constraints:</strong><ul><li><code>1 &lt;= nums1.length &lt;= nums2.length &lt;= 1000</code></li><li>All integers are unique.</li></ul>',
    template:
      '/**\n * @param {number[]} nums1\n * @param {number[]} nums2\n * @return {number[]}\n */\nvar nextGreaterElement = function(nums1, nums2) {\n    \n};',
    testCases: [
      { input: '[4,1,2], [1,3,4,2]', expectedOutput: '[-1,3,-1]' },
      { input: '[2,4], [1,2,3,4]', expectedOutput: '[3,-1]' },
      { input: '[1], [1]', expectedOutput: '[-1]' },
    ],
  },
  {
    slug: 'two-sum',
    title: 'Two Sum',
    functionName: 'twoSum',
    description:
      '<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to <code>target</code></em>.</p><p>You may assume that each input has <strong>exactly one solution</strong>, and you may not use the same element twice. Return the answer with the smaller index first.</p><br><strong>Example:</strong><pre><strong>Input:</strong> nums = [2,7,11,15], target = 9\n<strong>Output:</strong> [0,1]\n<strong>Explanation:</strong> nums[0] + nums[1] == 9.</pre><br><strong>Constraints:</strong><ul><li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li><li>Only one valid answer exists.</li></ul><p><strong>Follow up:</strong> Can you do it in less than O(n²) time?</p>',
    template:
      '/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};',
    testCases: [
      { input: '[2,7,11,15], 9', expectedOutput: '[0,1]' },
      { input: '[3,2,4], 6', expectedOutput: '[1,2]' },
      { input: '[3,3], 6', expectedOutput: '[0,1]' },
      { input: '[-1,-2,-3,-4,-5], -8', expectedOutput: '[2,4]' },
    ],
  },
];
