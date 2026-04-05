/**
 * services/api.js — Axios API client
 *
 * All backend API calls are centralized here.
 * Functions accept an Auth0 access token and attach it as a Bearer header.
 */

import axios from 'axios';

// Base URL — uses Vite proxy in dev, direct URL in prod
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * createApiClient — Creates an axios instance with the auth token attached
 * @param {string} token - Auth0 access token
 */
const createApiClient = (token) =>
  axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

// ── Auth API ─────────────────────────────────────────────────────────────────

/**
 * syncUserToBackend — Call after Auth0 login to create/update user in MongoDB
 * @param {string} token - Auth0 access token
 * @param {Object} userInfo - { email, name, picture }
 */
export const syncUserToBackend = async (token, userInfo) => {
  const api = createApiClient(token);
  const { data } = await api.post('/api/auth/sync', userInfo);
  return data;
};

// ── Custom Auth API (No token required initially) ────────────────────────────

export const loginWithEmail = async (email, password) => {
  const { data } = await axios.post(`${BASE_URL}/api/auth/login`, { email, password });
  return data;
};

export const registerWithEmail = async (userData) => {
  const { data } = await axios.post(`${BASE_URL}/api/auth/register`, userData);
  return data;
};

export const verifyEmail = async (email, code) => {
  const { data } = await axios.post(`${BASE_URL}/api/auth/verify-email`, { email, code });
  return data;
};

export const sendPhoneOTP = async (phone) => {
  const { data } = await axios.post(`${BASE_URL}/api/auth/send-phone-otp`, { phone });
  return data;
};

export const verifyPhoneOTP = async (phone, code, name) => {
  const { data } = await axios.post(`${BASE_URL}/api/auth/verify-phone-otp`, { phone, code, name });
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await axios.post(`${BASE_URL}/api/auth/forgot-password`, { email });
  return data;
};

export const resetPassword = async (email, code, newPassword) => {
  const { data } = await axios.post(`${BASE_URL}/api/auth/reset-password`, { email, code, newPassword });
  return data;
};

export const resendOTP = async (identifier, type) => {
  const { data } = await axios.post(`${BASE_URL}/api/auth/resend-otp`, { identifier, type });
  return data;
};

/**
 * getMyProfile — Fetch the current user's MongoDB profile
 * @param {string} token - Local JWT or Auth0 token
 */
export const getMyProfile = async (token) => {
  const api = createApiClient(token);
  const { data } = await api.get('/api/auth/me');
  return data;
};

// ── Services API ─────────────────────────────────────────────────────────────

/**
 * getServiceStatus — Fetch which services the user has connected
 * @param {string} token - Auth0 access token
 */
export const getServiceStatus = async (token) => {
  const api = createApiClient(token);
  const { data } = await api.get('/api/services/status');
  return data;
};

/**
 * connectService — Mark a service as connected in MongoDB
 * @param {string} token - Auth0 access token
 * @param {string} service - 'gmail' | 'github' | 'google_calendar'
 */
export const connectService = async (token, service) => {
  const api = createApiClient(token);
  const { data } = await api.post('/api/services/connect', { service });
  return data;
};

/**
 * disconnectService — Mark a service as disconnected in MongoDB
 * @param {string} token - Auth0 access token
 * @param {string} service - Service name
 */
export const disconnectService = async (token, service) => {
  const api = createApiClient(token);
  const { data } = await api.post('/api/services/disconnect', { service });
  return data;
};

/**
 * updatePreferences — Update user preferences for important emails/events
 * @param {string} token - Local JWT token
 * @param {object} prefs - { action: 'add'|'remove', type: 'email'|'event', value: string }
 */
export const updatePreferences = async (token, prefs) => {
  const api = createApiClient(token);
  const { data } = await api.post('/api/services/preferences', prefs);
  return data;
};

// ── Chat API ─────────────────────────────────────────────────────────────────

/**
 * sendChatMessage — Send a message to the AI orchestrator
 * @param {string} token - Auth0 access token
 * @param {string} message - User's message text
 * @param {string|null} chatId - Existing chat session ID (null to start new)
 */
export const sendChatMessage = async (token, message, chatId = null) => {
  const api = createApiClient(token);
  const { data } = await api.post('/api/chat/message', { message, chatId });
  return data;
};

/**
 * getChatHistory — Fetch recent chat sessions
 * @param {string} token - Auth0 access token
 */
export const getChatHistory = async (token) => {
  const api = createApiClient(token);
  const { data } = await api.get('/api/chat/history');
  return data;
};

// ── Live Data API ────────────────────────────────────────────────────────────

export const fetchGmailInbox = async (token, folder = 'INBOX') => {
  const api = createApiClient(token);
  const { data } = await api.get('/api/data/gmail', { params: { folder } });
  return data;
};

export const fetchGmailMessageDetail = async (token, id) => {
  const api = createApiClient(token);
  const { data } = await api.get(`/api/data/gmail/${id}`);
  return data;
};

export const fetchCalendarEvents = async (token) => {
  const api = createApiClient(token);
  const { data } = await api.get('/api/data/calendar');
  return data;
};

export const createCalendarEvent = async (token, eventData) => {
  const api = createApiClient(token);
  const { data } = await api.post('/api/data/calendar', eventData);
  return data;
};

export const deleteCalendarEvent = async (token, eventId) => {
  const api = createApiClient(token);
  const { data } = await api.delete(`/api/data/calendar/${eventId}`);
  return data;
};

export const fetchGithubRepos = async (token) => {
  const api = createApiClient(token);
  const { data } = await api.get('/api/data/github');
  return data;
};

// ── Admin API ─────────────────────────────────────────────────────────────────

/**
 * adminLogin — Validate admin credentials (Basic Auth)
 * Returns encoded credentials string for subsequent admin calls.
 * @param {string} email
 * @param {string} password
 */
export const createAdminAuth = (email, password) => {
  return btoa(`${email}:${password}`);
};

/**
 * getAdminUsers — Fetch all users (admin only)
 * @param {string} adminAuth - Base64 encoded "email:password"
 * @param {number} page - Page number
 */
export const getAdminUsers = async (adminAuth, page = 1) => {
  const { data } = await axios.get(`${BASE_URL}/api/admin/users`, {
    headers: { Authorization: `Basic ${adminAuth}` },
    params: { page },
  });
  return data;
};

/**
 * getAdminLogs — Fetch agent logs (admin only)
 * @param {string} adminAuth - Base64 encoded "email:password"
 * @param {Object} filters - { page, agent, status }
 */
export const getAdminLogs = async (adminAuth, filters = {}) => {
  const { data } = await axios.get(`${BASE_URL}/api/admin/logs`, {
    headers: { Authorization: `Basic ${adminAuth}` },
    params: filters,
  });
  return data;
};

/**
 * getAdminStats — Fetch system statistics (admin only)
 * @param {string} adminAuth - Base64 encoded "email:password"
 */
export const getAdminStats = async (adminAuth) => {
  const { data } = await axios.get(`${BASE_URL}/api/admin/stats`, {
    headers: { Authorization: `Basic ${adminAuth}` },
  });
  return data;
};
