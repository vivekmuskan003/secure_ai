/**
 * pages/ServiceSelection.jsx — OAuth Service Connection Page
 *
 * Step 1 in the user flow after login.
 * Users connect Gmail, GitHub, and/or Google Calendar via Auth0 OAuth.
 *
 * Flow:
 *  1. User clicks "Connect Gmail"
 *  2. Auth0 loginWithRedirect() with the gmail connection
 *  3. Auth0 handles OAuth, stores tokens in Token Vault
 *  4. Backend is notified via connectService() API call
 *  5. User can then go to Dashboard
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../context/AuthContext';
import { getServiceStatus, connectService, disconnectService } from '../services/api';

// Service definitions — icons, colors, scopes
const SERVICES = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Read, send, and summarize your emails with AI assistance.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
      </svg>
    ),
    connection: 'google-oauth2',
    color: 'from-red-500/20 to-orange-500/20',
    borderColor: 'hover:border-red-500/40',
    badgeColor: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Access repositories, create issues, and track your code.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
    connection: 'github',
    color: 'from-slate-500/20 to-slate-600/20',
    borderColor: 'hover:border-slate-400/40',
    badgeColor: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Schedule meetings and manage your calendar events effortlessly.',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="2"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    connection: 'google-oauth2',
    color: 'from-blue-500/20 to-teal-500/20',
    borderColor: 'hover:border-blue-500/40',
    badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
];

export default function ServiceSelection() {
  const { loginWithRedirect } = useAuth0();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connected, setConnected] = useState({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);

  // Load current connection status on mount
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const { status } = await getServiceStatus(token);
        
        // Check if we just returned from OAuth callback
        const oauthSuccess = searchParams.get('oauth_success');
        const oauthError = searchParams.get('oauth_error');

        if (oauthSuccess || oauthError) {
          // Clear URL parameters immediately so they don't persist on refresh
          setSearchParams({});

          if (oauthSuccess) {
            // Note: status is already fetched above, but it might not include 
            // the new connection yet if the backend was slow. 
            // We'll let the next refresh handle it or do a small extra delay fetch.
            // For now, the user can just see the updated status on next mount or refresh.
            // But let's trigger one more fetch just in case.
            const updatedStatus = await getServiceStatus(token);
            setConnected(updatedStatus.status);
          }

          if (oauthError === 'no_credentials') {
            alert(
              "⚠️ Real OAuth Requires Developer Keys!\n\n" +
              "You requested native OAuth. To make this work, you must add:\n" +
              "- GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET\n" +
              "- GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET\n" +
              "to your backend/.env file."
            );
          } else if (oauthError) {
            alert(`OAuth Error: ${oauthError}`);
          }
        } else {
          // Normal mount: just set what we fetched
          setConnected(status);
        }

        localStorage.setItem(
          'connectedServices',
          JSON.stringify(Object.keys(status).filter((k) => status[k]))
        );
      } catch (err) {
        console.error('Failed to load service status:', err.message);
      } finally {
        setLoading(false);
      }
    };
    loadStatus();
  }, [getToken, searchParams, setSearchParams]);

  // Handle service connection click
  const handleConnect = (service) => {
    if (connected[service.id]) return; // Already connected

    setConnecting(service.id);
    
    const token = getToken();
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // Redirect browser to our Native Node.js OAuth endpoints
    if (service.id === 'github') {
      window.location.href = `${API_BASE}/api/oauth/github?token=${token}`;
    } else {
      window.location.href = `${API_BASE}/api/oauth/google?token=${token}`;
    }
  };

  // Handle service disconnection
  const handleDisconnect = async (service) => {
    setConnecting(service.id);
    try {
      const token = getToken();
      if (!token) return;

      // Mark as disconnected in MongoDB
      await disconnectService(token, service.id);

      // Update local state
      const newConnected = { ...connected };
      delete newConnected[service.id];
      setConnected(newConnected);

      localStorage.setItem(
        'connectedServices',
        JSON.stringify(Object.keys(newConnected).filter((k) => newConnected[k]))
      );
    } catch (err) {
      console.error(`Failed to disconnect ${service.name}:`, err.message);
      alert(`Failed to disconnect ${service.name}. Please try again.`);
    } finally {
      setConnecting(null);
    }
  };

  const anyConnected = Object.values(connected).some(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            Step 1 of 2
          </div>
          <h1 className="page-title text-4xl">Connect Your Services</h1>
          <p className="text-slate-400 mt-3 text-base max-w-md mx-auto">
            Choose which apps to connect. Your AI agents will use OAuth — no API keys ever.
          </p>
        </div>

        {/* Service cards */}
        <div className="grid gap-4 mb-10">
          {SERVICES.map((service, idx) => {
            const isConnected = connected[service.id];
            const isConnecting = connecting === service.id;

            return (
              <div
                key={service.id}
                className={`service-card ${service.borderColor} animate-fade-in`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-center gap-5">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center flex-shrink-0 border border-white/10`}>
                    {service.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                      {isConnected && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${service.badgeColor}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">{service.description}</p>
                  </div>

                  {/* Action buttons */}
                  {isConnected ? (
                    <div className="flex items-center gap-2">
                       <button
                         onClick={() => {
                           if (service.id === 'gmail') window.open('/inbox', '_blank');
                           if (service.id === 'github') window.open('/repos', '_blank');
                           if (service.id === 'google_calendar') window.open('/calendar', '_blank');
                         }}
                         className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 active:scale-95 shadow-sm shadow-teal-500/10"
                       >
                         Open {service.name.split(' ')[0]} ↗
                       </button>
                       <button
                         onClick={() => handleDisconnect(service)}
                         disabled={isConnecting}
                         className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm items-center flex justify-center min-w-[100px] font-semibold transition-all duration-200 text-slate-400 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 active:scale-95"
                       >
                         {isConnecting ? (
                           <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                         ) : (
                           'Disconnect'
                         )}
                       </button>
                    </div>
                  ) : (
                    <button
                      id={`btn-connect-${service.id}`}
                      onClick={() => handleConnect(service)}
                      disabled={isConnecting}
                      className={`flex-shrink-0 flex items-center justify-center min-w-[124px] px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-teal-500 to-purple-600 text-white hover:from-teal-400 hover:to-purple-500 hover:shadow-lg hover:shadow-teal-500/25 active:scale-95 ${isConnecting ? 'opacity-70 cursor-wait' : ''}`}
                    >
                      {isConnecting ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          Wait...
                        </span>
                      ) : (
                        'Connect →'
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue button */}
        <div className="text-center">
          <button
            onClick={() => navigate('/dashboard')}
            disabled={!anyConnected}
            className="btn-primary text-base px-8 py-3.5 disabled:opacity-40 disabled:cursor-not-allowed"
            id="btn-continue-dashboard"
          >
            {anyConnected ? 'Continue to Dashboard →' : 'Connect at least one service to continue'}
          </button>
          {!anyConnected && (
            <p className="text-slate-600 text-xs mt-3">
              Connect at least one service to enable AI agents
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
