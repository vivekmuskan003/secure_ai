/**
 * controllers/dataController.js — Endpoints to fetch live data from OAuth endpoints
 */

const axios = require('axios');
const User = require('../models/User');
const { getAccessToken } = require('../services/tokenService');
const { google } = require('googleapis');
const schedulingAgent = require('../agents/schedulingAgent');

// ── Helpers ──────────────────────────────────────────────────────────────────

const getGoogleClient = (accessToken) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
};

// Helper: Recursively search for plain text or HTML body in message parts
const getMessageBody = (payload) => {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  
  if (payload.parts) {
    // Prefer HTML over plain text for better readability
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart) return getMessageBody(htmlPart);
    
    const plainPart = payload.parts.find(p => p.mimeType === 'text/plain');
    if (plainPart) return getMessageBody(plainPart);
    
    // Recurse into nested parts
    for (const part of payload.parts) {
      if (part.parts) {
        const nested = getMessageBody(part);
        if (nested) return nested;
      }
    }
  }
  
  return '';
};

// ── Gmail ────────────────────────────────────────────────────────────────────

const getGmailInbox = async (req, res, next) => {
  try {
    const accessToken = await getAccessToken(req.user.userId, 'gmail');
    const auth = getGoogleClient(accessToken);
    const gmail = google.gmail({ version: 'v1', auth });

    const { folder = 'INBOX' } = req.query;

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 15,
      labelIds: [folder.toUpperCase()],
    });

    const messages = response.data.messages || [];
    const emailPromises = messages.map(async (msg) => {
      const msgData = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = msgData.data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      return { id: msg.id, snippet: msgData.data.snippet, subject, from, date };
    });

    const emails = await Promise.all(emailPromises);
    res.json({ emails });
  } catch (err) {
    next(err);
  }
};

const getGmailMessageDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const accessToken = await getAccessToken(req.user.userId, 'gmail');
    const auth = getGoogleClient(accessToken);
    const gmail = google.gmail({ version: 'v1', auth });

    const msgData = await gmail.users.messages.get({
      userId: 'me',
      id: id,
      format: 'full',
    });

    const headers = msgData.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    const body = getMessageBody(msgData.data.payload);

    res.json({
      id,
      subject,
      from,
      date,
      body,
      snippet: msgData.data.snippet,
    });
  } catch (err) {
    next(err);
  }
};

// ── Google Calendar ──────────────────────────────────────────────────────────

const getCalendarEvents = async (req, res, next) => {
  try {
    const accessToken = await getAccessToken(req.user.userId, 'google_calendar');
    const auth = getGoogleClient(accessToken);
    const calendar = google.calendar({ version: 'v3', auth });

    // Fetch primary events
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Optional: Fetch Holidays (Indian Holidays as example)
    let holidays = [];
    try {
      const holidayRes = await calendar.events.list({
        calendarId: 'en.indian#holiday@group.v.calendar.google.com',
        timeMin: (new Date()).toISOString(),
        maxResults: 20,
        singleEvents: true,
      });
      holidays = (holidayRes.data.items || []).map(h => ({ ...h, isHoliday: true }));
    } catch (hErr) {
      console.warn('Could not fetch holidays:', hErr.message);
    }

    const allEvents = [...(response.data.items || []), ...holidays];
    res.json({ events: allEvents });
  } catch (err) {
    next(err);
  }
};

const createCalendarEvent = async (req, res, next) => {
  try {
    const result = await schedulingAgent.createEvent(req.user.userId, req.body);
    res.json(result);
  } catch (err) { next(err); }
};

const deleteCalendarEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await schedulingAgent.deleteEvent(req.user.userId, eventId);
    res.json(result);
  } catch (err) { next(err); }
};

// ── GitHub ───────────────────────────────────────────────────────────────────

const getGithubRepos = async (req, res, next) => {
  try {
    const accessToken = await getAccessToken(req.user.userId, 'github');
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { sort: 'updated', per_page: 20 },
    });
    res.json({ repos: response.data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getGmailInbox,
  getGmailMessageDetail,
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getGithubRepos,
};
