const User = require('../models/User');

const VALID_SERVICES = ['gmail', 'github', 'google_calendar'];

const getServiceStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId, 'connectedServices');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const status = {};
    VALID_SERVICES.forEach((s) => { status[s] = user.connectedServices.includes(s); });
    res.json({ 
      connectedServices: user.connectedServices, 
      status, 
      user: {
        importantEmails: user.importantEmails || [],
        importantEvents: user.importantEvents || []
      }
    });
  } catch (err) { next(err); }
};

const connectService = async (req, res, next) => {
  try {
    const { service } = req.body;
    if (!VALID_SERVICES.includes(service)) {
      return res.status(400).json({ error: `Invalid service. Must be one of: ${VALID_SERVICES.join(', ')}` });
    }
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $addToSet: { connectedServices: service } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, connectedServices: user.connectedServices });
  } catch (err) { next(err); }
};

const disconnectService = async (req, res, next) => {
  try {
    const { service } = req.body;
    if (!VALID_SERVICES.includes(service)) {
      return res.status(400).json({ error: 'Invalid service' });
    }
    // Clear tokens for this service as well
    const unsetQuery = {};
    if (service === 'github') unsetQuery['oauthTokens.github'] = 1;
    if (service === 'gmail' || service === 'google_calendar') {
      // Only clear google tokens if BOTH are disconnected? 
      // For now, let's just pull from connectedServices. 
      // If we want to be thorough, we check if other google service is still connected.
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { 
        $pull: { connectedServices: service },
        ...(service === 'github' ? { $unset: { 'oauthTokens.github': 1 } } : {}),
        ...(service === 'gmail' && !((await User.findById(req.user.userId)).connectedServices.includes('google_calendar')) ? { $unset: { 'oauthTokens.google': 1 } } : {}),
        ...(service === 'google_calendar' && !((await User.findById(req.user.userId)).connectedServices.includes('gmail')) ? { $unset: { 'oauthTokens.google': 1 } } : {})
      },
      { new: true }
    );
    res.json({ success: true, connectedServices: user.connectedServices });
  } catch (err) { next(err); }
};

const updatePreferences = async (req, res, next) => {
  try {
    const { action, type, value } = req.body;
    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be add or remove.' });
    }
    if (!['email', 'event'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be email or event.' });
    }

    const field = type === 'email' ? 'importantEmails' : 'importantEvents';
    const update = action === 'add' 
      ? { $addToSet: { [field]: value } }
      : { $pull: { [field]: value } };

    const user = await User.findByIdAndUpdate(req.user.userId, update, { new: true });
    res.json({ 
      success: true, 
      importantEmails: user.importantEmails, 
      importantEvents: user.importantEvents 
    });
  } catch (err) { next(err); }
};

module.exports = { getServiceStatus, connectService, disconnectService, updatePreferences };

