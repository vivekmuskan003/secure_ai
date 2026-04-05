/**
 * middleware/adminAuth.js — Admin panel authentication middleware
 *
 * The admin panel uses simple credential-based authentication.
 * Credentials are loaded ONLY from environment variables — never hardcoded.
 *
 * The frontend sends credentials as a Base64-encoded Basic Auth header:
 *   Authorization: Basic <base64(email:password)>
 */

/**
 * verifyAdmin — Express middleware that validates admin credentials.
 * Credentials are compared against .env values ADMIN_EMAIL / ADMIN_PASSWORD.
 */
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Must have an Authorization header
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  // Decode "Basic <base64>"
  const base64 = authHeader.split(' ')[1];
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');
  const [email, password] = decoded.split(':');

  // Compare with env vars — never hardcode credentials
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('[ADMIN] ADMIN_EMAIL or ADMIN_PASSWORD not set in .env');
    return res.status(500).json({ error: 'Admin credentials not configured' });
  }

  if (email !== adminEmail || password !== adminPassword) {
    return res.status(403).json({ error: 'Invalid admin credentials' });
  }

  // Credentials valid — proceed
  next();
};

module.exports = { verifyAdmin };
