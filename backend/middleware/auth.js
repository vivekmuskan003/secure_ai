/**
 * middleware/auth.js — Auth0 JWT verification middleware
 *
 * Uses `express-oauth2-jwt-bearer` to validate JWTs issued by Auth0.
 * Every protected route passes through this middleware first.
 *
 * The JWT is sent by the frontend in the Authorization header:
 *   Authorization: Bearer <token>
 *
 * ⚠️  The auth() call is deliberately LAZY (created on first request)
 *      so that dotenv has time to load AUTH0_AUDIENCE / AUTH0_DOMAIN
 *      before express-oauth2-jwt-bearer asserts they exist.
 */

const { auth } = require('express-oauth2-jwt-bearer');

// Built on first request, cached for all subsequent requests
let _verifier = null;

const buildVerifier = () => {
  if (!process.env.AUTH0_AUDIENCE || !process.env.AUTH0_DOMAIN) {
    throw new Error(
      'AUTH0_AUDIENCE and AUTH0_DOMAIN must be set in your .env file before starting the server.'
    );
  }
  return auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
    tokenSigningAlg: 'RS256',
  });
};

/**
 * verifyToken — Lazy JWT verification middleware.
 * Creates the Auth0 verifier on the first request (after dotenv is loaded).
 */
const verifyToken = (req, res, next) => {
  if (!_verifier) {
    try {
      _verifier = buildVerifier();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  return _verifier(req, res, next);
};

/**
 * getUserId — Helper to extract the Auth0 user ID from the JWT payload.
 * Call this after verifyToken in your route handlers.
 *
 * @param {Object} req - Express request object (must have req.auth)
 * @returns {string} Auth0 user ID (e.g. "auth0|64a3c...")
 */
const getUserId = (req) => {
  // Auth0 uses 'sub' (subject) claim as the user identifier
  return req.auth?.payload?.sub;
};

module.exports = { verifyToken, getUserId };
