/**
 * Employability Index result email.
 *
 * Built in Trafy's identity (same tokens as css/style.css): near-black surfaces,
 * violet -> blue brand gradient, the white Trafy wordmark, Bricolage Grotesque /
 * Public Sans with safe fallbacks. Email-client rules apply: table layout, inline
 * styles, bgcolor fallbacks next to every gradient, no JS, no CSS variables, and
 * dark backgrounds are set explicitly so Gmail/Outlook dark-mode inversion keeps
 * the design intact.
 */

const C = {
  page: '#07070b',
  card: '#0f0f16',
  panel: '#161621',
  line: '#26263a',
  text: '#f2f2f7',
  dim: '#a8aabf',
  faint: '#71738b',
  violet: '#6C5CE7',
  violetLight: '#8B7CFF',
  blue: '#4F8CFF',
  green: '#2FC28C',
  gold: '#E3B94E',
  orange: '#F5A623',
  red: '#EF6A6A',
};

const HEAD = "'Bricolage Grotesque','Trebuchet MS',Helvetica,Arial,sans-serif";
const BODY = "'Public Sans',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

const TRACK_LABELS = {
  'core-cs': 'Core CS',
  cpp: 'C++',
  java: 'Java',
  python: 'Python',
  webdev: 'Web Development',
  aiml: 'AI / ML',
  aptitude: 'Aptitude & Reasoning',
};

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

/** Employability Index bands, keyed off the overall percentage. */
function band(percent) {
  if (percent >= 85) {
    return {
      label: 'Industry Ready',
      color: C.green,
      summary:
        'You performed at a level that matches what teams expect from engineers who ship on day one. Strong fundamentals and problem-solving across the board.',
    };
  }
  if (percent >= 70) {
    return {
      label: 'Job Ready',
      color: C.blue,
      summary:
        'You have solid fundamentals and can contribute to a real team with light onboarding. Sharpening your weaker areas will move you into the top band.',
    };
  }
  if (percent >= 50) {
    return {
      label: 'Developing',
      color: C.gold,
      summary:
        'You have a working base and clear room to grow. Focused practice on the areas below will lift your Index quickly.',
    };
  }
  return {
    label: 'Foundation Building',
    color: C.orange,
    summary:
      'This attempt shows where to start. Build core concepts first, then practise with real problems. Every attempt, and Trafy Cohort \'26, is designed to get you there.',
  };
}

const barColor = (p) => (p >= 70 ? C.green : p >= 50 ? C.gold : C.orange);

