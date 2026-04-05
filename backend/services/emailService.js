/**
 * services/emailService.js — Nodemailer email service
 *
 * Sends OTP emails using SMTP (Gmail by default).
 * Falls back to console.log in development if EMAIL_USER is not set.
 *
 * Setup:
 *  1. Use a Gmail address as EMAIL_USER
 *  2. Generate an App Password at myaccount.google.com/apppasswords
 *  3. Set EMAIL_PASS=<app-password> (NOT your regular Gmail password)
 */

const nodemailer = require('nodemailer');

// Create transport lazily
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null; // dev fallback — log to console
  }

  _transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return _transporter;
};

/**
 * sendOTPEmail — Send a 6-digit OTP to the given email address
 *
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit code
 * @param {string} type - 'signup' | 'login' | 'forgot_password'
 */
const sendOTPEmail = async (email, otp, type) => {
  const subjects = {
    signup: '✅ Verify your email — Secure AI Platform',
    login: '🔐 Your login OTP — Secure AI Platform',
    forgot_password: '🔑 Reset your password — Secure AI Platform',
  };

  const messages = {
    signup: `Your email verification code is:`,
    login: `Your one-time login code is:`,
    forgot_password: `Your password reset code is:`,
  };

  const subject = subjects[type] || '🔑 Your OTP — Secure AI Platform';
  const message = messages[type] || 'Your OTP code is:';

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a1628; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #14b8a6, #8b5cf6); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">Secure AI Platform</h1>
      </div>
      <div style="padding: 40px 32px;">
        <p style="color: #94a3b8; font-size: 16px; margin-bottom: 8px;">${message}</p>
        <div style="background: #060d20; border: 1px solid rgba(20,184,166,0.3); border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #14b8a6;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">This code expires in <strong style="color: #94a3b8;">10 minutes</strong>.</p>
        <p style="color: #64748b; font-size: 13px;">If you didn't request this, please ignore this email.</p>
      </div>
      <div style="padding: 16px 32px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
        <p style="color: #475569; font-size: 12px; margin: 0;">🔒 Secure AI Platform · Your data is never sold</p>
      </div>
    </div>
  `;

  const transporter = getTransporter();

  if (!transporter) {
    // Dev mode — print OTP to console so you can test without SMTP
    console.log(`\n📧 [DEV EMAIL] To: ${email}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   OTP: ${otp}\n`);
    return { success: true, dev: true };
  }

  await transporter.sendMail({
    from: `"Secure AI Platform" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  });

  console.log(`[Email] OTP sent to ${email} ✅`);
  return { success: true };
};

module.exports = { sendOTPEmail };
