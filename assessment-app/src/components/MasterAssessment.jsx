import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { api, apiError } from '../lib/api';

const AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * The assessment is now server-driven:
 *  - the server picks and pins this candidate's question set
 *  - questions arrive WITHOUT correct answers, so the client cannot score
 *  - answers autosave, so a closed tab loses nothing
 *  - expiry is decided by the server clock; the on-screen timer is display only
 */
export default function MasterAssessment() {
  const navigate = useNavigate();

  const [state, setState] = useState({ phase: 'loading', error: null, gate: null });
  const [attempt, setAttempt] = useState(null);
  const [mcqs, setMcqs] = useState([]);
  const [dsa, setDsa] = useState([]);

  const [answers, setAnswers] = useState({});
  const [dsaCode, setDsaCode] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [index, setIndex] = useState(0);
  const [isDsaPhase, setIsDsaPhase] = useState(false);
  const [dsaIndex, setDsaIndex] = useState(0);
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [isGridOpen, setIsGridOpen] = useState(true);
  const [saveState, setSaveState] = useState('idle');
  const [submitting, setSubmitting] = useState(false);

  // Refs keep the latest values reachable from timers without stale closures —
  // the previous implementation auto-submitted an empty paper on timeout
  // because its interval captured the first render's empty state.
  const answersRef = useRef(answers);
  const dsaCodeRef = useRef(dsaCode);
  const attemptRef = useRef(attempt);
  const submittingRef = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { dsaCodeRef.current = dsaCode; }, [dsaCode]);
  useEffect(() => { attemptRef.current = attempt; }, [attempt]);

  const applyPayload = useCallback((payload) => {
    setAttempt(payload.attempt);
    setMcqs(payload.mcqs || []);
    setDsa(payload.dsa || []);
    setAnswers(payload.attempt.answers || {});

    const seededCode = { ...(payload.attempt.dsaCode || {}) };
    (payload.dsa || []).forEach((q) => {
      if (seededCode[q.id] === undefined) seededCode[q.id] = q.template || '';
    });
    setDsaCode(seededCode);
    setSecondsLeft(payload.attempt.secondsRemaining);
    setState({ phase: 'active', error: null, gate: null });
  }, []);

  // Load an in-progress attempt, or show the start gate.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/assessment/attempt');
        if (cancelled) return;
        if (data.attempt) applyPayload(data);
        else setState({ phase: 'gate', error: null, gate: data });
      } catch (err) {
        if (!cancelled) setState({ phase: 'error', error: apiError(err).message, gate: null });
      }
    })();
    return () => { cancelled = true; };
  }, [applyPayload]);

  const submit = useCallback(
    async (reason = 'manual') => {
      const current = attemptRef.current;
      if (!current || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);

      try {
        // Flush any pending edits before scoring.
        if (saveTimer.current) clearTimeout(saveTimer.current);
        await api
          .patch(`/api/assessment/attempt/${current.id}`, {
            answers: answersRef.current,
            dsaCode: dsaCodeRef.current,
          })
          .catch(() => {});

        const { data } = await api.post(`/api/assessment/attempt/${current.id}/submit`);
        navigate('/results', { state: { justSubmitted: data, reason } });
      } catch (err) {
        const info = apiError(err);
        // Already submitted (e.g. the server expired it first) is not a failure.
        if (info.status === 409) {
          navigate('/results');
          return;
        }
        submittingRef.current = false;
        setSubmitting(false);
        setState((s) => ({ ...s, error: info.message }));
      }
    },
    [navigate]
  );

  // Display countdown. The server decides the real deadline.
  useEffect(() => {
    if (state.phase !== 'active') return undefined;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          submit('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.phase, submit]);

  const queueSave = useCallback((nextAnswers, nextCode) => {
    const current = attemptRef.current;
    if (!current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(async () => {
      try {
        await api.patch(`/api/assessment/attempt/${current.id}`, {
          answers: nextAnswers,
          dsaCode: nextCode,
        });
        setSaveState('saved');
      } catch (err) {
        const info = apiError(err);
        if (info.status === 409) {
          navigate('/results');
          return;
        }
        setSaveState('error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [navigate]);

  const startAttempt = async () => {
    setState((s) => ({ ...s, phase: 'loading' }));
    try {
      const { data } = await api.post('/api/assessment/attempt');
      applyPayload(data);
    } catch (err) {
      const info = apiError(err);
      setState({ phase: 'gate', error: info.message, gate: state.gate });
    }
  };

  const chooseOption = (questionId, optionIndex) => {
    const next = { ...answers, [questionId]: optionIndex };
    setAnswers(next);
    queueSave(next, dsaCodeRef.current);
  };

  const editCode = (questionId, value) => {
    const next = { ...dsaCode, [questionId]: value ?? '' };
    setDsaCode(next);
    queueSave(answersRef.current, next);
  };

  const toggleReview = (key) => {
    const next = new Set(markedForReview);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setMarkedForReview(next);
  };

  const formatTime = (total) => {
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // ---------- non-active states ----------

  if (state.phase === 'loading') return <div className="loader" />;

  if (state.phase === 'error') {
    return (
      <section className="dashboard-section active">
        <header className="section-header"><h1>Assessment</h1></header>
        <div className="auth-alert auth-alert--error">{state.error}</div>
        <button className="btn btn--primary mt-4" onClick={() => window.location.reload()}>Retry</button>
      </section>
    );
  }

  if (state.phase === 'gate') {
    const g = state.gate || {};
    const exhausted = g.canStart === false;
    return (
      <section className="dashboard-section active">
        <header className="section-header">
          <h1>Master Assessment</h1>
          <p>45 multiple-choice questions and 2 DSA challenges, in 90 minutes.</p>
        </header>
        <div className="bento-wrap assessment-bento">
          <div className="bento">
            <div className="bento__cell">
              <span className="bento__label">Attempts used</span>
              <span className="bento__value">{g.attemptsUsed ?? 0} / {g.maxAttempts ?? 3}</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Questions</span>
              <span className="bento__value">45 MCQ + 2 DSA</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Time limit</span>
              <span className="bento__value">90 mins</span>
            </div>
          </div>

          {state.error && <div className="auth-alert auth-alert--error mt-4">{state.error}</div>}

          {exhausted ? (
            <>
              <div className="auth-alert auth-alert--warn mt-4">
                You have used all {g.maxAttempts} attempts. Your best score stands on the leaderboard.
              </div>
              <button className="btn btn--primary btn--lg mt-4" onClick={() => navigate('/results')}>
                View my results
              </button>
            </>
          ) : (
            <>
              <p className="assessment-note mt-4">
                Your answers save automatically. If you close this tab the clock keeps running, and
                you can resume where you left off.
              </p>
              <button className="btn btn--primary btn--lg mt-4" onClick={startAttempt}>
                Start attempt {(g.attemptsUsed ?? 0) + 1} of {g.maxAttempts ?? 3}
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  // ---------- active assessment ----------

  const total = mcqs.length + dsa.length;
  const positionIndex = isDsaPhase ? mcqs.length + dsaIndex : index;
  const answeredCount = Object.keys(answers).length;
  const currentQuestion = mcqs[index];
  const currentDsa = dsa[dsaIndex];
  const currentKey = isDsaPhase ? `dsa_${dsaIndex}` : `mcq_${index}`;
  const isMarked = markedForReview.has(currentKey);
  const lowTime = secondsLeft <= 300;

  return (
    <section className="dashboard-section active">
      <header className="section-header assessment-header" style={{ marginBottom: 24 }}>
        <div className="assessment-title">
          <h1>Assessment</h1>
          <span className={`timer ${lowTime ? 'timer--low' : ''}`}>{formatTime(secondsLeft)}</span>
          <span className={`save-pill save-pill--${saveState}`}>
            {saveState === 'saving' && 'Saving…'}
            {saveState === 'saved' && 'All changes saved'}
            {saveState === 'error' && 'Save failed — retrying on next change'}
            {saveState === 'idle' && 'Answers save automatically'}
          </span>
        </div>
        <div className="assessment-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(positionIndex / total) * 100}%` }} />
          </div>
          <span>{answeredCount} of {mcqs.length} answered</span>
        </div>
      </header>

      {state.error && <div className="auth-alert auth-alert--error">{state.error}</div>}

      <div className="assessment-content" style={{ gridTemplateColumns: isGridOpen ? '1fr 320px' : '1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {!isDsaPhase ? (
            <div className="question-area">
              <div className="question-area__top">
                <h3 className="question-number">Question {index + 1} of {mcqs.length}</h3>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    className={`btn btn--sm ${isMarked ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => toggleReview(currentKey)}
                  >
                    {isMarked ? 'Unmark review' : 'Mark for review'}
                  </button>
                  {!isGridOpen && (
                    <button className="btn btn--ghost btn--sm" onClick={() => setIsGridOpen(true)}>
                      Show navigation
                    </button>
                  )}
                </div>
              </div>

              {currentQuestion?.topic && <span className="question-topic">{currentQuestion.topic}</span>}
              <p className="question-text">{currentQuestion?.prompt}</p>

              <div className="options-grid">
                {(currentQuestion?.options || []).map((opt, i) => (
                  <div
                    key={i}
                    className={`option-card ${answers[currentQuestion.id] === i ? 'selected' : ''}`}
                    onClick={() => chooseOption(currentQuestion.id, i)}
                  >
                    <span className="option-key">{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </div>
                ))}
              </div>

              <div className="question-actions" style={{ marginTop: 'auto', padding: '24px 0', gap: 16 }}>
                <button
                  className="btn btn--ghost btn--lg"
                  onClick={() => setIndex(Math.max(0, index - 1))}
                  disabled={index === 0}
                >
                  Previous
                </button>
                <button
                  className="btn btn--primary btn--lg"
                  onClick={() => (index < mcqs.length - 1 ? setIndex(index + 1) : setIsDsaPhase(true))}
                >
                  {index < mcqs.length - 1 ? 'Next' : 'Go to DSA'}
                </button>
              </div>
            </div>
          ) : (
            <div className="question-area" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div className="dsa-layout" style={{ height: 500 }}>
                <div className="dsa-problem">
                  <div className="question-area__top">
                    <h3 className="question-number">DSA challenge {dsaIndex + 1} of {dsa.length}</h3>
                    <button
                      className={`btn btn--sm ${isMarked ? 'btn--primary' : 'btn--ghost'}`}
                      onClick={() => toggleReview(currentKey)}
                    >
                      {isMarked ? 'Unmark' : 'Mark for review'}
                    </button>
                  </div>
                  <h2>{currentDsa?.title}</h2>
                  <div
                    className="problem-description"
                    dangerouslySetInnerHTML={{ __html: currentDsa?.description || '' }}
                  />
                </div>
                <div className="dsa-editor-wrapper">
                  <div className="editor-header">
                    <select className="language-select" disabled>
                      <option>JavaScript (Node.js)</option>
                    </select>
                  </div>
                  <div className="editor-container">
                    <Editor
                      height="100%"
                      defaultLanguage="javascript"
                      theme="vs-dark"
                      value={dsaCode[currentDsa?.id] ?? ''}
                      onChange={(val) => editCode(currentDsa.id, val)}
                      options={{ minimap: { enabled: false }, fontSize: 14 }}
                    />
                  </div>
                </div>
              </div>

              <div className="question-actions" style={{ marginTop: 'auto', padding: '24px 0', gap: 16 }}>
                <button
                  className="btn btn--ghost btn--lg"
                  onClick={() => {
                    if (dsaIndex > 0) setDsaIndex(dsaIndex - 1);
                    else { setIsDsaPhase(false); setIndex(mcqs.length - 1); }
                  }}
                >
                  Previous
                </button>
                <button
                  className="btn btn--primary btn--lg"
                  onClick={() => (dsaIndex < dsa.length - 1 ? setDsaIndex(dsaIndex + 1) : submit())}
                  disabled={submitting}
                >
                  {dsaIndex < dsa.length - 1 ? 'Next' : submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          )}
        </div>

        {isGridOpen && (
          <div className="assessment-sidebar">
            <div className="question-area__top">
              <h3 style={{ margin: 0, fontSize: 18 }}>Navigation</h3>
              <button className="btn btn--ghost btn--sm" onClick={() => setIsGridOpen(false)}>Minimize</button>
            </div>
            <div className="grid-legend">
              <div className="legend-item"><div className="legend-box" style={{ background: 'var(--accent-green)' }} /> Answered</div>
              <div className="legend-item"><div className="legend-box" style={{ background: '#FFD166' }} /> Marked</div>
              <div className="legend-item"><div className="legend-box" style={{ background: 'rgba(255,255,255,0.05)' }} /> Not answered</div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
              <div className="question-grid">
                {mcqs.map((q, i) => {
                  let status = answers[q.id] !== undefined ? 'answered' : 'unanswered';
                  if (markedForReview.has(`mcq_${i}`)) status = 'review';
                  return (
                    <div
                      key={q.id}
                      className={`grid-cell ${status} ${!isDsaPhase && index === i ? 'active' : ''}`}
                      onClick={() => { setIsDsaPhase(false); setIndex(i); }}
                    >
                      {i + 1}
                    </div>
                  );
                })}
                {dsa.map((q, j) => {
                  const touched = (dsaCode[q.id] || '').trim() !== (q.template || '').trim();
                  let status = touched ? 'answered' : 'unanswered';
                  if (markedForReview.has(`dsa_${j}`)) status = 'review';
                  return (
                    <div
                      key={q.id}
                      className={`grid-cell ${status} ${isDsaPhase && dsaIndex === j ? 'active' : ''}`}
                      onClick={() => { setIsDsaPhase(true); setDsaIndex(j); }}
                    >
                      D{j + 1}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className="btn btn--primary btn--lg mt-4"
              style={{ width: '100%', padding: 20, fontSize: 18 }}
              onClick={() => {
                const unanswered = mcqs.length - answeredCount;
                const msg = unanswered > 0
                  ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`
                  : 'Submit your assessment? This cannot be undone.';
                if (window.confirm(msg)) submit();
              }}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Finish & submit'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
