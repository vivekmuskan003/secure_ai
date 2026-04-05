import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendChatMessage } from '../services/api';
import TypingIndicator from './TypingIndicator';

const SERVICE_CONFIGS = {
  gmail: {
    title: 'Gmail Assistant',
    placeholder: 'Ask about your emails...',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
      </svg>
    ),
    initialMessage: "Hi! I can help you summarize, search, or even draft emails. What's on your mind?"
  },
  github: {
    title: 'GitHub Assistant',
    placeholder: 'Ask about your repos...',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
    initialMessage: "Hey! I'm ready to help you manage your repositories and issues. What can I do for you today?"
  },
  calendar: {
    title: 'Calendar Assistant',
    placeholder: 'Ask about your events...',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="2"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    initialMessage: "Hello! I can help you check your schedule or book new meetings. What are we planning?"
  }
};

export default function SidebarChat({ service }) {
  const config = SERVICE_CONFIGS[service] || SERVICE_CONFIGS.gmail;
  const { getToken } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: config.initialMessage,
      agents: [service],
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setMessages((prev) => [...prev, { role: 'user', content: text, agents: [] }]);
    setIsTyping(true);

    try {
      const token = getToken();
      if (!token) return;
      
      // Inject service context into message if not already there
      const result = await sendChatMessage(token, `[In ${service} context] ${text}`, chatId);

      if (result.chatId) setChatId(result.chatId);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.response,
          agents: result.agentResults?.filter((r) => !r.error).map((r) => r.agent) || [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error: ${err.response?.data?.error || err.message}`,
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, chatId, getToken, service]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] glass-card overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-border-glass bg-bg-secondary flex items-center justify-between">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="text-xs font-bold text-main">{config.title}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-2.5 rounded-xl text-[12px] leading-snug shadow-sm ${
              msg.role === 'user' 
                ? 'bg-accent-primary text-white rounded-tr-none' 
                : 'bg-surface-glass text-main border border-border-glass rounded-tl-none'
            }`}>
              {msg.content.split('\n').map((line, i) => (
                <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-border-glass bg-bg-secondary">
        <div className="flex items-end gap-2 rounded-lg border border-border-glass bg-surface-glass p-1 focus-within:border-accent-primary transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={config.placeholder}
            rows={1}
            className="flex-1 bg-transparent text-main placeholder-muted resize-none text-[12px] py-1 px-2 focus:outline-none min-h-[32px]"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-7 h-7 rounded-md bg-accent-primary flex items-center justify-center text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
