const { supabasePublic, supabaseAdmin } = require('../lib/supabase');
const { unauthorized, asyncHandler } = require('./errors');

/**
 * Small TTL cache so a burst of autosaves from one candidate doesn't make a
 * network round-trip to Supabase on every request.
 */
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map(); // token -> { user, expiresAt }

function cacheGet(token) {
  const hit = cache.get(token);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(token);
    return null;
  }
  return hit.user;
}

function cacheSet(token, user) {
  // Bound the cache so a flood of junk tokens can't grow it without limit.
  if (cache.size > 5000) cache.clear();
  cache.set(token, { user, expiresAt: Date.now() + CACHE_TTL_MS });
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * Verifies the Supabase access token and attaches req.user.
 *
 * This is the fix for the core vulnerability in the old code: identity now
 * comes from a cryptographically verified token, never from the request body.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw unauthorized('Missing bearer token.');

  const cached = cacheGet(token);
  if (cached) {
    req.user = cached;
    return next();
  }

  const { data, error } = await supabasePublic.auth.getUser(token);
  if (error || !data || !data.user) {
    throw unauthorized('Your session has expired. Please sign in again.');
  }

  const user = {
    id: data.user.id,
    email: data.user.email,
    displayName:
      data.user.user_metadata?.full_name ||
      data.user.user_metadata?.name ||
      (data.user.email ? data.user.email.split('@')[0] : 'Candidate'),
    avatarUrl: data.user.user_metadata?.avatar_url || null,
  };

  cacheSet(token, user);
  req.user = user;
  next();
});

/**
 * Guarantees a profiles row exists for the authenticated user.
 *
 * The database trigger handles this for new signups, but this covers users
 * created before the trigger existed and keeps display_name/avatar in sync
 * when someone updates their Google profile.
 */
const ensureProfile = asyncHandler(async (req, res, next) => {
  const { id, email, displayName, avatarUrl } = req.user;

  const { error } = await supabaseAdmin.from('profiles').upsert(
    {
      id,
      email: email || '',
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  // A failure here is logged but not fatal — it must not block an in-flight
  // assessment. The old code ignored this error silently and never knew.
  if (error) console.error('[auth] profile upsert failed:', error.message);

  next();
});

module.exports = { requireAuth, ensureProfile };
