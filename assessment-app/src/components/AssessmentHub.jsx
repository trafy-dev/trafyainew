import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiError } from '../lib/api';

export default function AssessmentHub() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState(null);
  const [statusBySlug, setStatusBySlug] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/assessment/list');
        if (cancelled) return;
        setAssessments(data.assessments);

        const statuses = await Promise.all(
          data.assessments.map((a) =>
            api.get(`/api/assessment/attempt?slug=${encodeURIComponent(a.slug)}`).then((r) => [a.slug, r.data])
          )
        );
        if (cancelled) return;
        setStatusBySlug(Object.fromEntries(statuses));
      } catch (err) {
        if (!cancelled) setError(apiError(err).message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) return <div className="auth-alert auth-alert--error">{error}</div>;
  if (!assessments) return <div className="loader" />;

  const master = assessments.find((a) => !a.isTrack);
  const tracks = assessments.filter((a) => a.isTrack);

  const renderCard = (a) => {
    const status = statusBySlug[a.slug];
    const inProgress = Boolean(status?.attempt);
    const attemptsUsed = status?.attemptsUsed ?? 0;
    const exhausted = status ? !status.canStart && !inProgress : false;

    return (
      <div className="assessment-card" key={a.slug}>
        <h3>{a.title}</h3>
        <p className="assessment-card__desc">{a.description}</p>
        <div className="assessment-card__meta">
          <span>{a.mcqCount} MCQ{a.dsaCount > 0 ? ` + ${a.dsaCount} DSA` : ''}</span>
          <span>{a.durationMinutes} mins</span>
          <span>{attemptsUsed} / {a.maxAttempts} attempts</span>
        </div>
        <button
          className="btn btn--primary btn--md"
          onClick={() => navigate(`/assessment/${a.slug}`)}
          disabled={exhausted}
        >
          {exhausted ? 'Attempts used' : inProgress ? 'Resume' : 'Start'}
        </button>
      </div>
    );
  };

  return (
    <section className="dashboard-section active">
      <header className="section-header">
        <h1>Assessments</h1>
        <p>The Master Assessment counts toward the leaderboard. Track assessments are self-practice.</p>
      </header>

      {master && (
        <div className="assessment-hub-grid assessment-hub-grid--single mt-4">
          {renderCard(master)}
        </div>
      )}

      <h2 className="assessment-hub-subheading mt-4">Track assessments</h2>
      <div className="assessment-hub-grid">
        {tracks.map(renderCard)}
      </div>
    </section>
  );
}
