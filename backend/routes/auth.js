const express = require('express');
const { requireAuth, ensureProfile } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errors');
const { supabaseAdmin } = require('../lib/supabase');
const { fromSupabase } = require('../middleware/errors');

const router = express.Router();

/**
 * Sign-up and sign-in are handled entirely by Supabase Auth in the browser
 * (email/password and Google both), so this API no longer proxies credentials.
 * The old implementation forwarded passwords through this server and crashed
 * with a 500 whenever Supabase returned no session.
 */

/** Who am I? Also guarantees a profiles row exists. */
router.get(
  '/me',
  requireAuth,
  ensureProfile,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name, avatar_url, created_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) throw fromSupabase(error, 'load profile');

    res.json({
      id: req.user.id,
      email: req.user.email,
      displayName: (data && data.display_name) || req.user.displayName,
      avatarUrl: (data && data.avatar_url) || req.user.avatarUrl,
      createdAt: data && data.created_at,
    });
  })
);

/** Let a candidate correct the name shown on the leaderboard. */
router.patch(
  '/me',
  requireAuth,
  ensureProfile,
  asyncHandler(async (req, res) => {
    const raw = (req.body && req.body.displayName) || '';
    const displayName = String(raw).trim().slice(0, 60);

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ display_name: displayName || null, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select('id, display_name')
      .single();

    if (error) throw fromSupabase(error, 'update profile');
    res.json({ id: data.id, displayName: data.display_name });
  })
);

module.exports = router;
