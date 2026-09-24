import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './storage';
import { useAuth } from '../context/AuthContext';

const Ctx = createContext({ available: false, role: null });
export const useLms = () => useContext(Ctx);

/**
 * Classroom role for the signed-in user (admin > teacher > student), read from
 * the lms_people view. `available` is false until the LMS schema has been
 * applied, in which case the Classroom nav is hidden instead of erroring.
 */
export function LmsProvider({ children }) {
  const { user, displayName } = useAuth();
  const [state, setState] = useState({ ready: false, available: false, role: null, name: '' });

  useEffect(() => {
    if (!user) { setState({ ready: true, available: false, role: null, name: '' }); return undefined; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('lms_people').select('id, full_name, role').eq('id', user.id).maybeSingle();
      if (cancelled) return;
      setState({ ready: true, available: !error && Boolean(data), role: data?.role || null, name: data?.full_name || '' });
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const value = useMemo(() => ({
    ...state,
    user,
    profile: { full_name: state.name || displayName, role: state.role },
    isAdmin: state.role === 'admin',
    isStaff: state.role === 'admin' || state.role === 'teacher',
  }), [state, user, displayName]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
