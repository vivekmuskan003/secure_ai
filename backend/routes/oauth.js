/**
 * routes/oauth.js — Native OAuth flow trigger paths
 */
const express = require('express');
const router = express.Router();
const {
  startGoogleOAuth,
  googleCallback,
  startGithubOAuth,
  githubCallback,
} = require('../controllers/oauthController');

router.get('/google', startGoogleOAuth);
router.get('/google/callback', googleCallback);

router.get('/github', startGithubOAuth);
router.get('/github/callback', githubCallback);

module.exports = router;
