/**
 * agents/schedulingAgent.js — Google Calendar Scheduling Agent
 *
 * Capabilities:
 *  - List upcoming calendar events
 *  - Create a new calendar event
 *
 * This agent uses the local tokenService for authentication.
 */

const { google } = require('googleapis');
const { getAccessToken } = require('../services/tokenService');

/**
 * getCalendarClient — Creates an authenticated Google Calendar API client
 * @param {string} accessToken - OAuth2 access token
 * @returns {Object} Calendar API client
 */
const getCalendarClient = (accessToken) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth });
};

/**
 * listEvents — Fetch upcoming calendar events
 *
 * @param {string} userId - User's MongoDB ID
 * @param {number} [count=10] - Max number of events to return
 * @returns {Promise<Array>} Array of simplified event objects
 */
const listEvents = async (userId, count = 10) => {
  const token = await getAccessToken(userId, 'google_calendar');
  const calendar = getCalendarClient(token);

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(), // only future events
    maxResults: count,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items || [];

  return events.map((event) => ({
    id: event.id,
    summary: event.summary || 'No Title',
    description: event.description || '',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    location: event.location || '',
    attendees: (event.attendees || []).map((a) => a.email),
    link: event.htmlLink,
  }));
};

/**
 * createEvent — Create a new event on the user's primary calendar
 *
 * @param {string} userId - User's MongoDB ID
 * @param {Object} eventData - { summary, description, startDateTime, endDateTime, attendees, location }
 * @returns {Promise<Object>} Created event details
 */
const createEvent = async (
  userId,
  { summary, description = '', startDateTime, endDateTime, attendees = [], location = '' }
) => {
  const token = await getAccessToken(userId, 'google_calendar');
  const calendar = getCalendarClient(token);

  // Format attendees as Calendar API expects
  const formattedAttendees = attendees.map((email) => ({ email }));

  const event = {
    summary,
    description,
    location,
    start: {
      dateTime: startDateTime,
      timeZone: 'UTC',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'UTC',
    },
    attendees: formattedAttendees,
  };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: 'all', // send email invites to attendees
  });

  return {
    success: true,
    eventId: res.data.id,
    summary: res.data.summary,
    start: res.data.start,
    link: res.data.htmlLink,
  };
};

const deleteEvent = async (userId, eventId) => {
  const token = await getAccessToken(userId, 'google_calendar');
  const calendar = getCalendarClient(token);

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId,
  });

  return { success: true };
};

module.exports = { listEvents, createEvent, deleteEvent };
