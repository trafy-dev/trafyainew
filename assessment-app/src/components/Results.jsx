import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, apiError } from '../lib/api';

const pct = (score, max) => (max > 0 ? Math.round((score / max) * 100) : 0);

export default function Results() {
  const navigate = useNavigate();
  const location = useLocation();
  const justSubmitted = location.state?.justSubmitted || null;
  const timedOut = location.state?.reason === 'timeout';

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/assessment/results');
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(apiError(err).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="loader" />;

  const attempts = data?.attempts || [];
  const scored = attempts.filter((a) => a.status !== 'in_progress');
  const best = scored.reduce((b, a) => (!b || a.totalScore > b.totalScore ? a : b), null);
  const dsaUnavailable = scored.some((a) => a.dsaStatus === 'unavailable');

  return (
    <section className="dashboard-section active">
      <header className="section-header">
        <h1>Your results</h1>
        <p>
          {data ? `${data.attemptsUsed} of ${data.maxAttempts} attempts used — your best score counts.` : ''}
        </p>
      </header>

      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      {justSubmitted && (
        <div className="result-hero">
          <span className="result-hero__label">
            {timedOut ? 'Time expired — submitted automatically' : 'Submitted'}
          </span>
          <div className="result-hero__score">
            {justSubmitted.totalScore}
            <span> / {justSubmitted.maxScore}</span>
          </div>
          <div className="result-hero__meta">
            {justSubmitted.correctCount} MCQs correct ({justSubmitted.mcqScore} pts) ·
            DSA {justSubmitted.dsaScore} pts ·
            {' '}{pct(justSubmitted.totalScore, justSubmitted.maxScore)}%
          </div>
          {justSubmitted.dsaStatus === 'unavailable' && (
            <div className="auth-alert auth-alert--warn" style={{ marginTop: 16 }}>
              Your DSA code could not be executed, so it scored 0. This is a platform
              configuration issue, not a reflection of your solution — please contact us.
            </div>
          )}
        </div>
      )}

      {best && !justSubmitted && (
        <div className="bento-wrap">
          <div className="bento">
            <div className="bento__cell">
              <span className="bento__label">Best score</span>
              <span className="bento__value">{best.totalScore} / {best.maxScore}</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Percentage</span>
              <span className="bento__value">{pct(best.totalScore, best.maxScore)}%</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Attempts left</span>
              <span className="bento__value">{Math.max(0, (data?.maxAttempts || 0) - (data?.attemptsUsed || 0))}</span>
            </div>
          </div>
        </div>
      )}

      {dsaUnavailable && !justSubmitted && (
        <div className="auth-alert auth-alert--warn">
          Code execution was unavailable for one or more attempts, so DSA questions scored 0.
        </div>
      )}

      <div className="leaderboard-table-wrapper mt-4">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Attempt</th>
              <th>Date</th>
              <th>MCQ</th>
              <th>DSA</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attempts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>
                  You have not taken the assessment yet.
                </td>
              </tr>
            ) : (
              attempts.map((a) => {
                const percentage = pct(a.totalScore, a.maxScore);
                const passed = percentage >= 60;
                return (
                  <tr key={a.id}>
                    <td>#{a.attemptNumber}</td>
                    <td>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '—'}</td>
                    <td>{a.mcqScore} <span className="muted">({a.correctCount} correct)</span></td>
                    <td>
                      {a.dsaScore}
                      {a.dsaStatus === 'unavailable' && <span className="muted"> (not run)</span>}
                    </td>
                    <td><strong>{a.totalScore} / {a.maxScore}</strong> <span className="muted">{percentage}%</span></td>
                    <td>
                      {a.status === 'in_progress' ? (
                        <span className="status-badge">In progress</span>
                      ) : (
                        <span
                          className={`status-badge ${passed ? 'status-completed' : ''}`}
                          style={passed ? {} : { background: 'rgba(255,99,132,0.1)', color: '#FF6384' }}
                        >
                          {passed ? 'Passed' : 'Needs review'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && data.attemptsUsed < data.maxAttempts && (
        <button className="btn btn--primary btn--lg mt-4" onClick={() => navigate('/assessment')}>
          Take attempt {data.attemptsUsed + 1} of {data.maxAttempts}
        </button>
      )}
    </section>
  );
}
