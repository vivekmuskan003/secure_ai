/**
 * controllers/oauthController.js — Native OAuth flow for external data sources
 */

const { google } = require('googleapis');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Google OAuth ─────────────────────────────────────────────────────────────

const getGoogleClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${BACKEND_URL}/api/oauth/google/callback`
  );
};

const googleScopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

const startGoogleOAuth = (req, res) => {
  const { token } = req.query; // the local JWT
  if (!token) return res.status(401).json({ error: 'Auth token required' });

  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.redirect(`${FRONTEND_URL}/services?oauth_error=no_credentials`);
  }

  const oauth2Client = getGoogleClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // needed for refresh token
    prompt: 'consent', // force refresh token generation
    scope: googleScopes,
    state: token, // pass the JWT so we know who to update on callback
  });

  res.redirect(url);
};

const googleCallback = async (req, res) => {
  const { code, state: token, error } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/services?oauth_error=${error}`);
  }

  try {
    // 1. Verify the state token to find the user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 2. Trade code for tokens
    const oauth2Client = getGoogleClient();
    const { tokens } = await oauth2Client.getToken(code);

    // 3. Save to MongoDB
    const updateQuery = {
      'oauthTokens.google.accessToken': tokens.access_token,
      'oauthTokens.google.expiryDate': tokens.expiry_date,
    };
    
    // Only update refresh token if provided (Google only sends it on first consent)
    if (tokens.refresh_token) {
      updateQuery['oauthTokens.google.refreshToken'] = tokens.refresh_token;
    }

    await User.findByIdAndUpdate(userId, { 
       $set: updateQuery,
       $addToSet: { connectedServices: { $each: ['gmail', 'google_calendar'] } }
    });

    res.redirect(`${FRONTEND_URL}/services?oauth_success=google`);
  } catch (err) {
    console.error('Google Callback Error:', err.message);
    res.redirect(`${FRONTEND_URL}/services?oauth_error=server_error`);
  }
};

// ── GitHub OAuth ─────────────────────────────────────────────────────────────

const startGithubOAuth = (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(401).json({ error: 'Auth token required' });

  if (!process.env.GITHUB_CLIENT_ID) {
    return res.redirect(`${FRONTEND_URL}/services?oauth_error=no_credentials`);
  }

  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user&state=${token}`;
  res.redirect(url);
};

const githubCallback = async (req, res) => {
  const { code, state: token, error } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/services?oauth_error=${error}`);
  }

  try {
    // 1. Verify the state token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // 2. Trade code for access token
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) throw new Error('No access token returned from GitHub');

    // 3. Fetch GitHub username
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 4. Save to MongoDB
    await User.findByIdAndUpdate(userId, {
      $set: {
        'oauthTokens.github.accessToken': accessToken,
        'oauthTokens.github.username': userRes.data.login,
      },
      $addToSet: { connectedServices: 'github' }
    });

    res.redirect(`${FRONTEND_URL}/services?oauth_success=github`);
  } catch (err) {
    console.error('GitHub Callback Error:', err.message);
    res.redirect(`${FRONTEND_URL}/services?oauth_error=server_error`);
  }
};

module.exports = {
  startGoogleOAuth,
  googleCallback,
  startGithubOAuth,
  githubCallback,
};
