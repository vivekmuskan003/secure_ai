/**
 * routes/auth.js — All authentication routes
 */
const express = require('express');
const router = express.Router();
const { verifyLocalToken } = require('../middleware/localAuth');
const {
  register, verifyEmail, login,
  sendPhoneOTP, verifyPhoneOTP,
  forgotPassword, resetPassword,
  resendOTP, getMe, syncUser,
} = require('../controllers/authController');

// ── Public routes (no token needed) ──────────────────────────────────────────
router.post('/register',          register);
router.post('/verify-email',      verifyEmail);
router.post('/login',             login);
router.post('/send-phone-otp',    sendPhoneOTP);
router.post('/verify-phone-otp',  verifyPhoneOTP);
router.post('/forgot-password',   forgotPassword);
router.post('/reset-password',    resetPassword);
router.post('/resend-otp',        resendOTP);

// Google OAuth sync — called after Auth0 returns
router.post('/sync', syncUser);

// ── Protected routes ──────────────────────────────────────────────────────────
router.get('/me', verifyLocalToken, getMe);

module.exports = router;
