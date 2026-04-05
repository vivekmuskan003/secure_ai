/**
 * services/otpService.js — OTP generation, storage, and verification
 *
 * OTPs are 6-digit codes stored in MongoDB with:
 *  - 10-minute expiry window
 *  - Max 5 verification attempts (brute-force protection)
 *  - Auto-invalidation after use
 */

const crypto = require('crypto');
const OTP = require('../models/OTP');

/**
 * generateOTP — Creates a cryptographically random 6-digit code
 * @returns {string} 6-digit string (e.g. "083421")
 */
const generateOTP = () => {
  // randomInt is cryptographically secure in Node.js
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * createOTP — Generate and store an OTP for the given identifier
 *
 * Deletes any existing unused OTP of the same type first.
 *
 * @param {string} identifier - Email or phone number
 * @param {string} type - OTP type ('email_signup' | 'phone_login' | 'forgot_password' | 'email_login')
 * @returns {Promise<string>} The generated OTP code (to send via email/SMS)
 */
const createOTP = async (identifier, type) => {
  // Delete any existing OTPs for this identifier + type
  await OTP.deleteMany({ identifier: identifier.toLowerCase(), type });

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await OTP.create({
    identifier: identifier.toLowerCase(),
    type,
    code,
    expiresAt,
  });

  return code;
};

/**
 * verifyOTP — Check if the provided OTP code is valid
 *
 * @param {string} identifier - Email or phone number
 * @param {string} type - OTP type
 * @param {string} code - User-provided OTP code
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
const verifyOTP = async (identifier, type, code) => {
  const normalizedId = identifier.toLowerCase();

  const otp = await OTP.findOne({
    identifier: normalizedId,
    type,
    used: false,
    expiresAt: { $gt: new Date() }, // only valid (non-expired)
  });

  if (!otp) {
    return { valid: false, error: 'OTP expired or not found. Please request a new one.' };
  }

  // Track failed attempts
  otp.attempts += 1;
  if (otp.attempts > 5) {
    await otp.save();
    return { valid: false, error: 'Too many failed attempts. Please request a new OTP.' };
  }

  if (otp.code !== code) {
    await otp.save();
    const remaining = 5 - otp.attempts;
    return { valid: false, error: `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` };
  }

  // OTP is correct — mark as used
  otp.used = true;
  await otp.save();

  return { valid: true };
};

module.exports = { createOTP, verifyOTP };
