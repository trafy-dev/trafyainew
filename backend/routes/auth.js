const express = require('express');
const { requireAuth, ensureProfile, isAdminUser } = require('../middleware/auth');
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
      .select('id, email, display_name, avatar_url, country, university, created_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) throw fromSupabase(error, 'load profile');

    res.json({
      id: req.user.id,
      email: req.user.email,
      displayName: (data && data.display_name) || req.user.displayName,
      avatarUrl: (data && data.avatar_url) || req.user.avatarUrl,
      country: (data && data.country) || null,
      university: (data && data.university) || null,
      isAdmin: isAdminUser(req.user),
      createdAt: data && data.created_at,
    });
  })
);

/**
 * Lets a candidate correct their display name, or fill in country/university
 * (asked for once after first login, shown again on future logins until set).
 * Any field omitted from the body is left unchanged.
 */
router.patch(
  '/me',
  requireAuth,
  ensureProfile,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const patch = { updated_at: new Date().toISOString() };

    if (body.displayName !== undefined) {
      patch.display_name = String(body.displayName).trim().slice(0, 60) || null;
    }
    if (body.country !== undefined) {
      patch.country = String(body.country).trim().slice(0, 80) || null;
    }
    if (body.university !== undefined) {
      patch.university = String(body.university).trim().slice(0, 160) || null;
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(patch)
      .eq('id', req.user.id)
      .select('id, display_name, country, university')
      .single();

    if (error) throw fromSupabase(error, 'update profile');
    res.json({
      id: data.id,
      displayName: data.display_name,
      country: data.country,
      university: data.university,
    });
  })
);

module.exports = router;