function bar(percent, color) {
  const filled = Math.max(2, Math.min(100, percent));
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        <td width="${filled}%" height="8" bgcolor="${color}" style="background-color:${color};border-radius:4px;font-size:0;line-height:0;">&nbsp;</td>
        <td width="${100 - filled}%" height="8" bgcolor="${C.line}" style="background-color:${C.line};font-size:0;line-height:0;">&nbsp;</td>
      </tr>
    </table>`;
}

function stat(label, value, sub) {
  return `
    <td width="33%" valign="top" style="padding:0 6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}" style="background-color:${C.panel};border:1px solid ${C.line};border-radius:12px;">
        <tr><td style="padding:14px 14px 12px;">
          <div style="font-family:${BODY};font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:${C.faint};">${esc(label)}</div>
          <div style="font-family:${HEAD};font-size:22px;font-weight:800;color:${C.text};padding-top:4px;">${value}</div>
          <div style="font-family:${BODY};font-size:12px;color:${C.dim};padding-top:2px;">${esc(sub)}</div>
        </td></tr>
      </table>
    </td>`;
}

/**
 * @param {object} d
 * @param {string} d.name
 * @param {string} d.assessmentTitle
 * @param {number} d.totalScore
 * @param {number} d.maxScore
 * @param {number} d.mcqScore
 * @param {number} d.dsaScore
 * @param {number} d.correctCount
 * @param {number} d.mcqTotal
 * @param {Array}  d.dsaDetail   [{title, passed, total, points, status, reason}]
 * @param {object} d.skills      { track: {correct, total} }
 * @param {string} d.dsaStatus   'scored' | 'unavailable' | 'not_run'
 * @param {number} d.attemptNumber
 * @param {number} d.maxAttempts
 * @param {string} d.submittedAt ISO string
 * @param {object} d.urls        { site, app, logo }
 */
function buildResultEmail(d) {
  const overall = pct(d.totalScore, d.maxScore);
  const codingUnavailable = d.dsaStatus === 'unavailable';
  const b = band(overall);
  const first = String(d.name || 'there').trim().split(/\s+/)[0] || 'there';

  const skillRows = Object.entries(d.skills || {})
    .filter(([, v]) => v.total > 0)
    .map(([track, v]) => ({ track, label: TRACK_LABELS[track] || track, ...v, p: pct(v.correct, v.total) }))
    .sort((x, y) => y.p - x.p || x.label.localeCompare(y.label));

  const weakest = [...skillRows].sort((x, y) => x.p - y.p).filter((s) => s.p < 70).slice(0, 2);
  const strongest = skillRows.filter((s) => s.p >= 70).slice(0, 2);

  const when = new Date(d.submittedAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });

  const skillsHtml = skillRows
    .map(
      (s) => `
      <tr><td style="padding:0 0 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-family:${BODY};font-size:14px;font-weight:600;color:${C.text};">${esc(s.label)}</td>
          <td align="right" style="font-family:${BODY};font-size:13px;color:${C.dim};">${s.correct}/${s.total} &nbsp;<span style="color:${barColor(s.p)};font-weight:700;">${s.p}%</span></td>
        </tr></table>
        <div style="padding-top:6px;">${bar(s.p, barColor(s.p))}</div>
      </td></tr>`
    )
    .join('');

  const codingHtml = (d.dsaDetail || [])
    .map((q) => {
      const ok = q.total > 0 && q.passed === q.total;
      const chipColor = q.status === 'unavailable' ? C.faint : ok ? C.green : q.passed > 0 ? C.gold : C.orange;
      const chipText = q.status === 'unavailable' ? 'Not evaluated' : `${q.passed}/${q.total} tests passed`;
      return `
      <tr><td style="padding:0 0 10px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}" style="background-color:${C.panel};border:1px solid ${C.line};border-radius:12px;">
          <tr>
            <td style="padding:14px 16px;font-family:${BODY};font-size:14px;font-weight:600;color:${C.text};">${esc(q.title)}</td>
            <td align="right" style="padding:14px 16px;white-space:nowrap;">
              <span style="font-family:${BODY};font-size:12px;font-weight:700;color:${chipColor};">${esc(chipText)}</span>
              <span style="font-family:${BODY};font-size:12px;color:${C.faint};"> &nbsp;&middot;&nbsp; ${q.points} pts</span>
            </td>
          </tr>
        </table>
      </td></tr>`;
    })
    .join('');

  const focusHtml = weakest.length
    ? `<p style="margin:0 0 10px;font-family:${BODY};font-size:14px;line-height:1.6;color:${C.dim};"><strong style="color:${C.text};">Focus next:</strong> ${weakest.map((s) => esc(s.label)).join(' and ')}. Revisit the fundamentals there and practise timed questions.</p>`
    : '';
  const strengthHtml = strongest.length
    ? `<p style="margin:0;font-family:${BODY};font-size:14px;line-height:1.6;color:${C.dim};"><strong style="color:${C.text};">Your strengths:</strong> ${strongest.map((s) => esc(s.label)).join(' and ')}.</p>`
    : '';

  const codingNote = codingUnavailable
    ? `<tr><td style="padding:0 0 14px;font-family:${BODY};font-size:13px;line-height:1.6;color:${C.gold};">Our code runner was unavailable when this attempt was scored, so the coding section is not reflected in your score. Your multiple-choice result is complete.</td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Your Employability Index result</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Public+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @media (max-width:620px){
    .container{width:100%!important}
    .px{padding-left:20px!important;padding-right:20px!important}
    .stack td{display:block!important;width:100%!important;padding:0 0 10px!important}
    .score{font-size:64px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.page};" bgcolor="${C.page}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};">Your Employability Index: ${overall}/100 &middot; ${esc(b.label)}. See your skill breakdown and what to work on next.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background-color:${C.page};">
<tr><td align="center" style="padding:28px 12px;">

  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="width:600px;max-width:600px;background-color:${C.card};border:1px solid ${C.line};border-radius:20px;overflow:hidden;">

    <!-- header -->
    <tr><td class="px" style="padding:26px 36px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="left"><a href="${esc(d.urls.site)}" style="text-decoration:none;"><img src="${esc(d.urls.logo)}" alt="Trafy" height="30" style="display:block;height:30px;width:auto;border:0;font-family:${HEAD};font-size:22px;font-weight:800;color:${C.text};"></a></td>
        <td align="right" style="font-family:${BODY};font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:${C.violetLight};">Employability Index</td>
      </tr></table>
    </td></tr>

    <!-- hero -->
    <tr><td bgcolor="${C.violet}" style="background-color:${C.violet};background-image:linear-gradient(135deg,${C.violet} 0%,${C.blue} 100%);">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="px" align="center" style="padding:38px 36px 36px;">
        <div style="font-family:${BODY};font-size:13px;color:rgba(255,255,255,.85);">Hi ${esc(first)}, here is your result</div>
        <div class="score" style="font-family:${HEAD};font-size:84px;line-height:1;font-weight:800;letter-spacing:-.03em;color:#ffffff;padding:14px 0 4px;">${overall}<span style="font-size:28px;font-weight:700;color:rgba(255,255,255,.75);">/100</span></div>
        <div style="padding-top:10px;"><span style="display:inline-block;background-color:${C.card};border-radius:999px;padding:8px 18px;font-family:${BODY};font-size:13px;font-weight:700;color:${b.color};">&#9679;&nbsp; ${esc(b.label)}</span></div>
        <div style="font-family:${BODY};font-size:12px;color:rgba(255,255,255,.8);padding-top:14px;">${esc(d.assessmentTitle)} &middot; ${esc(when)}</div>
      </td></tr></table>
    </td></tr>

    <!-- summary -->
    <tr><td class="px" style="padding:30px 36px 6px;">
      <p style="margin:0;font-family:${BODY};font-size:15px;line-height:1.7;color:${C.dim};">${esc(b.summary)}</p>
    </td></tr>

    <!-- stats -->
    <tr><td class="px" style="padding:20px 30px 8px;">
      <table role="presentation" class="stack" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        ${stat('Total score', `${d.totalScore}<span style="font-size:14px;color:${C.faint};font-weight:600;"> / ${d.maxScore}</span>`, `Attempt ${d.attemptNumber} of ${d.maxAttempts}`)}
        ${stat('MCQ', `${d.correctCount}<span style="font-size:14px;color:${C.faint};font-weight:600;"> / ${d.mcqTotal}</span>`, `${d.mcqScore} points`)}
        ${stat('Coding', codingUnavailable ? '&mdash;' : `${d.dsaScore}<span style="font-size:14px;color:${C.faint};font-weight:600;"> pts</span>`, `${(d.dsaDetail || []).length} challenge${(d.dsaDetail || []).length === 1 ? '' : 's'}`)}
      </tr></table>
    </td></tr>

    <!-- skills -->
    ${skillRows.length ? `
    <tr><td class="px" style="padding:28px 36px 6px;">
      <div style="font-family:${HEAD};font-size:18px;font-weight:800;color:${C.text};padding-bottom:16px;">Skill breakdown</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${skillsHtml}</table>
    </td></tr>` : ''}

    <!-- coding -->
    ${codingHtml ? `
    <tr><td class="px" style="padding:18px 36px 6px;">
      <div style="font-family:${HEAD};font-size:18px;font-weight:800;color:${C.text};padding-bottom:14px;">Coding challenges</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${codingNote}${codingHtml}</table>
    </td></tr>` : ''}

    <!-- guidance -->
    ${focusHtml || strengthHtml ? `
    <tr><td class="px" style="padding:18px 36px 6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}" style="background-color:${C.panel};border:1px solid ${C.line};border-left:3px solid ${C.violetLight};border-radius:12px;">
        <tr><td style="padding:16px 18px;">${focusHtml}${strengthHtml}</td></tr>
      </table>
    </td></tr>` : ''}

    <!-- CTA -->
    <tr><td class="px" align="center" style="padding:32px 36px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="${C.violet}" style="background-color:${C.violet};background-image:linear-gradient(135deg,${C.violet} 0%,${C.blue} 100%);border-radius:999px;">
          <a href="${esc(d.urls.app)}/results" style="display:inline-block;padding:14px 30px;font-family:${BODY};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">View detailed results &rarr;</a>
        </td>
      </tr></table>
      <p style="margin:16px 0 0;font-family:${BODY};font-size:13px;line-height:1.6;color:${C.faint};">Want to improve it? You can retake the assessment while you have attempts left. Your best result counts.</p>
    </td></tr>

    <tr><td class="px" style="padding:22px 36px 0;"><div style="height:1px;background-color:${C.line};line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

    <!-- cohort -->
    <tr><td class="px" style="padding:22px 36px 26px;">
      <div style="font-family:${HEAD};font-size:16px;font-weight:800;color:${C.text};">Ready to build a real product?</div>
      <p style="margin:8px 0 0;font-family:${BODY};font-size:14px;line-height:1.65;color:${C.dim};">Trafy Cohort &rsquo;26 is a 6-month, builder-led program: ship an AI SaaS product with founders, then pitch for funding or a job offer. <a href="${esc(d.urls.site)}/#apply" style="color:${C.violetLight};text-decoration:underline;">Apply to Cohort &rsquo;26</a>.</p>
    </td></tr>

    <!-- footer -->
    <tr><td class="px" bgcolor="#050508" style="background-color:#050508;padding:24px 36px;border-top:1px solid ${C.line};">
      <div style="font-family:${BODY};font-size:11px;letter-spacing:.14em;color:${C.faint};font-weight:700;">LEARN. BUILD. LAUNCH.</div>
      <p style="margin:10px 0 0;font-family:${BODY};font-size:12px;line-height:1.7;color:${C.faint};">You are receiving this because you completed the ${esc(d.assessmentTitle)} on trafy.ai. Questions about your result? Write to <a href="mailto:aaru@trafy.ai" style="color:${C.dim};text-decoration:underline;">aaru@trafy.ai</a>.</p>
      <p style="margin:10px 0 0;font-family:${BODY};font-size:12px;color:${C.faint};">
        <a href="${esc(d.urls.site)}/privacy" style="color:${C.dim};text-decoration:underline;">Privacy Policy</a> &nbsp;&middot;&nbsp;
        <a href="${esc(d.urls.site)}/terms" style="color:${C.dim};text-decoration:underline;">Terms of Service</a> &nbsp;&middot;&nbsp; &copy; ${new Date().getFullYear()} Trafy
      </p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `Hi ${first}, here is your Employability Index result.`,
    '',
    `Index: ${overall}/100 (${b.label})`,
    `${d.assessmentTitle} - ${when}`,
    `Total score: ${d.totalScore}/${d.maxScore} | MCQ: ${d.correctCount}/${d.mcqTotal} correct (${d.mcqScore} pts) | Coding: ${codingUnavailable ? 'not evaluated' : `${d.dsaScore} pts`}`,
    `Attempt ${d.attemptNumber} of ${d.maxAttempts}`,
    '',
    b.summary,
    '',
    'Skill breakdown:',
    ...skillRows.map((s) => `  ${s.label}: ${s.correct}/${s.total} (${s.p}%)`),
    '',
    ...(codingUnavailable ? ['Our code runner was unavailable when this was scored, so coding is not reflected.', ''] : []),
    'Coding challenges:',
    ...(d.dsaDetail || []).map((q) => `  ${q.title}: ${q.status === 'unavailable' ? 'not evaluated' : `${q.passed}/${q.total} tests, ${q.points} pts`}`),
    '',
    ...(weakest.length ? [`Focus next: ${weakest.map((s) => s.label).join(' and ')}.`] : []),
    `Detailed results: ${d.urls.app}/results`,
    `Apply to Cohort '26: ${d.urls.site}/#apply`,
    '',
    'Questions? aaru@trafy.ai',
    `Privacy: ${d.urls.site}/privacy | Terms: ${d.urls.site}/terms`,
  ].join('\n');

  return { subject: `Your Employability Index: ${overall}/100 (${b.label})`, html, text };
}

module.exports = { buildResultEmail, band, TRACK_LABELS };
