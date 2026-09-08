import React, { useCallback, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { GitBranch, Code2, Briefcase, Camera, Globe, FolderGit2 } from 'lucide-react';
import { api, apiError, socketUrl } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// lucide-react 1.x dropped brand/logo glyphs, so these are generic
// stand-ins per platform rather than the actual GitHub/LinkedIn/Instagram logos.
const LINK_ICONS = [
  { key: 'githubUrl', label: 'GitHub', icon: GitBranch },
  { key: 'leetcodeUrl', label: 'LeetCode', icon: Code2 },
  { key: 'linkedinUrl', label: 'LinkedIn', icon: Briefcase },
  { key: 'instagramUrl', label: 'Instagram', icon: Camera },
  { key: 'portfolioUrl', label: 'Portfolio', icon: Globe },
  { key: 'projectUrl', label: 'Project', icon: FolderGit2 },
];

function CandidateLinks({ entry }) {
  const present = LINK_ICONS.filter(({ key }) => entry[key]);
  if (present.length === 0) return <span className="muted">—</span>;
  return (
    <div className="leaderboard-links">
      {present.map(({ key, label, icon: Icon }) => (
        <a
          key={key}
          href={entry[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="leaderboard-link-icon"
          title={label}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon size={15} />
        </a>
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [me, setMe] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const socketRef = useRef(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data } = await api.get('/api/leaderboard');
      setRows(data.leaderboard || []);
      setMe(data.me || null);
      setError('');
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token || cancelled) return;

      // The socket handshake is authenticated now; the server rejects anonymous
      // connections.
      const socket = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.on('connect', () => setLive(true));
      socket.on('disconnect', () => setLive(false));
      socket.on('connect_error', () => setLive(false));
      socket.on('leaderboard_update', fetchLeaderboard);
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
    };
  }, [fetchLeaderboard]);

  return (
    <section className="dashboard-section active">
      <header className="section-header">
        <h1>Global leaderboard</h1>
        <p>
          Best score per candidate.{' '}
          <span className={`live-dot ${live ? 'live-dot--on' : ''}`} />
          {live ? 'Live' : 'Reconnecting…'}
        </p>
      </header>

      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      {me && (
        <div className="bento-wrap">
          <div className="bento">
            <div className="bento__cell">
              <span className="bento__label">Your rank</span>
              <span className="bento__value">#{me.rank}</span>
            </div>
            <div className="bento__cell">
              <span className="bento__label">Your best score</span>
              <span className="bento__value">{me.totalScore} / {me.maxScore}</span>
            </div>
          </div>
        </div>
      )}

      <div className="leaderboard-table-wrapper mt-4">
        {loading ? (
          <div className="loader" />
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Country</th>
                <th>University</th>
                <th>Links</th>
                <th>Correct</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>
                    No candidates have completed the assessment yet.
                  </td>
                </tr>
              ) : (
                rows.map((entry) => (
                  <tr key={entry.userId} className={entry.userId === user?.id ? 'is-me' : ''}>
                    <td>
                      <span className={`rank rank-${entry.rank <= 3 ? entry.rank : 'other'}`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td>
                      {entry.displayName}
                      {entry.userId === user?.id && <span className="you-tag">You</span>}
                    </td>
                    <td className="muted">{entry.country || '—'}</td>
                    <td className="muted">{entry.university || '—'}</td>
                    <td><CandidateLinks entry={entry} /></td>
                    <td>{entry.correctCount}</td>
                    <td><strong>{entry.totalScore}</strong> <span className="muted">/ {entry.maxScore}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
