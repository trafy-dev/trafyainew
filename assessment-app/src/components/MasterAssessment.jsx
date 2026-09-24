import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Sun, Moon, ShieldAlert, Flag, Lock } from 'lucide-react';
import { api, apiError } from '../lib/api';

const EDITOR_THEME_KEY = 'trafy_dsa_editor_theme';
const AUTOSAVE_DEBOUNCE_MS = 800;

const fullscreenSupported = () =>
  typeof document !== 'undefined' && Boolean(document.documentElement.requestFullscreen);

const enterFullscreen = async () => {
  if (!fullscreenSupported() || document.fullscreenElement) return true;
  try {
    await document.documentElement.requestFullscreen();
    return true;
  } catch {
    return false;
  }
};

const VIOLATION_TEXT = {
  fullscreen_exit: 'You left full-screen mode.',
  tab_hidden: 'You switched to another tab or window.',
  window_blur: 'The assessment window lost focus.',
  resume: 'Resume your attempt in full-screen mode.',
};

/**
 * The assessment is server-driven and secured:
 *  - the server pins this candidate's question set and sends ONE question at a
 *    time, so upcoming questions never reach the browser
 *  - a question must be completed before the next is delivered; there is no going back
 *  - the attempt runs full-screen; leaving it, switching tabs or losing focus is a
 *    violation counted by the server, and the attempt is submitted after the limit
 *  - answers autosave; expiry is decided by the server clock
 */
