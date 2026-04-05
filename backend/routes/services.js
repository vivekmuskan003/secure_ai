/**
 * routes/services.js — Service connection routes (uses local JWT now)
 */
const express = require('express');
const router = express.Router();
const { verifyLocalToken } = require('../middleware/localAuth');
const {
  getServiceStatus,
  connectService,
  disconnectService,
  updatePreferences,
} = require('../controllers/servicesController');

router.get('/status',      verifyLocalToken, getServiceStatus);
router.post('/connect',    verifyLocalToken, connectService);
router.post('/disconnect', verifyLocalToken, disconnectService);
router.post('/preferences', verifyLocalToken, updatePreferences);

module.exports = router;
