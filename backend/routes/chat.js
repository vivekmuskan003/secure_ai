/**
 * routes/chat.js — Chat routes (uses local JWT now)
 */
const express = require('express');
const router = express.Router();
const { verifyLocalToken } = require('../middleware/localAuth');
const { sendMessage, getChatHistory } = require('../controllers/chatController');

router.post('/message', verifyLocalToken, sendMessage);
router.get('/history',  verifyLocalToken, getChatHistory);

module.exports = router;
