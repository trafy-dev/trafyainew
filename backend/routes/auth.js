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

const PROFILE_SELECT =
  'id, email, display_name, avatar_url, country, university, ' +
  'github_url, leetcode_url, linkedin_url, instagram_url, portfolio_url, project_url, created_at';

function toProfileResponse(req, data) {
  return {
    id: req.user.id,
    email: req.user.email,
    displayName: (data && data.display_name) || req.user.displayName,
    avatarUrl: (data && data.avatar_url) || req.user.avatarUrl,
    country: (data && data.country) || null,
    university: (data && data.university) || null,
    githubUrl: (data && data.github_url) || null,
    leetcodeUrl: (data && data.leetcode_url) || null,
    linkedinUrl: (data && data.linkedin_url) || null,
    instagramUrl: (data && data.instagram_url) || null,
    portfolioUrl: (data && data.portfolio_url) || null,
    projectUrl: (data && data.project_url) || null,
    isAdmin: isAdminUser(req.user),
    createdAt: data && data.created_at,
  };
}

/** Who am I? Also guarantees a profiles row exists. */
router.get(
  '/me',
  requireAuth,
  ensureProfile,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(PROFILE_SELECT)
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) throw fromSupabase(error, 'load profile');
    res.json(toProfileResponse(req, data));
  })
);

const TEXT_FIELDS = { displayName: 'display_name', country: 'country', university: 'university' };

// Link fields get light normalisation: trimmed, and given an https:// scheme
// if the candidate typed a bare domain ("github.com/x") rather than a full URL.
const LINK_FIELDS = {
  githubUrl: 'github_url',
  leetcodeUrl: 'leetcode_url',
  linkedinUrl: 'linkedin_url',
  instagramUrl: 'instagram_url',
  portfolioUrl: 'portfolio_url',
  projectUrl: 'project_url',
};

function normaliseLink(raw) {
  const value = String(raw).trim();
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value.slice(0, 300) : `https://${value}`.slice(0, 300);
}

/**
 * Lets a candidate fill in or correct their profile: display name, country,
 * university, and their GitHub/LeetCode/LinkedIn/Instagram/portfolio/project
 * links. All fields are optional and any field omitted from the body is
 * left unchanged.
 */
router.patch(
  '/me',
  requireAuth,
  ensureProfile,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const patch = { updated_at: new Date().toISOString() };

    for (const [key, column] of Object.entries(TEXT_FIELDS)) {
      if (body[key] !== undefined) {
        const maxLen = key === 'university' ? 160 : 60;
        patch[column] = String(body[key]).trim().slice(0, maxLen) || null;
      }
    }
    for (const [key, column] of Object.entries(LINK_FIELDS)) {
      if (body[key] !== undefined) {
        patch[column] = body[key] ? normaliseLink(body[key]) : null;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(patch)
      .eq('id', req.user.id)
      .select(PROFILE_SELECT)
      .single();

    if (error) throw fromSupabase(error, 'update profile');
    res.json(toProfileResponse(req, data));
  })
);

module.exports = router;
