/**
 * routes/admin.js — Admin panel routes
 *
 * All routes require verifyAdmin middleware (Basic Auth from .env).
 */

const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/adminAuth');
const { getUsers, getLogs, getStats } = require('../controllers/adminController');

// Apply admin auth to all routes in this file
router.use(verifyAdmin);

// GET /api/admin/users — List all users
router.get('/users', getUsers);

// GET /api/admin/logs — List all agent logs
router.get('/logs', getLogs);

// GET /api/admin/stats — System statistics
router.get('/stats', getStats);

module.exports = router;
