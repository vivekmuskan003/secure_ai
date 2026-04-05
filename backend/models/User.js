/**
 * models/User.js — Extended user schema supporting local + OAuth auth
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: undefined },       // E.164 format e.g. +919876543210
    picture: { type: String, default: '' },
    importantEmails: { type: [String], default: [] },   // List of senders or company domains
    importantEvents: { type: [String], default: [] },   // List of Google Event IDs

    // ── Auth ──────────────────────────────────────────────────────────────────
    // Password is null for OAuth-only users
    password: { type: String, default: null },
    // 'local' = email+password, 'google' = Auth0/Google, 'phone' = phone OTP
    authProvider: {
      type: String,
      enum: ['local', 'google', 'phone'],
      default: 'local',
    },
    // Auth0 user ID — only set for Google OAuth users
    auth0Id: { type: String, default: undefined },

    // ── Verification ──────────────────────────────────────────────────────────
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },

    // ── Connected Services ────────────────────────────────────────────────────
    connectedServices: {
      type: [String],
      enum: ['gmail', 'github', 'google_calendar'],
      default: [],
    },

    // ── OAuth Tokens ──────────────────────────────────────────────────────────
    // Securely stores access/refresh tokens for connected external APIs
    oauthTokens: {
      github: {
        accessToken: { type: String, default: null },
        username: { type: String, default: null },
      },
      google: {
        accessToken: { type: String, default: null },
        refreshToken: { type: String, default: null },
        expiryDate: { type: Number, default: null },
      }
    },

    // ── Meta ──────────────────────────────────────────────────────────────────
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure only actual string values are indexed for uniqueness
userSchema.index(
  { auth0Id: 1 },
  { unique: true, partialFilterExpression: { auth0Id: { $type: 'string' } } }
);
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
);

module.exports = mongoose.model('User', userSchema);
