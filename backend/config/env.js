require('dotenv').config();

/**
 * Fail fast on missing configuration rather than discovering it as a 500
 * halfway through a candidate's assessment.
 */
function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(`\n[config] Missing required environment variable: ${name}`);
    console.error('[config] Copy backend/.env.example to backend/.env and fill it in.\n');
    process.exit(1);
  }
  return value.trim();
}

function optional(name, fallback = '') {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function intOr(name, fallback) {
  const parsed = parseInt(optional(name), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: intOr('PORT', 3000),

  supabaseUrl: required('SUPABASE_URL'),
  // Server-side writes need service_role. The anon key cannot write past RLS.
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),

  judge0Key: optional('JUDGE0_API_KEY'),
  judge0Host: optional('JUDGE0_HOST', 'judge0-ce.p.rapidapi.com'),

  // Comma-separated list of origins allowed to call this API.
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  assessmentSlug: optional('ASSESSMENT_SLUG', 'cohort-26'),
};

env.isProd = env.nodeEnv === 'production';

if (env.supabaseServiceRoleKey === env.supabaseAnonKey) {
  console.error('\n[config] SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY are identical.');
  console.error('[config] The service_role key is a different key — find it under');
  console.error('[config] Supabase Dashboard > Project Settings > API > service_role.\n');
  process.exit(1);
}

module.exports = env;
