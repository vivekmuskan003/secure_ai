/**
 * models/Chat.js — Mongoose schema for chat conversations
 *
 * Each Chat document represents one user's conversation thread.
 * Messages are stored as an embedded array for efficiency.
 */

const mongoose = require('mongoose');

// Individual message schema embedded in Chat
const messageSchema = new mongoose.Schema(
  {
    // 'user' = human message, 'assistant' = AI response
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },

    // The text content of the message
    content: {
      type: String,
      required: true,
    },

    // Which agent(s) contributed to this response
    agents: {
      type: [String],
      default: [],
    },

    // Timestamp of this specific message
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const chatSchema = new mongoose.Schema(
  {
    // Reference to the User document
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // The Auth0 ID — lets us query chats without a DB join
    auth0Id: {
      type: String,
      required: true,
      index: true,
    },

    // Array of messages in conversation order
    messages: [messageSchema],

    // Optional session title (derived from first message)
    title: {
      type: String,
      default: 'New Conversation',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Chat', chatSchema);
