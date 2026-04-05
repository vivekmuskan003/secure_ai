/**
 * services/intermediary.js — Auth0 Token Vault + API execution layer
 *
 * This is the CRITICAL security layer between the orchestrator and external APIs.
 *
 * Flow:
 *   Orchestrator → Intermediary → Auth0 Management API → External API
 *
 * Responsibilities:
 *  1. Fetch the user's OAuth access token for a given service from Auth0
 *  2. Validate that the user actually connected that service
 *  3. Return the token to the calling agent for API use
 *
 * ⚠️  Tokens are NEVER cached to disk or stored in MongoDB.
 *      They are fetched fresh per-request from Auth0.
 */

const axios = require('axios');

// In-memory token for the Auth0 Management API (refreshed as needed)
let mgmtApiToken = null;
let mgmtTokenExpiry = null;

/**
 * getMgmtApiToken — Gets a Management API token from Auth0.
 * These tokens expire, so we cache them in memory until expiry.
 *
 * @returns {Promise<string>} Auth0 Management API access token
 */
const getMgmtApiToken = async () => {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
  if (mgmtApiToken && mgmtTokenExpiry && now < mgmtTokenExpiry - 60000) {
    return mgmtApiToken;
  }

  console.log('[Intermediary] Fetching new Auth0 Management API token...');

  const response = await axios.post(
    `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    {
      grant_type: 'client_credentials',
      client_id: process.env.AUTH0_MGMT_CLIENT_ID,
      client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET,
      audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
    }
  );

  mgmtApiToken = response.data.access_token;
  // expires_in is in seconds — convert to ms absolute timestamp
  mgmtTokenExpiry = now + response.data.expires_in * 1000;

  return mgmtApiToken;
};

/**
 * getUserToken — Fetch the OAuth token for a specific service for a user.
 *
 * Auth0 stores the connected social tokens under the user's identity.
 * We retrieve them via the Management API's GET /api/v2/users/{id} endpoint.
 *
 * @param {string} auth0UserId - The user's Auth0 ID (e.g. "auth0|64a3c...")
 * @param {string} service - Service name: 'gmail' | 'github' | 'google_calendar'
 * @returns {Promise<string>} The OAuth access token for the service
 */
const getUserToken = async (auth0UserId, service) => {
  // Map our service names to Auth0 connection names
  const serviceToConnection = {
    gmail: 'google-oauth2',
    google_calendar: 'google-oauth2',
    github: 'github',
  };

  const connection = serviceToConnection[service];
  if (!connection) {
    throw new Error(`Unknown service: ${service}`);
  }

  const mgmtToken = await getMgmtApiToken();

  // Fetch user identities from Auth0
  const response = await axios.get(
    `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(auth0UserId)}`,
    {
      headers: { Authorization: `Bearer ${mgmtToken}` },
      params: { fields: 'identities' },
    }
  );

  const identities = response.data.identities || [];

  // Find the identity that matches the requested connection
  const identity = identities.find((id) => id.connection === connection);

  if (!identity) {
    throw new Error(
      `User has not connected ${service}. Please connect it from the Services page.`
    );
  }

  if (!identity.access_token) {
    throw new Error(
      `No access token found for ${service}. The user may need to reconnect.`
    );
  }

  console.log(`[Intermediary] Token retrieved for ${service} ✅`);
  return identity.access_token;
};

/**
 * executeWithToken — High-level helper that fetches a token and runs a callback.
 * This is what agents call to execute API operations.
 *
 * @param {string} auth0UserId - The user's Auth0 ID
 * @param {string} service - Service name
 * @param {Function} callback - async (token) => { ... your API call ... }
 * @returns {Promise<any>} Result of the callback
 */
const executeWithToken = async (auth0UserId, service, callback) => {
  const token = await getUserToken(auth0UserId, service);
  return callback(token);
};

module.exports = { getUserToken, executeWithToken };
