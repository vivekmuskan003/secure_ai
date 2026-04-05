/**
 * routes/data.js — Protected endpoints for frontend data rendering
 */
const express = require('express');
const router = express.Router();
const { verifyLocalToken } = require('../middleware/localAuth');
const {
  getGmailInbox,
  getGmailMessageDetail,
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getGithubRepos,
} = require('../controllers/dataController');

router.get('/gmail', verifyLocalToken, getGmailInbox);
router.get('/gmail/:id', verifyLocalToken, getGmailMessageDetail);
router.get('/calendar', verifyLocalToken, getCalendarEvents);
router.post('/calendar', verifyLocalToken, createCalendarEvent);
router.delete('/calendar/:eventId', verifyLocalToken, deleteCalendarEvent);
router.get('/github', verifyLocalToken, getGithubRepos);

module.exports = router;
