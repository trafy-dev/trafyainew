import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => {
    const user = session?.user ?? null;
    const meta = user?.user_metadata ?? {};
    return {
      session,
      user,
      loading,
      displayName: meta.full_name || meta.name || user?.email?.split('@')[0] || 'Candidate',
      avatarUrl: meta.avatar_url || null,

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

      signOut: () => supabase.auth.signOut(),
    };
  }, [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
