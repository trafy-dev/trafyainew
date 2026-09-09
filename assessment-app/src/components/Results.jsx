import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { api, apiError } from '../lib/api';

// Brand colors, so the celebration matches the rest of the app instead of
// looking like a generic confetti plugin default.
const CONFETTI_COLORS = ['#6C5CE7', '#8B7CFF', '#4F8CFF', '#2FC28C', '#FFD166'];

function celebrate() {
  const duration = 1800;
  const end = Date.now() + duration;
  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 60, origin: { x: 0 }, colors: CONFETTI_COLORS });
    confetti({ particleCount: 3, angle: 120, spread: 60, origin: { x: 1 }, colors: CONFETTI_COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 90, spread: 100, origin: { y: 0.6 }, colors: CONFETTI_COLORS });
}

const pct = (score, max) => (max > 0 ? Math.round((score / max) * 100) : 0);

export default function Results() {
  const navigate = useNavigate();
  const location = useLocation();
  const justSubmitted = location.state?.justSubmitted || null;
  const timedOut = location.state?.reason === 'timeout';

  // justSubmitted carries no slug today — it always comes from Master or a
  // track attempt's own submit redirect, and both show the same hero shape,
  // so it's rendered once at the top regardless of which assessment it's for.
  const [sections, setSections] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: listData } = await api.get('/api/assessment/list');
        const results = await Promise.all(
          listData.assessments.map((a) =>
            api.get(`/api/assessment/results?slug=${encodeURIComponent(a.slug)}`).then((r) => ({ assessment: a, ...r.data }))
          )
        );
        if (cancelled) return;
        setSections(results.filter((s) => (s.attempts || []).length > 0));
      } catch (err) {
        if (!cancelled) setError(apiError(err).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Celebrate right after finishing a test — once, not on every later visit
  // to this page (justSubmitted only exists in nav state from the submit redirect).
  useEffect(() => {
    if (justSubmitted) celebrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="loader" />;

  return (
    <section className="dashboard-section active">
      <header className="section-header">
        <h1>Your results</h1>
        <p>One section per assessment you've attempted at least once.</p>
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
            {justSubmitted.correctCount} MCQs correct ({justSubmitted.mcqScore} pts)
            {justSubmitted.dsaScore > 0 && <> · DSA {justSubmitted.dsaScore} pts</>} ·
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

      {sections && sections.length === 0 && (
        <p className="assessment-note">You have not taken any assessment yet.</p>
      )}

      {(sections || []).map((section) => {
        const attempts = section.attempts || [];
        const scored = attempts.filter((a) => a.status !== 'in_progress');
        const best = scored.reduce((b, a) => (!b || a.totalScore > b.totalScore ? a : b), null);
        const dsaUnavailable = scored.some((a) => a.dsaStatus === 'unavailable');

        return (
          <div key={section.assessment.slug} className="results-section mt-4">
            <h2 className="results-section__title">{section.assessment.title}</h2>

            {best && (
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
                    <span className="bento__value">{Math.max(0, section.maxAttempts - section.attemptsUsed)}</span>
                  </div>
                </div>
              </div>
            )}

            {dsaUnavailable && (
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
                    {section.assessment.dsaCount > 0 && <th>DSA</th>}
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => {
                    const percentage = pct(a.totalScore, a.maxScore);
                    const passed = percentage >= 60;
                    return (
                      <tr key={a.id}>
                        <td>#{a.attemptNumber}</td>
                        <td>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '—'}</td>
                        <td>{a.mcqScore} <span className="muted">({a.correctCount} correct)</span></td>
                        {section.assessment.dsaCount > 0 && (
                          <td>
                            {a.dsaScore}
                            {a.dsaStatus === 'unavailable' && <span className="muted"> (not run)</span>}
                          </td>
                        )}
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
                  })}
                </tbody>
              </table>
            </div>

            {section.attemptsUsed < section.maxAttempts && (
              <button
                className="btn btn--ghost btn--md mt-4"
                onClick={() => navigate(`/assessment/${section.assessment.slug}`)}
              >
                Take attempt {section.attemptsUsed + 1} of {section.maxAttempts}
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
