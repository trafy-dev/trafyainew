import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  // True while the user is in the middle of a "reset password" link click.
  // Supabase signs them in to let them set a new password, but that session
  // must not be treated as a normal login until they've done so.
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  // Canonical profile from the server (isAdmin, country, university). The
  // server is the source of truth for isAdmin — it's the actual security
  // boundary; this copy is only for deciding what the UI shows.
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const { data } = await api.get('/api/auth/me');
      setProfile(data);
      return data;
    } catch {
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Fetch the canonical profile once a real (non-recovery) session exists,
  // and clear it on sign-out.
  useEffect(() => {
    if (session?.user && !passwordRecovery) {
      refreshProfile();
    } else {
      setProfile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, passwordRecovery]);

  const value = useMemo(() => {
    const user = session?.user ?? null;
    const meta = user?.user_metadata ?? {};
    return {
      session,
      user,
      loading,
      passwordRecovery,
      profile,
      profileLoading,
      refreshProfile,
      isAdmin: Boolean(profile?.isAdmin),
      displayName: profile?.displayName || meta.full_name || meta.name || user?.email?.split('@')[0] || 'Candidate',
      avatarUrl: profile?.avatarUrl || meta.avatar_url || null,

      signInWithGoogle: () =>
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        }),

      signInWithPassword: (email, password) =>
        supabase.auth.signInWithPassword({ email, password }),

      signUpWithPassword: (email, password, displayName) =>
        supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: displayName }, emailRedirectTo: window.location.origin },
        }),

      // Sends a reset link to the given email. Supabase redirects back here
      // with a recovery token in the URL; onAuthStateChange picks that up as
      // a PASSWORD_RECOVERY event above.
      sendPasswordReset: (email) =>
        supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }),

      // Sets a new password for the account currently in recovery, then
      // clears the recovery flag so the app treats it as a normal session.
      updatePassword: async (password) => {
        const result = await supabase.auth.updateUser({ password });
        if (!result.error) setPasswordRecovery(false);
        return result;
      },

      cancelPasswordRecovery: async () => {
        setPasswordRecovery(false);
        await supabase.auth.signOut();
      },

      signOut: () => supabase.auth.signOut(),
    };
  }, [session, loading, passwordRecovery, profile, profileLoading, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
