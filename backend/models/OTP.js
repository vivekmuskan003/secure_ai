/**
 * models/OTP.js — Stores one-time passwords for email/phone verification
 *
 * OTPs auto-expire via MongoDB TTL index (deleted 1 hour after creation).
 * The 10-minute validity window is enforced by the expiresAt field check in code.
 */
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    // Email address or phone number (E.164) this OTP was sent to
    identifier: { type: String, required: true, index: true },

    // What this OTP is for
    type: {
      type: String,
      enum: ['email_signup', 'email_login', 'phone_login', 'forgot_password'],
      required: true,
    },

    // 6-digit numeric code
    code: { type: String, required: true },

    // When this OTP stops being valid (10 minutes from creation)
    expiresAt: { type: Date, required: true },

    // True once used successfully — prevents replay attacks
    used: { type: Boolean, default: false },

    // Track failed attempts — max 5 before lockout
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// MongoDB TTL index — documents are auto-deleted 1 hour after creation
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });
// Compound index for fast lookups
otpSchema.index({ identifier: 1, type: 1 });

module.exports = mongoose.model('OTP', otpSchema);
