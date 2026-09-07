document.addEventListener('DOMContentLoaded', () => {
  // Navigation Logic
  const sidebarItems = document.querySelectorAll('.sidebar__item');
  const sections = document.querySelectorAll('.dashboard-section');

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active from all
      sidebarItems.forEach(nav => nav.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));
      
      // Add active to clicked
      item.classList.add('active');
      const targetId = item.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');

      // Initialize Monaco Editor if master assessment tab is opened and not initialized
      if(targetId === 'master-assessment' && !window.editorInitialized) {
        initMonaco();
      }
    });
  });

  // Mock Questions Data
  const mockMCQs = Array.from({length: 45}, (_, i) => ({
    id: i + 1,
    question: `Sample MCQ Question ${i + 1}: What is the time complexity of searching in a balanced BST?`,
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
    correct: 'O(log n)'
  }));

  const mockDSA = [
    {
      id: 1,
      title: 'Maximum Path Quality of a Graph',
      description: 'There is an undirected graph with <code>n</code> nodes numbered from <code>0</code> to <code>n - 1</code>. You are given a 0-indexed integer array <code>values</code> where <code>values[i]</code> is the value of the <code>i-th</code> node...<br><br><strong>Constraints:</strong><ul><li><code>n == values.length</code></li><li><code>1 <= n <= 1000</code></li></ul>',
      template: '/**\n * @param {number[]} values\n * @param {number[][]} edges\n * @param {number} maxTime\n * @return {number}\n */\nvar maximalPathQuality = function(values, edges, maxTime) {\n    \n};'
    },
    {
      id: 2,
      title: 'Palindrome Number',
      description: 'Given an integer <code>x</code>, return <code>true</code> if <code>x</code> is a palindrome, and <code>false</code> otherwise.<br><br><strong>Example 1:</strong><br>Input: x = 121<br>Output: true',
      template: '/**\n * @param {number} x\n * @return {boolean}\n */\nvar isPalindrome = function(x) {\n    \n};'
    }
  ];

  let currentQuestionIndex = 0;
  let isDsaPhase = false;
  let dsaIndex = 0;
  let editor = null;
  let answers = {};
  
  const qNumEl = document.getElementById('qNum');
  const mcqTextEl = document.getElementById('mcqText');
  const optionsGridEl = document.getElementById('optionsGrid');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  // Start Assessment
  document.getElementById('startAssessmentBtn').addEventListener('click', () => {
    document.querySelector('[data-target="master-assessment"]').click();
    startTimer(90 * 60, document.getElementById('timer'));
    loadMcq(0);
  });

  function updateProgress() {
    const total = 47;
    const current = isDsaPhase ? 45 + dsaIndex : currentQuestionIndex;
    progressText.innerText = `${current} / ${total}`;
    progressFill.style.width = `${(current / total) * 100}%`;
  }

  function loadMcq(index) {
    currentQuestionIndex = index;
    const q = mockMCQs[index];
    qNumEl.innerText = index + 1;
    mcqTextEl.innerText = q.question;
    
    optionsGridEl.innerHTML = '';
    q.options.forEach(opt => {
      const btn = document.createElement('div');
      btn.className = 'option-card';
      if(answers[q.id] === opt) btn.classList.add('selected');
      
      btn.innerText = opt;
      btn.onclick = () => {
        document.querySelectorAll('.option-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        answers[q.id] = opt;
      };
      optionsGridEl.appendChild(btn);
    });
    updateProgress();
  }

  document.getElementById('nextMcqBtn').addEventListener('click', () => {
    if (currentQuestionIndex < 44) {
      loadMcq(currentQuestionIndex + 1);
    } else {
      // Transition to DSA Phase
      isDsaPhase = true;
      document.getElementById('mcqArea').classList.remove('active');
      document.getElementById('dsaArea').classList.add('active');
      loadDsa(0);
    }
  });

  document.getElementById('prevMcqBtn').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      loadMcq(currentQuestionIndex - 1);
    }
  });

  function loadDsa(index) {
    dsaIndex = index;
    const q = mockDSA[index];
    document.getElementById('dsaNum').innerText = index + 1;
    document.getElementById('dsaTitle').innerText = q.title;
    document.getElementById('dsaDesc').innerHTML = q.description;
    
    if (editor) {
      editor.setValue(q.template);
    }
    updateProgress();
  }

  document.getElementById('prevDsaBtn').addEventListener('click', () => {
    if (dsaIndex === 1) {
      loadDsa(0);
    } else {
      isDsaPhase = false;
      document.getElementById('dsaArea').classList.remove('active');
      document.getElementById('mcqArea').classList.add('active');
      loadMcq(44);
    }
  });

  document.getElementById('nextDsaBtn').addEventListener('click', () => {
    if (dsaIndex === 0) {
      loadDsa(1);
    } else {
      alert("Assessment Submitted Successfully!");
      document.querySelector('[data-target="leaderboard"]').click();
    }
  });

  // Monaco Editor Setup
  function initMonaco() {
    window.editorInitialized = true;
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }});
    require(['vs/editor/editor.main'], function() {
      editor = monaco.editor.create(document.getElementById('monacoEditor'), {
        value: mockDSA[0].template,
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
      });
    });
  }

  // Timer Setup
  function startTimer(duration, display) {
    let timer = duration, hours, minutes, seconds;
    setInterval(function () {
        hours   = parseInt(timer / 3600, 10);
        minutes = parseInt((timer % 3600) / 60, 10);
        seconds = parseInt(timer % 60, 10);

        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = hours + ":" + minutes + ":" + seconds;

        if (--timer < 0) {
            timer = 0;
            // Handle timeout
        }
    }, 1000);
  }

  // Real-time Leaderboard Connection
  async function fetchLeaderboard() {
    try {
      const response = await fetch('http://localhost:3000/api/leaderboard');
      const data = await response.json();
      const tbody = document.getElementById('leaderboardBody');
      tbody.innerHTML = ''; // clear current

      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No candidates have completed the assessment yet.</td></tr>';
        return;
      }

      data.forEach((entry, idx) => {
        const rank = idx + 1;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="rank rank-${rank <= 3 ? rank : 'other'}">${rank}</span></td>
          <td>${entry.display_name || 'Anonymous Candidate'}</td>
          <td>${entry.total_score}</td>
          <td><span class="status-badge status-completed">Completed</span></td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    }
  }

  // Load leaderboard initially when clicking the tab
  document.querySelector('[data-target="leaderboard"]').addEventListener('click', fetchLeaderboard);

  try {
    const socket = io('http://localhost:3000'); // Assuming backend on 3000
    socket.on('leaderboard_update', (data) => {
      console.log('Leaderboard updating...', data);
      fetchLeaderboard();
    });
  } catch(e) {
    console.log('Socket not connected (expected if backend not running)');
  }

});
