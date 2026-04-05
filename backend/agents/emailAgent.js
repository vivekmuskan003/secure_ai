/**
 * agents/emailAgent.js — Gmail Email Agent
 *
 * Capabilities:
 *  - Read recent emails (inbox summary)
 *  - Send an email
 *  - Summarize the inbox
 *
 * This agent uses the local tokenService for authentication.
 */

const { google } = require('googleapis');
const { getAccessToken } = require('../services/tokenService');

/**
 * getGmailClient — Creates an authenticated Gmail API client
 * @param {string} accessToken - OAuth2 access token
 * @returns {Object} Gmail API client
 */
const getGmailClient = (accessToken) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
};

/**
 * readEmails — Fetch the N most recent emails from a folder/label
 *
 * @param {string} userId - User's MongoDB ID
 * @param {number} [count=5] - Number of emails to fetch
 * @param {string} [label='INBOX'] - Folder label (INBOX, SENT, etc.)
 * @returns {Promise<Array>} Array of simplified email objects
 */
const readEmails = async (userId, count = 5, label = 'INBOX') => {
  const token = await getAccessToken(userId, 'gmail');
  const gmail = getGmailClient(token);

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    maxResults: count,
    labelIds: [label],
  });

  const messages = listRes.data.messages || [];
  if (messages.length === 0) return [];

  const emailDetails = await Promise.all(
    messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = detail.data.payload?.headers || [];
      const getHeader = (name) =>
        headers.find((h) => h.name === name)?.value || '';

      return {
        id: msg.id,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        date: getHeader('Date'),
        snippet: detail.data.snippet || '',
      };
    })
  );

  return emailDetails;
};

/**
 * sendEmail — Send an email on behalf of the user
 *
 * @param {string} userId - User's MongoDB ID
 * @param {Object} emailData - { to, subject, body }
 * @returns {Promise<Object>} Send result
 */
const sendEmail = async (userId, { to, subject, body }) => {
  const token = await getAccessToken(userId, 'gmail');
  const gmail = getGmailClient(token);

  // Build RFC 2822 email format
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ];
  const email = emailLines.join('\r\n');
  const encoded = Buffer.from(email).toString('base64url');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  });

  return { success: true, messageId: res.data.id };
};

/**
 * summarizeInbox — Fetch and summarize recent emails
 *
 * @param {string} userId - User's MongoDB ID
 * @param {string} [label='INBOX'] - Folder label
 * @returns {Promise<Object>} Summary with email list and formatted text
 */
const summarizeInbox = async (userId, label = 'INBOX') => {
  const emails = await readEmails(userId, 10, label);

  if (emails.length === 0) {
    return { count: 0, summary: 'Your inbox is empty.', emails: [] };
  }

  const summaryText = emails
    .map((e, i) => `${i + 1}. From: ${e.from}\n   Subject: ${e.subject}\n   Preview: ${e.snippet}`)
    .join('\n\n');

  return {
    count: emails.length,
    summary: `You have ${emails.length} recent emails:\n\n${summaryText}`,
    emails,
  };
};

module.exports = { readEmails, sendEmail, summarizeInbox };
