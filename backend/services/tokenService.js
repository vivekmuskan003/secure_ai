/**
 * services/tokenService.js — Local Token Manager & Refresh Logic
 *
 * This replaces the legacy intermediary.js service.
 * It fetches OAuth tokens directly from our MongoDB User model and handles
 * automatic refreshing for Google (using refresh_token) and GitHub (if applicable).
 */

const axios = require('axios');
const User = require('../models/User');

/**
 * getAccessToken — Main entry point for agents to get a valid OAuth token.
 * 
 * @param {string} userId - MongoDB User ID
 * @param {string} service - 'gmail' | 'github' | 'google_calendar'
 * @returns {Promise<string>} Valid access token
 */
const getAccessToken = async (userId, service) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (service === 'gmail' || service === 'google_calendar') {
    return getGoogleToken(user);
  } else if (service === 'github') {
    return getGithubToken(user);
  }

  throw new Error(`Unsupported service: ${service}`);
};

/**
 * getGoogleToken — Fetches and refreshes Google OAuth tokens if needed.
 */
const getGoogleToken = async (user) => {
  const { accessToken, refreshToken, expiryDate } = user.oauthTokens.google;
  
  if (!accessToken) {
    throw new Error('Google not connected. Please connect from the Services page.');
  }

  // Check if token is expired or expiring soon (within 2 minutes)
  const isExpired = expiryDate && Date.now() > (expiryDate - 120000);

  if (!isExpired) {
    return accessToken;
  }

  // Token is expired, try to refresh
  if (!refreshToken) {
    throw new Error('Google access expired and no refresh token found. Please reconnect.');
  }

  console.log(`[TokenService] Refreshing Google token for user ${user.email}...`);

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const { access_token, expires_in } = response.data;
    const newExpiryDate = Date.now() + (expires_in * 1000);

    // Update database with new token
    user.oauthTokens.google.accessToken = access_token;
    user.oauthTokens.google.expiryDate = newExpiryDate;
    await user.save();

    console.log('[TokenService] Google token refreshed successfully ✅');
    return access_token;
  } catch (err) {
    console.error('[TokenService] Google refresh failed:', err.response?.data || err.message);
    throw new Error('Failed to refresh Google access. Please reconnect your account.');
  }
};

/**
 * getGithubToken — Returns the GitHub access token.
 * (GitHub tokens are generally long-lived, we just return the stored one.)
 */
const getGithubToken = async (user) => {
  const { accessToken } = user.oauthTokens.github;
  if (!accessToken) {
    throw new Error('GitHub not connected. Please connect from the Services page.');
  }
  return accessToken;
};

module.exports = { getAccessToken };
