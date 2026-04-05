/**
 * pages/Dashboard.jsx — Main user dashboard
 *
 * Shows:
 *  - User's connected services with status indicators
 *  - Quick stats (services connected / available)
 *  - "Go to AI Chat" CTA button
 *  - Recent activity preview
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getServiceStatus } from '../services/api';

const SERVICE_META = {
  gmail: {
    name: 'Gmail',
    desc: 'Email reading & sending',
    color: 'from-red-500/20 to-orange-500/20',
    border: 'border-red-500/20',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
      </svg>
    ),
  },
  github: {
    name: 'GitHub',
    desc: 'Repos & issues',
    color: 'from-slate-500/20 to-slate-600/20',
    border: 'border-slate-500/20',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
  },
  google_calendar: {
    name: 'Calendar',
    desc: 'Events & scheduling',
    color: 'from-blue-500/20 to-teal-500/20',
    border: 'border-blue-500/20',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="2"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8 14h.01M12 14h.01M12 18h.01" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
};

// Example AI capabilities shown as chips
const CAPABILITIES = [
  { icon: '📧', text: 'Send & summarize emails' },
  { icon: '📅', text: 'Schedule meetings' },
  { icon: '🐙', text: 'Create GitHub issues' },
  { icon: '🤖', text: 'Multi-task in one message' },
  { icon: '🔍', text: 'Search your inbox' },
  { icon: '📊', text: 'Summarize your repos' },
];

export default function Dashboard() {
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const { status } = await getServiceStatus(token);
        setServices(status);
      } catch (err) {
        console.error('Dashboard load error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const connectedCount = Object.values(services).filter(Boolean).length;
  const totalCount = Object.keys(SERVICE_META).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Welcome hero */}
        <div className="glass-card p-5 md:p-6 mb-4 animate-fade-in" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.05) 0%, rgba(139,92,246,0.05) 100%)' }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-accent-primary text-xs font-semibold mb-1 uppercase tracking-wider">Welcome back 👋</p>
              <h1 className="text-2xl font-bold text-main mb-0.5">
                {user?.name || 'User'}
              </h1>
              <p className="text-muted text-xs">{user?.email}</p>
            </div>
            <div className="text-left md:text-right">
              <div className="text-3xl font-bold gradient-text">{connectedCount}/{totalCount}</div>
              <div className="text-muted text-[11px] font-bold uppercase tracking-wider">services connected</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">

          {/* Connected Services */}
          <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-main uppercase tracking-tight">Connected Services</h2>
              <Link
                to="/services"
                className="text-[11px] font-bold text-accent-primary hover:underline uppercase tracking-wider"
              >
                Manage →
              </Link>
            </div>

            <div className="space-y-3">
              {Object.entries(SERVICE_META).map(([id, meta]) => {
                const isConnected = services[id];
                return (
                  <div
                    key={id}
                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 ${
                      isConnected
                        ? `bg-gradient-to-r ${meta.color} ${meta.border}`
                        : 'border-white/5 bg-white/2 opacity-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center flex-shrink-0">
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-main">{meta.name}</div>
                      <div className="text-[11px] text-muted">{meta.desc}</div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-teal-400 shadow-sm shadow-teal-400/50 animate-pulse' : 'bg-border-glass'}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Capabilities */}
          <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h2 className="text-base font-bold text-main mb-4 uppercase tracking-tight">What you can do</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {CAPABILITIES.map(({ icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-glass border border-border-glass text-[10px] font-bold uppercase tracking-wide text-muted"
                >
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-accent-primary/10 border border-accent-primary/20">
              <p className="text-main text-xs leading-relaxed">
                <span className="text-accent-primary font-bold uppercase text-[10px] tracking-widest mr-1">Try:</span>{' '}
                "Send an email to John saying I'll be late, then schedule a call for tomorrow 3pm"
              </p>
            </div>
          </div>
        </div>

        {/* CTA — Go to AI Chat */}
        <div className="glass-card p-6 text-center animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-teal-500 to-purple-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-none stroke-white stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-main mb-1 uppercase tracking-tight">Ready to chat with AI?</h2>
          <p className="text-muted text-xs mb-4 max-w-sm mx-auto">
            Your AI agents are ready. Just type what you need — email, code, or calendar.
          </p>
          <button
            onClick={() => navigate('/chat')}
            id="btn-go-to-chat"
            disabled={connectedCount === 0}
            className="btn-primary text-sm px-8 py-2.5 disabled:opacity-40"
          >
            🚀 Open AI Chat
          </button>
          {connectedCount === 0 && (
            <p className="text-slate-600 text-xs mt-3">
              Connect a service first to enable AI agents
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
