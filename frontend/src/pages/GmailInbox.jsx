import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchGmailInbox, fetchGmailMessageDetail, getServiceStatus, updatePreferences } from '../services/api';
import SidebarChat from '../components/SidebarChat';

export default function GmailInbox() {
  const { getToken } = useAuth();
  const [emails, setEmails] = useState([]);
  const [importantEmails, setImportantEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedEmailLoading, setSelectedEmailLoading] = useState(false);
  const [selectedEmailError, setSelectedEmailError] = useState(null);
  const [activeFolder, setActiveFolder] = useState('INBOX'); // 'INBOX' or 'SENT'
  const [showOnlyImportant, setShowOnlyImportant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setSelectedEmail(null);
    setSelectedEmailError(null);
    try {
      const token = getToken();
      if (!token) return;
      
      const [gmailRes, statusRes] = await Promise.all([
        fetchGmailInbox(token, activeFolder),
        getServiceStatus(token)
      ]);
      
      setEmails(gmailRes.emails);
      setImportantEmails(statusRes.user?.importantEmails || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Gmail not connected. Please connect from Services page.');
      } else {
        setError(err.message || 'Failed to fetch messages');
      }
    } finally {
      setLoading(false);
    }
  };

  const openEmail = async (id) => {
    setSelectedEmailLoading(true);
    setSelectedEmailError(null);
    try {
      const token = getToken();
      if (!token) return;
      const detail = await fetchGmailMessageDetail(token, id);
      setSelectedEmail(detail);
    } catch (err) {
      setSelectedEmailError(err.response?.data?.error || err.message || 'Unable to load email details');
    } finally {
      setSelectedEmailLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getToken, activeFolder]);

  const toggleImportEmail = async (senderEmail) => {
    const isImportant = importantEmails.includes(senderEmail);
    const action = isImportant ? 'remove' : 'add';
    
    try {
      const token = getToken();
      const res = await updatePreferences(token, { action, type: 'email', value: senderEmail });
      setImportantEmails(res.importantEmails);
    } catch (err) {
      console.error('Failed to update email importance:', err);
    }
  };

  const filteredEmails = useMemo(() => {
    if (!showOnlyImportant) return emails;
    // Basic sender parsing "Name <email@dest.com>" or "email@dest.com"
    return emails.filter(email => {
      const match = email.from.match(/<(.+)>/);
      const senderAddr = match ? match[1] : email.from;
      return importantEmails.includes(senderAddr);
    });
  }, [emails, showOnlyImportant, importantEmails]);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 md:px-8">
      <div className="max-w-[1600px] mx-auto relative flex flex-col lg:flex-row gap-6">
        
        {/* Main Content (3/4 width) */}
        <div className="flex-1 space-y-6 lg:pr-0 xl:pr-[420px]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/10">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-red-500 fill-current">
                   <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-main">Gmail {activeFolder === 'INBOX' ? 'Inbox' : 'Sent'}</h1>
                <p className="text-muted text-xs">Live preview of your recent communications.</p>
                {selectedEmail && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedEmail(null)}
                      className="rounded-full border border-border-glass bg-surface-glass px-3 py-1 text-xs font-semibold text-main transition hover:border-accent-primary hover:text-accent-primary"
                    >
                      Back to inbox
                    </button>
                    <span className="text-[11px] text-muted">Tap it to return to the email list.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex bg-surface-glass p-1 rounded-xl border border-border-glass">
                <button
                  onClick={() => setActiveFolder('INBOX')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFolder === 'INBOX' ? 'bg-white/10 text-main shadow-sm' : 'text-muted hover:text-main'}`}
                >
                  Inbox
                </button>
                <button
                  onClick={() => setActiveFolder('SENT')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFolder === 'SENT' ? 'bg-white/10 text-main shadow-sm' : 'text-muted hover:text-main'}`}
                >
                  Sent
                </button>
              </div>

              {/* Filter Toggle */}
              <div className="flex items-center gap-2 bg-surface-glass p-1 rounded-xl border border-border-glass">
                <button
                  onClick={() => setShowOnlyImportant(false)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${!showOnlyImportant ? 'bg-white/10 text-main shadow-sm' : 'text-muted hover:text-main'}`}
                >
                  All Mail
                </button>
                <button
                  onClick={() => setShowOnlyImportant(true)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${showOnlyImportant ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'text-muted hover:text-main'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Important
                </button>
              </div>
            </div>
          </div>

          {selectedEmail && (
            <div className="glass-card p-5 space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2">From</p>
                  <p className="text-sm text-muted truncate">{selectedEmail.from}</p>
                  <h2 className="text-xl font-semibold text-main mt-2">{selectedEmail.subject}</h2>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted mt-2">
                    {new Date(selectedEmail.date).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEmail(null)}
                  className="text-xs text-muted hover:text-main transition-colors"
                >
                  Close preview
                </button>
              </div>

              {selectedEmailLoading ? (
                <div className="p-6 text-center text-sm text-muted">Loading email content…</div>
              ) : selectedEmailError ? (
                <div className="p-4 text-sm text-red-400">{selectedEmailError}</div>
              ) : (
                <div
                  className="prose prose-invert max-w-none text-sm break-words whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body || selectedEmail.snippet || 'No content available.' }}
                />
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="glass-card bg-red-500/5 border-red-500/20 text-red-500 p-8 rounded-2xl text-center">
              <p className="font-medium">{error}</p>
            </div>
          ) : (
            <div className="grid gap-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
              {filteredEmails.length === 0 ? (
                <div className="p-16 text-center glass-card">
                  <p className="text-muted text-sm">No messages found in your {activeFolder === 'INBOX' ? 'inbox' : 'sent folder'}.</p>
                </div>
              ) : (
                filteredEmails.map((email) => {
                  const match = email.from.match(/<(.+)>/);
                  const senderAddr = match ? match[1] : email.from;
                  const senderName = email.from.split('<')[0].replace(/"/g, '').trim();
                  const isImp = importantEmails.includes(senderAddr);
                  
                  return (
                    <div
                      key={email.id}
                      role="button"
                      onClick={() => openEmail(email.id)}
                      tabIndex={0}
                      className="glass-card rounded-none first:rounded-t-xl last:rounded-b-xl px-4 py-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-all flex items-center gap-4 border-b last:border-b group text-left cursor-pointer"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleImportEmail(senderAddr);
                        }}
                        className={`transition-all ${isImp ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                        aria-label={isImp ? 'Remove from important' : 'Mark as important'}
                      >
                        <svg className="w-4 h-4" fill={isImp ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>

                      <div className="w-32 lg:w-40 flex-shrink-0">
                        <span className={`text-[13px] truncate block ${isImp ? 'font-bold text-main' : 'text-muted'}`}>
                          {senderName || senderAddr}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <span className={`text-[13px] block truncate ${isImp ? 'font-semibold text-main' : 'text-muted'}`}>
                          {email.subject}
                        </span>
                        <p className="text-[11px] text-muted opacity-80 truncate mt-0">{email.snippet}</p>
                      </div>

                      <div className="text-[10px] font-bold text-muted uppercase tracking-tighter w-12 text-right">
                        {new Date(email.date).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Sidebar Chat (right hover panel) */}
        <div className="lg:w-[380px] flex-shrink-0 lg:absolute lg:top-24 lg:right-0 z-20">
          <div className="lg:w-[380px]">
            <SidebarChat service="email" />
          </div>
        </div>

      </div>
    </div>
  );
}
