/**
 * models/Log.js — Mongoose schema for agent action logs
 *
 * Every time an agent executes an action (send email, create issue, etc.)
 * we write a log entry. This powers the Admin monitoring panel.
 */

const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    // MongoDB User ID of the user who triggered the action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Which agent handled this action
    // 'email' | 'coding' | 'scheduling' | 'orchestrator'
    agent: {
      type: String,
      enum: ['email', 'coding', 'scheduling', 'orchestrator', 'system'],
      required: true,
    },

    // Human-readable description of the action taken
    action: {
      type: String,
      required: true,
    },

    // Result of the action
    status: {
      type: String,
      enum: ['success', 'error', 'pending'],
      default: 'pending',
    },

    // Extra details (e.g. email subject, issue title, error message)
    detail: {
      type: String,
      default: '',
    },

    // Duration of the action in milliseconds
    durationMs: {
      type: Number,
      default: 0,
    },

    // The raw user message that triggered this action
    userMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // createdAt tells us when the action happened
  }
);

// Index for fast admin queries by date
logSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Log', logSchema);
