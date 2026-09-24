/**
 * Renders the Employability Index result email with sample data.
 *   node scripts/preview-email.js            -> tmp/email-preview.html
 *   node scripts/preview-email.js --send you@example.com   (needs RESEND_API_KEY)
 */
const fs = require('fs');
const path = require('path');

const sample = {
  to: process.argv.includes('--send') ? process.argv[process.argv.indexOf('--send') + 1] : 'candidate@example.com',
  name: 'Aarav Sharma',
  assessmentTitle: 'Employability Index Assessment',
  totalScore: 372,
  maxScore: 550,
  mcqScore: 290,
  dsaScore: 82,
  correctCount: 29,
  mcqTotal: 45,
  dsaStatus: 'scored',
  dsaDetail: [
    { title: 'Valid Parentheses', passed: 9, total: 9, points: 50, status: 'scored' },
    { title: 'Coin Change', passed: 4, total: 7, points: 32, status: 'scored' },
  ],
  skills: {
    'core-cs': { correct: 6, total: 7 },
    cpp: { correct: 4, total: 6 },
    java: { correct: 5, total: 6 },
    python: { correct: 6, total: 6 },
    webdev: { correct: 3, total: 6 },
    aiml: { correct: 2, total: 7 },
    aptitude: { correct: 3, total: 7 },
  },
  attemptNumber: 1,
  maxAttempts: 3,
  submittedAt: new Date().toISOString(),
};

(async () => {
  if (process.argv.includes('--send')) {
    const { sendResultEmail } = require('../services/email');
    console.log(await sendResultEmail(sample));
    return;
  }
  // Avoid requiring real Supabase config just to preview a template.
  const { buildResultEmail } = require('../emails/resultEmail');
  const site = process.env.SITE_URL || 'https://www.trafy.ai';
  const out = buildResultEmail({ ...sample, urls: { site, app: 'https://app.trafy.ai', logo: `${site}/assets/img/trafy-logo.png` } });
  const dir = path.resolve(__dirname, '../tmp');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'email-preview.html'), out.html);
  fs.writeFileSync(path.join(dir, 'email-preview.txt'), out.text);
  console.log('subject:', out.subject);
  console.log('wrote tmp/email-preview.html and tmp/email-preview.txt');
})();
