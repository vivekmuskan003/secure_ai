/**
 * components/Navbar.jsx — Top navigation bar
 *
 * Shows:
 *  - App logo/name
 *  - Navigation links (Dashboard, Chat)
 *  - User avatar + name
 *  - Logout button
 *  - Connected service badges
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Mini service badge icons as SVG
const SERVICE_ICONS = {
  gmail: (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  ),
  google_calendar: (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
      <path d="M18.316 5.684H24v12.632h-5.684zM5.684 24h12.632v-5.684H5.684zM0 18.316h5.684V5.684H0zm5.684-18.316v5.684h12.632V0zm.83 13.977 1.344-1.105.877 1.04.007.009-1.344 1.105zm3.374-3.49 1.344-1.105.878 1.04.006.008-1.344 1.105z"/>
    </svg>
  ),
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Get connected services from localStorage (set after service selection)
  const connectedServices = JSON.parse(
    localStorage.getItem('connectedServices') || '[]'
  );

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/services', label: 'Services' },
  ];

  if (connectedServices.includes('gmail')) navLinks.splice(1, 0, { to: '/inbox', label: 'Inbox' });
  if (connectedServices.includes('github')) navLinks.splice(1, 0, { to: '/repos', label: 'Repos' });
  if (connectedServices.includes('google_calendar')) navLinks.splice(1, 0, { to: '/calendar', label: 'Calendar' });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-2 border-b border-border-glass bg-bg-primary transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-purple-600 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/40 transition-shadow">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="font-bold text-main text-lg hidden sm:block">
            Secure<span className="gradient-text"> AI</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === to
                  ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/30'
                  : 'text-muted hover:text-main hover:bg-surface-glass'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right side: services + user */}
        <div className="flex items-center gap-3">
          {/* Connected service badges */}
          <div className="hidden sm:flex items-center gap-1.5">
            {connectedServices.map((service) => (
              <div
                key={service}
                className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400"
                title={service}
              >
                {SERVICE_ICONS[service]}
              </div>
            ))}
          </div>

          {/* User avatar */}
          {user && (
            <div className="flex items-center gap-2">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user?.name || user?.email}
                  className="w-8 h-8 rounded-full border-2 border-teal-500/40 object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-teal-500/20 border-2 border-teal-500/40 text-teal-400 flex items-center justify-center font-bold uppercase text-xs">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
                </div>
              )}
              <span className="text-sm text-main font-medium hidden lg:block">{user.name}</span>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors hover:bg-surface-glass text-muted hover:text-accent-primary"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Logout button */}
          <button
            onClick={() => {
              logout();
              // Small delay to let states update before any hard navigations
              setTimeout(() => { window.location.href = '/'; }, 100);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-muted hover:text-red-500 hover:bg-red-500/10 border border-border-glass hover:border-red-500/30 transition-all duration-200"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
