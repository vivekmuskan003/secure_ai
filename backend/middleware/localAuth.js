/**
 * middleware/localAuth.js — JWT verification for our own tokens
 *
 * Validates tokens we issue (not Auth0 tokens).
 * Sets req.user = { userId, email, name, auth0Id? }
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in .env');
  }
  return process.env.JWT_SECRET;
};

/**
 * verifyLocalToken — middleware for all protected routes
 */
const verifyLocalToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET());
    req.user = decoded; // { userId, email, name, auth0Id? }
    // Backward compat with existing controllers that call getUserId(req)
    req.auth = { payload: { sub: decoded.userId } };
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : 'Invalid token. Please log in again.';
    return res.status(401).json({ error: message });
  }
};

/**
 * issueToken — Generate a signed JWT for a user
 * @param {Object} user - MongoDB User document
 * @returns {string} Signed JWT
 */
const issueToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      ...(user.auth0Id ? { auth0Id: user.auth0Id } : {}),
    },
    JWT_SECRET(),
    { expiresIn: '7d' }
  );
};

module.exports = { verifyLocalToken, issueToken };
