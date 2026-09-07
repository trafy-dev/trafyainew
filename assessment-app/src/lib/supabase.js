import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced loudly here rather than as a confusing auth failure later.
  console.error(
    '[config] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
      'Copy assessment-app/.env.example to assessment-app/.env and restart the dev server.'
  );
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // completes the Google OAuth redirect
  },
});

export const isConfigured = Boolean(url && anonKey);
