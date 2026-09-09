import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw, Save, Puzzle } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// True statements about how the assessment actually works (autosave, partial
// credit, per-attempt question shuffling, best-of-N scoring) rather than
// generic filler copy — matches what Results/take-assessment.html already say.
const TIPS = [
  { icon: RefreshCw, text: "Only your best of 3 attempts counts — a lower score never hurts you." },
  { icon: Save, text: 'Every answer autosaves as you go, so a dropped connection never costs you the attempt.' },
  { icon: Puzzle, text: 'DSA problems are scored on real test cases with partial credit — a working-but-incomplete solution still earns points.' },
  { icon: Sparkles, text: 'Each attempt draws a fresh, individually-pinned set of questions, so retakes are never identical.' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { displayName } = useAuth();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [attemptRes, resultsRes] = await Promise.all([
          api.get('/api/assessment/attempt'),
          api.get('/api/assessment/results'),
        ]);
        if (cancelled) return;
        const attempts = resultsRes.data.attempts || [];
        const best = attempts
          .filter((a) => a.status !== 'in_progress')
          .reduce((b, a) => (!b || a.totalScore > b.totalScore ? a : b), null);
        setSummary({
          inProgress: Boolean(attemptRes.data.attempt),
          attemptsUsed: resultsRes.data.attemptsUsed,
          maxAttempts: resultsRes.data.maxAttempts,
          best,
        });
      } catch {
        if (!cancelled) setSummary({ error: true });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const status = !summary
    ? 'Loading…'
    : summary.error
      ? 'Unavailable'
      : summary.inProgress
        ? 'In progress'
        : summary.best
          ? 'Completed'
          : 'Not started';

  const exhausted = summary && !summary.error && summary.attemptsUsed >= summary.maxAttempts && !summary.inProgress;

  return (
    <section className="dashboard-section active">
      <header className="section-header">
        <h1>Welcome, {displayName.split(' ')[0]}</h1>
        <p>Complete your assessment to rank on the leaderboard.</p>
      </header>

      <div className="dashboard-grid">
        <div className="bento-wrap assessment-bento">
          <div className="bento">
            <div className="bento__cell">
              <span className="bento__label">Status</span>
              <span className="bento__value" style={{ color: '#4F8CFF' }}>{status}</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Questions</span>
              <span className="bento__value">45 MCQ + 2 DSA</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Time limit</span>
              <span className="bento__value">90 mins</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Attempts</span>
              <span className="bento__value">
                {summary && !summary.error ? `${summary.attemptsUsed} / ${summary.maxAttempts}` : '—'}
              </span>
            </div>
          </div>

          {summary?.best && (
            <p className="assessment-note mt-4">
              Your best score so far: <strong>{summary.best.totalScore} / {summary.best.maxScore}</strong>
            </p>
          )}

          {exhausted ? (
            <button className="btn btn--ghost btn--lg mt-4" onClick={() => navigate('/results')}>
              View my results
            </button>
          ) : (
            <button className="btn btn--primary btn--lg mt-4" onClick={() => navigate('/assessment')}>
              {summary?.inProgress ? 'Resume assessment' : 'Start assessment'}
            </button>
          )}
        </div>

        <aside className="dashboard-siderail">
          <div className="rail-hero">
            <div className="rail-hero__glow" />
            <img src="/favicon.svg" alt="" className="rail-hero__mark" aria-hidden="true" />
            <p className="rail-hero__tag">Prove what you can build,<br />not just what you've memorised.</p>
          </div>

          <div className="rail-card">
            <span className="rail-card__title">Before you start</span>
            <ul className="rail-tips">
              {TIPS.map(({ icon: Icon, text }, i) => (
                <li key={i} className="rail-tips__item">
                  <Icon size={16} />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
