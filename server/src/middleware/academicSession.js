const { setRequestContext, getRequestContext } = require('../tenancy/requestContext');

/**
 * Express middleware that reads the `x-academic-session` header (e.g. "2025-2026")
 * and stores it on `req.academicSession` and in the AsyncLocalStorage request context.
 *
 * Session routes themselves (`/api/sessions/*`) are exempt — they work without a
 * selected session so that the user can list/create sessions first.
 *
 * Auth routes (`/api/auth/*`) are also exempt so that login/register work normally.
 */
const academicSessionMiddleware = (req, res, next) => {
  const sessionLabel = req.headers['x-academic-session'];

  if (sessionLabel) {
    if (!/^\d{4}-\d{4}$/.test(sessionLabel)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid x-academic-session header. Expected YYYY-YYYY format.',
      });
    }

    req.academicSession = sessionLabel;

    // Also persist in AsyncLocalStorage so context-model proxies and
    // utilities can access it without passing `req` around.
    setRequestContext({ academicSession: sessionLabel });
  }

  return next();
};

/**
 * Helper to retrieve the current academic session from AsyncLocalStorage
 * (useful in models/utilities that don't have access to `req`).
 */
const getCurrentAcademicSession = () => {
  const ctx = getRequestContext();
  return ctx?.academicSession || null;
};

module.exports = {
  academicSessionMiddleware,
  getCurrentAcademicSession,
};
