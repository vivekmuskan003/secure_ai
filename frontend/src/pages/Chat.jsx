/**
 * pages/Chat.jsx — AI Chat Interface
 *
 * Features:
 *  - Scrollable chat history with user/assistant bubbles
 *  - Typing indicator (3-dot bounce animation)
 *  - Loading spinner while waiting for response
 *  - Agent tags on AI responses (shows which agents were used)
 *  - Persistent chat sessions (chat ID tracked in state)
 *  - Suggested prompts for new users
 *
 * Message flow:
 *  1. User types and hits Enter or Send
 *  2. Message added to local state immediately (optimistic UI)
 *  3. POST /api/chat/message → orchestrator
 *  4. Response replaces the "typing" placeholder
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../context/AuthContext';
import { sendChatMessage } from '../services/api';
import TypingIndicator from '../components/TypingIndicator';

// Quick-start prompt suggestions
const SUGGESTED_PROMPTS = [
  '📧 Summarize my inbox',
  '📅 Schedule a meeting for tomorrow',
  '🐙 List my GitHub repositories',
  '✉️ Send an email to boss@company.com saying I\'ll be late',
  '📋 Create a GitHub issue for "Fix login bug"',
  '🗓️ What events do I have this week?',
];

// Tag colors per agent
const AGENT_COLORS = {
  email:    'bg-red-500/15 text-red-400 border-red-500/30',
  github:   'bg-slate-500/15 text-slate-300 border-slate-400/30',
  calendar: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

export default function Chat() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hello! I'm your AI assistant. I can help you manage your emails, GitHub, and calendar. What would you like to do?",
      agents: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = useCallback(async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || isTyping) return;

    // Clear input
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message immediately (optimistic)
    const userMsg = { role: 'user', content: text, agents: [] };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const token = getToken();
      if (!token) return;
      const result = await sendChatMessage(token, text, chatId);

      // Save chat ID for session continuity
      if (result.chatId) setChatId(result.chatId);

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.response,
          agents: result.agentResults?.filter((r) => !r.error).map((r) => r.agent) || [],
          provider: result.provider,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Something went wrong: ${err.response?.data?.error || err.message}`,
          agents: [],
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [input, isTyping, chatId, getToken]);

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (idx) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - (messages.length - idx));
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen pt-16">
      {/* Chat header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/5 bg-dark-800/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-purple-600 flex items-center justify-center shadow-sm shadow-teal-500/30">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white">AI Orchestrator</div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Online · Email, GitHub, Calendar agents ready
            </div>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Suggested prompts (only when just greeting shown) */}
          {messages.length === 1 && (
            <div className="animate-fade-in">
              <p className="text-xs text-slate-500 text-center mb-4">Try one of these:</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt.replace(/^[^\s]+ /, ''))}
                    className="px-3 py-2.5 rounded-xl text-xs text-slate-300 text-left bg-white/4 border border-white/8 hover:bg-white/8 hover:border-teal-500/30 hover:text-teal-300 transition-all duration-200"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-purple-600 flex-shrink-0 flex items-center justify-center mt-1">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                  </svg>
                </div>
              )}

              <div className={`flex flex-col gap-1.5 max-w-xs sm:max-w-md lg:max-w-lg ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {/* Bubble */}
                <div className={msg.role === 'user' ? 'bubble-user' : `bubble-assistant ${msg.isError ? 'border-red-500/30' : ''}`}>
                  {/* Preserve newlines in response */}
                  {msg.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < msg.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>

                {/* Agent tags + timestamp */}
                <div className="flex items-center gap-2 flex-wrap">
                  {msg.agents?.map((agent) => (
                    <span
                      key={agent}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${AGENT_COLORS[agent] || 'bg-purple-500/15 text-purple-400 border-purple-500/30'}`}
                    >
                      {agent}
                    </span>
                  ))}
                  <span className="text-xs text-slate-600">{formatTime(idx)}</span>
                  {msg.provider && (
                    <span className="text-xs text-slate-700">via {msg.provider}</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && <TypingIndicator />}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-white/5 bg-dark-800/60 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 glass-card p-2 glow-teal">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask your AI agents anything... (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-slate-600 resize-none text-sm py-2 px-2 focus:outline-none leading-relaxed"
              disabled={isTyping}
              id="chat-input"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              id="btn-send-message"
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-purple-600 flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:from-teal-400 hover:to-purple-500 transition-all duration-200 active:scale-95 shadow-lg shadow-teal-500/20"
            >
              {isTyping ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}
            </button>
          </div>
          <p className="text-center text-xs text-slate-700 mt-2">
            AI agents have access to your connected services • Powered by Groq + Gemini
          </p>
        </div>
      </div>
    </div>
  );
}
