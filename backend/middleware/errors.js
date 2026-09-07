const env = require('../config/env');

/** An error with an intentional HTTP status and a client-safe message. */
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.expected = true;
  }
}

const badRequest = (msg, details) => new ApiError(400, msg, details);
const unauthorized = (msg = 'Authentication required.') => new ApiError(401, msg);
const forbidden = (msg = 'Not allowed.') => new ApiError(403, msg);
const notFound = (msg = 'Not found.') => new ApiError(404, msg);
const conflict = (msg, details) => new ApiError(409, msg, details);

/** Wraps an async route so a rejected promise reaches the error handler. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Turns a Supabase client error into a 500 without leaking internals. */
function fromSupabase(error, context) {
  console.error(`[supabase] ${context}:`, error.message);
  return new ApiError(500, 'A database error occurred. Please try again.');
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

/**
 * Central error handler. Unexpected errors are logged in full server-side but
 * reported to the client as a generic message — the previous implementation
 * returned raw stack traces including absolute filesystem paths.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err && err.expected) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  console.error('[unhandled]', req.method, req.path, err);
  const body = { error: 'Something went wrong on our end. Please try again.' };
  if (!env.isProd) body.debug = err && err.message;
  res.status(500).json(body);
}

module.exports = {
  ApiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  asyncHandler,
  fromSupabase,
  notFoundHandler,
  errorHandler,
};
