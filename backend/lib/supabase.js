const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

/**
 * Admin client — uses the service_role key and bypasses RLS.
 * Every read/write this API performs goes through here, which is why every
 * route must independently authorise the caller (see middleware/auth.js).
 * This key must never reach the browser.
 */
const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Public client — anon key, used only to validate a caller's access token.
 */
const supabasePublic = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = { supabaseAdmin, supabasePublic };