export default function MasterAssessment() {
  const navigate = useNavigate();
  const { slug = 'cohort-26' } = useParams();

  const [state, setState] = useState({ phase: 'loading', error: null, gate: null });
  const [attempt, setAttempt] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState({});
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [saveState, setSaveState] = useState('idle');
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isGridOpen, setIsGridOpen] = useState(true);
  const [violations, setViolations] = useState({ count: 0, max: 3 });
  const [lock, setLock] = useState(null); // { type } while the screen is locked

  const [editorTheme, setEditorTheme] = useState(() => {
    try {
      return localStorage.getItem(EDITOR_THEME_KEY) === 'light' ? 'light' : 'vs-dark';
    } catch {
      return 'vs-dark';
    }
  });
  const toggleEditorTheme = () => {
    setEditorTheme((prev) => {
      const next = prev === 'vs-dark' ? 'light' : 'vs-dark';
      try { localStorage.setItem(EDITOR_THEME_KEY, next); } catch { /* ignore */ }
      return next;
    });
  };

  // Refs keep the latest values reachable from timers and event handlers.
  const answersRef = useRef(answers);
  const codeRef = useRef(code);
  const attemptRef = useRef(attempt);
  const questionRef = useRef(question);
  const submittingRef = useRef(false);
  const saveTimer = useRef(null);
  const lockedRef = useRef(false);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { attemptRef.current = attempt; }, [attempt]);
  useEffect(() => { questionRef.current = question; }, [question]);

  const applyPayload = useCallback((payload) => {
    setAttempt(payload.attempt);
    setQuestion(payload.question);
    setAnswers(payload.attempt.answers || {});
    const q = payload.question;
    setCode(q.kind === 'dsa' ? (payload.attempt.dsaCode || {})[q.id] ?? q.template ?? '' : '');
    setSecondsLeft(payload.attempt.secondsRemaining);
    setViolations({ count: payload.attempt.violations || 0, max: payload.attempt.maxViolations || 3 });
    setState({ phase: 'active', error: null, gate: null });
  }, []);

  // Load an in-progress attempt, or show the start gate.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/assessment/attempt?slug=${encodeURIComponent(slug)}`);
        if (cancelled) return;
        if (data.attempt) {
          applyPayload(data);
          // A reload drops full-screen and browsers require a click to re-enter it.
          if (fullscreenSupported() && !document.fullscreenElement) {
            lockedRef.current = true;
            setLock({ type: 'resume' });
          }
        } else setState({ phase: 'gate', error: null, gate: data });
      } catch (err) {
        if (!cancelled) setState({ phase: 'error', error: apiError(err).message, gate: null });
      }
    })();
    return () => { cancelled = true; };
  }, [applyPayload, slug]);

  const submit = useCallback(
    async (reason = 'manual') => {
      const current = attemptRef.current;
      if (!current || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setConfirmOpen(false);

      try {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        const q = questionRef.current;
        await api
          .patch(`/api/assessment/attempt/${current.id}`, {
            answers: answersRef.current,
            dsaCode: q && q.kind === 'dsa' ? { [q.id]: codeRef.current } : {},
          })
          .catch(() => {});

        const { data } = await api.post(`/api/assessment/attempt/${current.id}/submit`);
        navigate('/results', { state: { justSubmitted: data, reason } });
      } catch (err) {
        const info = apiError(err);
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

  // ---------- proctoring ----------

  const reportViolation = useCallback(
    async (type) => {
      // One incident at a time: leaving full-screen usually also blurs the window.
      if (lockedRef.current || submittingRef.current) return;
      lockedRef.current = true;
      setLock({ type });

      const current = attemptRef.current;
      if (!current) return;
      try {
        const { data } = await api.post(`/api/assessment/attempt/${current.id}/violation`, { type });
        setViolations({ count: data.violations, max: data.max });
        if (data.terminated) {
          submittingRef.current = true;
          navigate('/results', { state: { justSubmitted: data.result, reason: 'violation' } });
        }
      } catch (err) {
        if (apiError(err).status === 409) navigate('/results');
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (state.phase !== 'active') return undefined;

    const onFullscreen = () => { if (!document.fullscreenElement) reportViolation('fullscreen_exit'); };
    const onVisibility = () => { if (document.hidden) reportViolation('tab_hidden'); };
    const onBlur = () => reportViolation('window_blur');
    const inEditor = (e) => Boolean(e.target && e.target.closest && e.target.closest('.monaco-editor'));
    const block = (e) => { if (!inEditor(e)) e.preventDefault(); };
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      const devtools = k === 'f12' || (mod && e.shiftKey && ['i', 'j', 'c'].includes(k));
      const pageOps = mod && ['u', 's', 'p'].includes(k);
      const clip = mod && ['c', 'x', 'v', 'a'].includes(k) && !inEditor(e);
      if (devtools || pageOps || clip) e.preventDefault();
    };
    const onUnload = (e) => { e.preventDefault(); e.returnValue = ''; };

    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('paste', block);
    document.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('paste', block);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [state.phase, reportViolation]);

  // Leave full-screen when the assessment screen goes away.
  useEffect(() => () => {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }, []);

  const returnToAssessment = async () => {
    const ok = await enterFullscreen();
    if (ok && !document.hidden) {
      lockedRef.current = false;
      setLock(null);
    }
  };

  // ---------- actions ----------

  const queueSave = useCallback((nextAnswers, nextCode) => {
    const current = attemptRef.current;
    const q = questionRef.current;
    if (!current || !q) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(async () => {
      try {
        await api.patch(`/api/assessment/attempt/${current.id}`, {
          answers: nextAnswers,
          dsaCode: q.kind === 'dsa' ? { [q.id]: nextCode } : {},
        });
        setSaveState('saved');
      } catch (err) {
        if (apiError(err).status === 409) {
          navigate('/results');
          return;
        }
        setSaveState('error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [navigate]);

  const startAttempt = async () => {
    // Must run inside the click handler: browsers only allow full-screen from a user gesture.
    const gotFullscreen = await enterFullscreen();
    setState((s) => ({ ...s, phase: 'loading' }));
    try {
      const { data } = await api.post('/api/assessment/attempt', { slug });
      lockedRef.current = false;
      setLock(null);
      applyPayload(data);
      if (!gotFullscreen && fullscreenSupported()) {
        lockedRef.current = true;
        setLock({ type: 'resume' });
      }
    } catch (err) {
      const info = apiError(err);
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      setState({ phase: 'gate', error: info.message, gate: state.gate });
    }
  };

  const chooseOption = (optionIndex) => {
    const next = { [question.id]: optionIndex };
    setAnswers(next);
    queueSave(next, codeRef.current);
  };

  const editCode = (value) => {
    const next = value ?? '';
    setCode(next);
    queueSave(answersRef.current, next);
  };

  const nextQuestion = async () => {
    if (advancing || !attempt) return;
    setAdvancing(true);
    setState((s) => ({ ...s, error: null }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      const body = question.kind === 'mcq'
        ? { position: attempt.position, answer: answers[question.id] }
        : { position: attempt.position, code };
      const { data } = await api.post(`/api/assessment/attempt/${attempt.id}/advance`, body);
      applyPayload(data);
      setSaveState('idle');
    } catch (err) {
      const info = apiError(err);
      if (info.status === 409) {
        navigate('/results');
        return;
      }
      setState((s) => ({ ...s, error: info.message }));
    }
    setAdvancing(false);
  };

  // Saves the question on screen, then opens a reached question from the grid.
  const goTo = async (position) => {
    if (advancing || !attempt || position === attempt.position) return;
    const target = (attempt.grid || [])[position];
    if (!target || target.locked) return;
    setAdvancing(true);
    setState((s) => ({ ...s, error: null }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      await api.patch(`/api/assessment/attempt/${attempt.id}`, {
        answers: answersRef.current,
        dsaCode: question.kind === 'dsa' ? { [question.id]: codeRef.current } : {},
      });
      const { data } = await api.get(`/api/assessment/attempt/${attempt.id}/question/${position}`);
      applyPayload(data);
      setSaveState('idle');
    } catch (err) {
      const info = apiError(err);
      if (info.status === 409) { navigate('/results'); return; }
      setState((s) => ({ ...s, error: info.message }));
    }
    setAdvancing(false);
  };

  const toggleReview = async () => {
    if (!attempt) return;
    const pos = attempt.position;
    const marked = !attempt.grid?.[pos]?.marked;
    const patchGrid = (m) => setAttempt((a) => ({
      ...a,
      grid: a.grid.map((g) => (g.position === pos ? { ...g, marked: m } : g)),
    }));
    patchGrid(marked);
    try {
      await api.post(`/api/assessment/attempt/${attempt.id}/review`, { position: pos, marked });
    } catch {
      patchGrid(!marked);
    }
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
    const meta = g.assessment || {};
    const exhausted = g.canStart === false;
    return (
      <section className="dashboard-section active">
        <header className="section-header">
          <h1>{meta.title || 'Assessment'}</h1>
          <p>{meta.description || `${meta.mcqCount ?? ''} multiple-choice questions.`}</p>
        </header>
        <div className="bento-wrap assessment-bento">
          <div className="bento">
            <div className="bento__cell">
              <span className="bento__label">Attempts used</span>
              <span className="bento__value">{g.attemptsUsed ?? 0} / {g.maxAttempts ?? 3}</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Questions</span>
              <span className="bento__value">
                {meta.mcqCount ?? ''} MCQ{meta.dsaCount > 0 ? ` + ${meta.dsaCount} DSA` : ''}
              </span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Time limit</span>
              <span className="bento__value">{meta.durationMinutes ?? ''} mins</span>
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
              <div className="rail-card mt-4">
                <span className="rail-card__title">Rules for this attempt</span>
                <ul className="rail-tips">
                  <li className="rail-tips__item"><ShieldAlert size={16} /><span>The assessment runs in <strong>full-screen</strong>. Leaving full-screen, switching tabs or windows is recorded as a violation.</span></li>
                  <li className="rail-tips__item"><ShieldAlert size={16} /><span>After <strong>3 violations</strong> your attempt is submitted automatically with the answers so far.</span></li>
                  <li className="rail-tips__item"><ShieldAlert size={16} /><span>Questions appear <strong>one at a time</strong>. Complete the current question to see the next; you cannot go back.</span></li>
                  <li className="rail-tips__item"><ShieldAlert size={16} /><span>Your answers save automatically. If you reload, the clock keeps running and you resume on the same question.</span></li>
                </ul>
              </div>
              <button className="btn btn--primary btn--lg mt-4" onClick={startAttempt}>
                Start attempt {(g.attemptsUsed ?? 0) + 1} of {g.maxAttempts ?? 3} in full-screen
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  // ---------- active assessment ----------

  const position = attempt?.position ?? 0;
  const total = attempt?.total ?? 1;
  const isLast = Boolean(attempt?.isLast);
  const lowTime = secondsLeft <= 300;
  const isMcq = question?.kind === 'mcq';
  const answered = isMcq && answers[question.id] !== undefined;
  const codeTouched = !isMcq && (code || '').trim() !== '' && (code || '').trim() !== (question?.template || '').trim();
  const atFrontier = position === (attempt?.frontier ?? 0);
  const canContinue = !atFrontier || (isMcq ? answered : codeTouched);
  const grid = (attempt?.grid || []).map((g) => (
    g.position === position ? { ...g, answered: isMcq ? answered : codeTouched } : g
  ));
  const answeredCount = grid.filter((g) => g.answered).length;
  const markedCount = grid.filter((g) => g.marked).length;
  const isMarked = Boolean(grid[position]?.marked);
  const mcqTotal = attempt?.mcqTotal ?? total;

  return (
    <section className="dashboard-section active assessment-secure">
      <header className="section-header assessment-header" style={{ marginBottom: 24 }}>
        <div className="assessment-title">
          <h1>Assessment</h1>
          <span className={`timer ${lowTime ? 'timer--low' : ''}`}>{formatTime(secondsLeft)}</span>
          <span className={`save-pill save-pill--${saveState}`}>
            {saveState === 'saving' && 'Saving…'}
            {saveState === 'saved' && 'All changes saved'}
            {saveState === 'error' && 'Save failed, retrying on next change'}
            {saveState === 'idle' && 'Answers save automatically'}
          </span>
          {violations.count > 0 && (
            <span className="violation-pill" title="Focus or full-screen violations recorded">
              <ShieldAlert size={14} /> {violations.count} / {violations.max} violations
            </span>
          )}
        </div>
        <div className="assessment-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(position / total) * 100}%` }} />
          </div>
          <span>{answeredCount} of {total} answered</span>
        </div>
      </header>

      {state.error && <div className="auth-alert auth-alert--error">{state.error}</div>}

      <div className="assessment-content" style={{ gridTemplateColumns: isGridOpen ? '1fr 320px' : '1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {isMcq ? (
            <div className="question-area">
              <div className="question-area__top">
                <h3 className="question-number">Question {position + 1} of {total}</h3>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className={`btn btn--sm ${isMarked ? 'btn--primary' : 'btn--ghost'}`} onClick={toggleReview}>
                    <Flag size={14} style={{ marginRight: 6 }} />{isMarked ? 'Unmark review' : 'Mark for review'}
                  </button>
                  {!isGridOpen && (
                    <button className="btn btn--ghost btn--sm" onClick={() => setIsGridOpen(true)}>Show navigation</button>
                  )}
                </div>
              </div>

              {question.topic && <span className="question-topic">{question.topic}</span>}
              <p className="question-text">{question.prompt}</p>

              <div className="options-grid">
                {(question.options || []).map((opt, i) => (
                  <div
                    key={i}
                    className={`option-card ${answers[question.id] === i ? 'selected' : ''}`}
                    onClick={() => chooseOption(i)}
                  >
                    <span className="option-key">{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="question-area" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div className="dsa-layout" style={{ height: 500 }}>
                <div className="dsa-problem">
                  <div className="question-area__top">
                    <h3 className="question-number">Coding challenge · Question {position + 1} of {total}</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className={`btn btn--sm ${isMarked ? 'btn--primary' : 'btn--ghost'}`} onClick={toggleReview}>
                        <Flag size={14} style={{ marginRight: 6 }} />{isMarked ? 'Unmark' : 'Mark for review'}
                      </button>
                      {!isGridOpen && (
                        <button className="btn btn--ghost btn--sm" onClick={() => setIsGridOpen(true)}>Navigation</button>
                      )}
                    </div>
                  </div>
                  <h2>{question.title}</h2>
                  <div
                    className="problem-description"
                    dangerouslySetInnerHTML={{ __html: question.description || '' }}
                  />
                </div>
                <div className={`dsa-editor-wrapper theme-${editorTheme === 'vs-dark' ? 'dark' : 'light'}`}>
                  <div className="editor-header">
                    <select className="language-select" disabled>
                      <option>JavaScript (Node.js)</option>
                    </select>
                    <button
                      type="button"
                      className="editor-theme-toggle"
                      onClick={toggleEditorTheme}
                      title={editorTheme === 'vs-dark' ? 'Switch editor to light mode' : 'Switch editor to dark mode'}
                    >
                      {editorTheme === 'vs-dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                  </div>
                  <div className="editor-container">
                    <Editor
                      key={question.id}
                      height="100%"
                      defaultLanguage="javascript"
                      theme={editorTheme}
                      value={code}
                      onChange={editCode}
                      options={{ minimap: { enabled: false }, fontSize: 14 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="question-actions" style={{ marginTop: 'auto', padding: '24px 0', gap: 16 }}>
            <button
              className="btn btn--ghost btn--lg"
              onClick={() => goTo(position - 1)}
              disabled={advancing || position === 0}
            >
              Previous
            </button>
            <span className="muted-hint">
              {canContinue
                ? (isLast ? 'Last question. Review anything marked, then submit.' : '')
                : (isMcq ? 'Choose an answer to unlock the next question.' : 'Write a solution to unlock the next question.')}
            </span>
            {isLast ? (
              <button
                className="btn btn--primary btn--lg"
                onClick={() => setConfirmOpen(true)}
                disabled={submitting || !canContinue}
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            ) : (
              <button
                className="btn btn--primary btn--lg"
                onClick={nextQuestion}
                disabled={advancing || submitting || !canContinue}
              >
                {advancing ? 'Loading…' : 'Next question'}
              </button>
            )}
          </div>
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
              <div className="legend-item"><div className="legend-box legend-box--open" /> Not answered</div>
              <div className="legend-item"><div className="legend-box legend-box--locked" /> Locked</div>
            </div>
            <p className="grid-summary">{answeredCount} answered · {markedCount} marked · {total - answeredCount} left</p>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
              <div className="question-grid">
                {grid.map((g) => {
                  const status = g.locked ? 'locked' : g.marked ? 'review' : g.answered ? 'answered' : 'unanswered';
                  const label = g.kind === 'dsa' ? `D${g.position - mcqTotal + 1}` : g.position + 1;
                  return (
                    <button
                      type="button"
                      key={g.position}
                      className={`grid-cell ${status} ${g.position === position ? 'active' : ''}`}
                      onClick={() => goTo(g.position)}
                      disabled={g.locked || advancing}
                      title={g.locked ? 'Complete the current question to unlock' : `Question ${g.position + 1}`}
                    >
                      {g.locked ? <Lock size={12} /> : label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              className="btn btn--primary btn--lg mt-4"
              style={{ width: '100%', padding: 20, fontSize: 18 }}
              onClick={() => setConfirmOpen(true)}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Finish & submit'}
            </button>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="confirm-back">
          <div className="confirm-card" role="dialog" aria-modal="true">
            <h3>Submit your assessment?</h3>
            <p>
              {total - answeredCount > 0 && <>You have <strong>{total - answeredCount}</strong> unanswered or locked question{total - answeredCount === 1 ? '' : 's'}. </>}
              {markedCount > 0 && <><strong>{markedCount}</strong> marked for review. </>}
              This cannot be undone.
            </p>
            <div className="confirm-actions">
              <button className="btn btn--ghost" onClick={() => setConfirmOpen(false)}>Keep working</button>
              <button className="btn btn--primary" onClick={() => submit()} disabled={submitting}>Submit now</button>
            </div>
          </div>
        </div>
      )}

      {lock && (
        <div className="lock-overlay" role="alertdialog" aria-modal="true">
          <div className="lock-card">
            <ShieldAlert size={38} />
            <h2>{lock.type === 'resume' ? 'Attempt paused' : 'Assessment locked'}</h2>
            <p>{VIOLATION_TEXT[lock.type]}</p>
            {lock.type !== 'resume' && (
              <p className="lock-count">
                Violation {violations.count} of {violations.max}.{' '}
                {violations.count >= violations.max - 1
                  ? 'One more and your attempt will be submitted automatically.'
                  : 'Repeated violations will submit your attempt automatically.'}
              </p>
            )}
            <p className="lock-note">The timer keeps running while you are away.</p>
            <button className="btn btn--primary btn--lg" onClick={returnToAssessment}>
              Return to full-screen and continue
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
