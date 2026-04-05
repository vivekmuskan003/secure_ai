/**
 * components/TypingIndicator.jsx — Chat typing animation
 *
 * Shows three bouncing dots to indicate the AI is "thinking".
 * Uses Tailwind's animate-bounce with staggered delays.
 */

import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 animate-fade-in">
      {/* AI avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
        </svg>
      </div>

      {/* Typing bubble */}
      <div className="bubble-assistant flex items-center gap-1.5 px-4 py-3">
        <span
          className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}
