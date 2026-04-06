/**
 * services/emailService.js — Nodemailer email service
 *
 * Sends OTP emails using SMTP (Gmail).
 * Falls back to console.log in development if EMAIL_USER is not set.
 *
 * Setup:
 *  1. Use a Gmail address as EMAIL_USER
 *  2. Generate an App Password at myaccount.google.com/apppasswords
 *     (requires 2FA enabled on your Google account)
 *  3. Set EMAIL_PASS=<16-char app password> — NOT your regular Gmail password
 *
 * Railway note: explicit host/port is used instead of service:'gmail'
 * because Railway's networking is more reliable with direct SMTP config.
 */

const nodemailer = require('nodemailer');

// Singleton transporter — created once, reused for all sends
let _transporter = null;

/**
 * getTransporter — Returns a configured Nodemailer transport.
 * Returns null in dev mode (no EMAIL_USER set) → OTP printed to console.
 */
const getTransporter = () => {
  if (_transporter) return _transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null; // dev fallback
  }

  _transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,           // STARTTLS — required for port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000, // 10s — fail fast on Railway
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: true,
    },
  });

  return _transporter;
};

/**
 * sendOTPEmail — Send a 6-digit OTP to the given email address.
 * Never throws — returns { success, dev?, error? } so callers can decide
 * whether to surface the failure to the user.
 *
 * @param {string} email - Recipient email
 * @param {string} otp   - 6-digit code
 * @param {string} type  - 'signup' | 'login' | 'forgot_password'
 * @returns {Promise<{ success: boolean, dev?: boolean, error?: string }>}
 */
const sendOTPEmail = async (email, otp, type) => {
  const subjects = {
    signup:          '✅ Verify your email — Secure AI Platform',
    login:           '🔐 Your login OTP — Secure AI Platform',
    forgot_password: '🔑 Reset your password — Secure AI Platform',
  };

  const messages = {
    signup:          'Your email verification code is:',
    login:           'Your one-time login code is:',
    forgot_password: 'Your password reset code is:',
  };

  const subject = subjects[type] || '🔑 Your OTP — Secure AI Platform';
  const message = messages[type] || 'Your OTP code is:';

  const html = `
    <div style="font-family:'Inter',Arial,sans-serif;max-width:480px;margin:0 auto;background:#0a1628;color:#e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#14b8a6,#8b5cf6);padding:32px;text-align:center;">
        <h1 style="margin:0;color:white;font-size:24px;font-weight:700;">Secure AI Platform</h1>
      </div>
      <div style="padding:40px 32px;">
        <p style="color:#94a3b8;font-size:16px;margin-bottom:8px;">${message}</p>
        <div style="background:#060d20;border:1px solid rgba(20,184,166,0.3);border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#14b8a6;">${otp}</span>
        </div>
        <p style="color:#64748b;font-size:14px;">This code expires in <strong style="color:#94a3b8;">10 minutes</strong>.</p>
        <p style="color:#64748b;font-size:13px;">If you didn't request this, please ignore this email.</p>
      </div>
      <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
        <p style="color:#475569;font-size:12px;margin:0;">🔒 Secure AI Platform · Your data is never sold</p>
      </div>
    </div>
  `;

  const transporter = getTransporter();

  // Dev mode — no SMTP configured
  if (!transporter) {
    console.log(`\n📧 [DEV EMAIL] To: ${email}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   OTP: ${otp}\n`);
    return { success: true, dev: true };
  }

  try {
    await transporter.sendMail({
      from: `"Secure AI Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });
    console.log(`[Email] OTP sent to ${email} ✅`);
    return { success: true };
  } catch (err) {
    // Reset transporter so next call gets a fresh connection attempt
    _transporter = null;
    console.error(`[Email] Failed to send OTP to ${email}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendOTPEmail };
