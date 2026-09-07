import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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
    </section>
  );
}
