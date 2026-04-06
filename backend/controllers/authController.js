/**
 * controllers/authController.js — Complete auth controller
 *
 * Handles:
 *  - register:         create account + send email OTP
 *  - verifyEmail:      confirm OTP → issue JWT
 *  - login:            email + password → JWT
 *  - sendPhoneOTP:     validate phone → send SMS OTP
 *  - verifyPhoneOTP:   confirm SMS OTP → JWT
 *  - forgotPassword:   send reset OTP to email
 *  - resetPassword:    verify OTP + set new password
 *  - resendOTP:        resend any OTP type
 *  - getMe:            return current user profile
 *  - syncUser:         Auth0 Google OAuth sync
 *
 * Email/SMS sends are always wrapped in try/catch so a delivery failure
 * never crashes the request — the user can always use "Resend code".
 */

const bcrypt = require('bcryptjs');
const { parsePhoneNumber, isValidPhoneNumber } = require('libphonenumber-js');
const User = require('../models/User');
const { createOTP, verifyOTP } = require('../services/otpService');
const { sendOTPEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');
const { issueToken } = require('../middleware/localAuth');

// ── Helpers ───────────────────────────────────────────────────────────────────

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  picture: user.picture,
  isEmailVerified: user.isEmailVerified,
  isPhoneVerified: user.isPhoneVerified,
  connectedServices: user.connectedServices,
  authProvider: user.authProvider,
});

/**
 * trySendEmail — Wrapper that never throws.
 * Returns true if sent, false if failed (already logged inside emailService).
 */
const trySendEmail = async (email, otp, type) => {
  const result = await sendOTPEmail(email, otp, type);
  return result.success;
};

/**
 * trySendSMS — Wrapper that never throws.
 */
const trySendSMS = async (phone, otp) => {
  try {
    await sendSMS(phone, otp);
    return true;
  } catch (err) {
    console.error('[SMS] Failed to send OTP:', err.message);
    return false;
  }
};

// ── Register ──────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { name, email, phone?, password }
 * → Creates user (unverified) and sends email OTP
 */
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    if (phone) {
      try {
        if (!isValidPhoneNumber(phone)) {
          return res.status(400).json({ error: 'Invalid phone number. Please include country code (e.g. +91...).' });
        }
      } catch {
        return res.status(400).json({ error: 'Could not validate phone number. Please include country code.' });
      }
    }

    // Check if already registered
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.isEmailVerified) {
        return res.status(409).json({ error: 'This email is already registered. Please log in.' });
      }
      // Unverified account — resend OTP and let them verify
      const otp = await createOTP(email, 'email_signup');
      const sent = await trySendEmail(email, otp, 'signup');
      return res.json({
        success: true,
        message: sent
          ? 'Account exists but not verified. A new OTP has been sent to your email.'
          : 'Account exists but not verified. Please use "Resend code" to get a new OTP.',
        userId: existing._id,
        emailSent: sent,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      password: hashedPassword,
      authProvider: 'local',
      isEmailVerified: false,
    });

    const otp = await createOTP(email, 'email_signup');
    const sent = await trySendEmail(email, otp, 'signup');

    return res.status(201).json({
      success: true,
      message: sent
        ? 'Account created! Please check your email for the verification code.'
        : 'Account created! We could not send the verification email right now — please use "Resend code" on the next screen.',
      userId: user._id,
      emailSent: sent,
    });
  } catch (err) {
    next(err);
  }
};

// ── Verify Email OTP ──────────────────────────────────────────────────────────

/**
 * POST /api/auth/verify-email
 * Body: { email, code }
 * → Activates account and returns JWT
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and OTP code are required.' });
    }

    const result = await verifyOTP(email, 'email_signup', code);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { isEmailVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const token = issueToken(user);
    return res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

// ── Login (Email + Password) ──────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 * → Returns JWT
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isEmailVerified) {
      // Best-effort resend — don't fail login flow if email fails
      const otp = await createOTP(email, 'email_signup');
      await trySendEmail(email, otp, 'signup');
      return res.status(403).json({
        error: 'Email not verified. A new OTP has been sent to your email.',
        needsVerification: true,
        email,
      });
    }

    user.lastSeen = new Date();
    await user.save();

    const token = issueToken(user);
    return res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

// ── Phone OTP ─────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/send-phone-otp
 * Body: { phone }
 */
const sendPhoneOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    let parsedPhone;
    try {
      parsedPhone = parsePhoneNumber(phone);
      if (!parsedPhone || !parsedPhone.isValid()) {
        return res.status(400).json({
          error: 'Invalid phone number. Please enter a valid number with country code (e.g. +91 98765 43210).',
        });
      }
    } catch {
      return res.status(400).json({ error: 'Could not parse phone number. Please include country code.' });
    }

    const e164Phone = parsedPhone.format('E.164');

    let user = await User.findOne({ phone: e164Phone });
    if (user && user.authProvider !== 'phone') {
      return res.status(400).json({
        error: 'This phone number is already registered with a different login method.',
      });
    }

    if (!user) {
      try {
        user = await User.create({
          name: 'User',
          email: `phone_${e164Phone.replace('+', '')}@placeholder.local`,
          phone: e164Phone,
          authProvider: 'phone',
          isEmailVerified: false,
          isPhoneVerified: false,
        });
      } catch (createErr) {
        if (createErr.code === 11000 && createErr.keyPattern?.phone) {
          return res.status(409).json({
            error: 'A phone login already exists for this number. Please request a new OTP.',
          });
        }
        throw createErr;
      }
    }

    const otp = await createOTP(e164Phone, 'phone_login');
    const sent = await trySendSMS(e164Phone, otp);

    if (!sent) {
      return res.status(500).json({ error: 'Failed to send SMS. Please try again in a moment.' });
    }

    return res.json({
      success: true,
      message: 'OTP sent to your phone.',
      phone: e164Phone,
      country: parsedPhone.country,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/verify-phone-otp
 * Body: { phone, code, name? }
 */
const verifyPhoneOTP = async (req, res, next) => {
  try {
    const { phone, code, name } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and OTP code are required.' });
    }

    const result = await verifyOTP(phone, 'phone_login', code);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.authProvider !== 'phone') {
      return res.status(400).json({
        error: 'This phone number is not linked to a phone login account.',
      });
    }

    const updateData = { isPhoneVerified: true, lastSeen: new Date() };
    if (name) updateData.name = name.trim();
    await User.findOneAndUpdate({ phone }, updateData);

    const token = issueToken(user);
    return res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always respond success — don't reveal whether email exists
    if (user && user.authProvider === 'local') {
      const otp = await createOTP(email, 'forgot_password');
      await trySendEmail(email, otp, 'forgot_password');
    }

    return res.json({
      success: true,
      message: 'If this email is registered, you will receive a reset code shortly.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/reset-password
 * Body: { email, code, newPassword }
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP code, and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const result = await verifyOTP(email, 'forgot_password', code);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { password: hashedPassword, isEmailVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const token = issueToken(user);
    return res.json({ success: true, message: 'Password reset successfully!', token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

// ── Resend OTP ────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/resend-otp
 * Body: { identifier, type }
 */
const resendOTP = async (req, res, next) => {
  try {
    const { identifier, type } = req.body;
    if (!identifier || !type) {
      return res.status(400).json({ error: 'Identifier and type are required.' });
    }

    const otp = await createOTP(identifier, type);

    let sent;
    if (type === 'phone_login') {
      sent = await trySendSMS(identifier, otp);
    } else {
      sent = await trySendEmail(identifier, otp, type === 'forgot_password' ? 'forgot_password' : 'signup');
    }

    if (!sent) {
      return res.status(500).json({ error: 'Failed to send OTP. Please try again in a moment.' });
    }

    return res.json({ success: true, message: 'OTP resent successfully.' });
  } catch (err) {
    next(err);
  }
};

// ── Get Me ────────────────────────────────────────────────────────────────────

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    user.lastSeen = new Date();
    await user.save();
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

// ── Auth0 Google sync ─────────────────────────────────────────────────────────

/**
 * POST /api/auth/sync
 * Used after Auth0 Google OAuth to create/update user and issue local JWT
 */
const syncUser = async (req, res, next) => {
  try {
    const { auth0Id, email, name, picture } = req.body;
    if (!auth0Id || !email) {
      return res.status(400).json({ error: 'auth0Id and email are required.' });
    }

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      {
        $set: {
          auth0Id,
          name: name || email.split('@')[0],
          picture: picture || '',
          lastSeen: new Date(),
          isEmailVerified: true,
        },
        $setOnInsert: { authProvider: 'google', connectedServices: [] },
      },
      { upsert: true, new: true }
    );

    const token = issueToken(user);
    return res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register, verifyEmail, login,
  sendPhoneOTP, verifyPhoneOTP,
  forgotPassword, resetPassword,
  resendOTP, getMe, syncUser,
};
