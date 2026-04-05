/**
 * pages/Admin.jsx — Admin monitoring panel
 *
 * Route: /home/admin
 *
 * Features:
 *  - Login form (Basic Auth against ADMIN_EMAIL / ADMIN_PASSWORD from .env)
 *  - System stats overview (users, chats, logs, errors)
 *  - Users table (paginated)
 *  - Agent logs table (filterable by agent/status)
 *
 * Security: Credentials are base64-encoded and sent as Basic Auth header.
 * Credentials never stored beyond the current browser session.
 */

import React, { useState } from 'react';
import {
  createAdminAuth,
  getAdminStats,
  getAdminUsers,
  getAdminLogs,
} from '../services/api';

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, icon }) => (
  <div className="glass-card p-5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
    </div>
    <p className="text-slate-400 text-sm font-medium">{label}</p>
  </div>
);

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const styles = {
    success: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    error:   'bg-red-500/15 text-red-400 border-red-500/30',
    pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
};

export default function Admin() {
  // Auth state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuth, setAdminAuth] = useState(null);
  const [authError, setAuthError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Data state
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('stats');
  const [dataLoading, setDataLoading] = useState(false);

  // Handle admin login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) return;

    setLoginLoading(true);
    setAuthError('');

    try {
      const auth = createAdminAuth(adminEmail, adminPassword);

      // Validate by fetching stats
      const statsData = await getAdminStats(auth);
      setAdminAuth(auth);
      setStats(statsData);

      // Pre-load users and logs
      const [usersData, logsData] = await Promise.all([
        getAdminUsers(auth),
        getAdminLogs(auth),
      ]);
      setUsers(usersData.users || []);
      setLogs(logsData.logs || []);
    } catch (err) {
      if (err.response?.status === 403) {
        setAuthError('Invalid admin credentials. Check ADMIN_EMAIL and ADMIN_PASSWORD in .env');
      } else {
        setAuthError(`Connection error: ${err.message}`);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const refreshData = async (tab) => {
    if (!adminAuth) return;
    setDataLoading(true);
    try {
      if (tab === 'stats' || tab === 'stats') {
        const data = await getAdminStats(adminAuth);
        setStats(data);
      } else if (tab === 'users') {
        const data = await getAdminUsers(adminAuth);
        setUsers(data.users || []);
      } else if (tab === 'logs') {
        const data = await getAdminLogs(adminAuth);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Refresh error:', err.message);
    } finally {
      setDataLoading(false);
    }
  };

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!adminAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Admin Access</h1>
            <p className="text-slate-500 text-sm">Secure management panel</p>
          </div>

          <form onSubmit={handleLogin} className="glass-card p-8">
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  id="admin-email-input"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Admin Password
                </label>
                <input
                  type="password"
                  id="admin-password-input"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  required
                />
              </div>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {authError}
              </div>
            )}

            <button
              type="submit"
              id="btn-admin-login"
              disabled={loginLoading}
              className="btn-primary w-full justify-center flex items-center gap-2"
            >
              {loginLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </>
              ) : 'Access Admin Panel →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Admin dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-8 pb-12 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-500 text-sm">System monitoring & management</p>
          </div>
          <button
            onClick={() => { setAdminAuth(null); setStats(null); }}
            className="btn-ghost text-sm py-2"
          >
            Sign out
          </button>
        </div>

        {/* Stats overview */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Users" value={stats.totalUsers} color="text-teal-400" icon="👥" />
            <StatCard label="Total Chats" value={stats.totalChats} color="text-purple-400" icon="💬" />
            <StatCard label="Agent Logs" value={stats.totalLogs} color="text-blue-400" icon="📋" />
            <StatCard label="Errors (24h)" value={stats.recentErrors} color="text-red-400" icon="⚠️" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 glass-card w-fit">
          {['stats', 'users', 'logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); refreshData(tab); }}
              className={`px-5 py-2 rounded-xl text-sm font-medium capitalize transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'stats' ? '📊 Stats' : tab === 'users' ? '👥 Users' : '📋 Logs'}
            </button>
          ))}
        </div>

        {dataLoading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Stats tab */}
        {activeTab === 'stats' && !dataLoading && stats && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-white font-semibold mb-4">Agent Usage</h3>
              <div className="space-y-3">
                {stats.agentUsage?.map(({ _id, count }) => (
                  <div key={_id} className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm capitalize">{_id}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-purple-500 rounded-full"
                          style={{ width: `${Math.min(100, (count / Math.max(...stats.agentUsage.map(a => a.count))) * 100)}%` }}
                        />
                      </div>
                      <span className="text-slate-400 text-xs w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-6">
              <h3 className="text-white font-semibold mb-4">Connected Services</h3>
              <div className="space-y-3">
                {stats.serviceStats?.filter(s => s._id).map(({ _id, count }) => (
                  <div key={_id} className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm capitalize">{_id.replace('_', ' ')}</span>
                    <span className="badge-connected">{count} users</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users tab */}
        {activeTab === 'users' && !dataLoading && (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Services</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-4 text-sm text-slate-200">{u.email}</td>
                      <td className="px-5 py-4 text-sm text-slate-400">{u.name || '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {u.connectedServices?.length > 0
                            ? u.connectedServices.map((s) => (
                                <span key={s} className="badge-connected text-xs">{s.replace('google_', '')}</span>
                              ))
                            : <span className="badge-disconnected text-xs">none</span>
                          }
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12 text-slate-600">No users found</div>
              )}
            </div>
          </div>
        )}

        {/* Logs tab */}
        {activeTab === 'logs' && !dataLoading && (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Agent</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">Detail</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-4 text-sm">
                        <span className="capitalize text-purple-400">{log.agent}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-300">{log.action}</td>
                      <td className="px-5 py-4"><StatusBadge status={log.status} /></td>
                      <td className="px-5 py-4 text-xs text-slate-500 hidden lg:table-cell max-w-xs truncate">{log.detail}</td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <div className="text-center py-12 text-slate-600">No logs found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
