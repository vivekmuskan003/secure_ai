/**
 * controllers/adminController.js — Admin panel controller
 *
 * Provides admin-only endpoints for monitoring the system.
 * All routes require verifyAdmin middleware.
 */

const User = require('../models/User');
const Chat = require('../models/Chat');
const Log = require('../models/Log');

/**
 * getUsers — GET /api/admin/users
 *
 * Returns all users with their connected services.
 *
 * @route GET /api/admin/users
 * @access Admin only
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-__v'),
      User.countDocuments(),
    ]);

    res.json({ users, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

/**
 * getLogs — GET /api/admin/logs
 *
 * Returns agent action logs, most recent first.
 *
 * @route GET /api/admin/logs
 * @access Admin only
 */
const getLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, agent, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build filter
    const filter = {};
    if (agent) filter.agent = agent;
    if (status) filter.status = status;

    const [logs, total] = await Promise.all([
      Log.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-__v'),
      Log.countDocuments(filter),
    ]);

    res.json({ logs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

/**
 * getStats — GET /api/admin/stats
 *
 * Returns system-wide statistics for the dashboard.
 *
 * @route GET /api/admin/stats
 * @access Admin only
 */
const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalChats,
      totalLogs,
      recentErrors,
      agentUsage,
    ] = await Promise.all([
      User.countDocuments(),
      Chat.countDocuments(),
      Log.countDocuments(),
      Log.countDocuments({ status: 'error', createdAt: { $gte: new Date(Date.now() - 86400000) } }),
      Log.aggregate([
        { $group: { _id: '$agent', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Count connected services distribution
    const serviceStats = await User.aggregate([
      { $unwind: { path: '$connectedServices', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$connectedServices', count: { $sum: 1 } } },
    ]);

    res.json({
      totalUsers,
      totalChats,
      totalLogs,
      recentErrors,
      agentUsage,
      serviceStats,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getLogs, getStats };
