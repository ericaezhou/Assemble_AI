const jwt = require('jsonwebtoken');

// Secret key for JWT - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRATION = '7d'; // Tokens expire after 7 days

/**
 * Generate a JWT token for a user
 */
function generateToken(userId) {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
}

/**
 * Middleware to verify JWT token and authenticate requests
 * Adds user ID to req.userId if authentication succeeds
 */
function authenticateToken(req, res, next) {
  // Get token from Authorization header (format: "Bearer TOKEN")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid token.' });
  }
}

/**
 * Middleware to verify the authenticated user matches the requested user ID
 * Use this after authenticateToken to ensure users can only access their own data
 */
function authorizeUser(req, res, next) {
  const requestedUserId = parseInt(req.params.id || req.body.user_id);

  if (req.userId !== requestedUserId) {
    return res.status(403).json({ error: 'Access denied. You can only access your own data.' });
  }

  next();
}

/**
 * Middleware to verify the authenticated user is part of a conversation
 */
function authorizeConversationAccess(db) {
  return (req, res, next) => {
    const conversationId = parseInt(req.params.id || req.params.conversationId || req.body.conversation_id);

    // Check if user is part of this conversation
    const conversation = db.prepare(`
      SELECT participant1_id, participant2_id
      FROM conversations
      WHERE id = ?
    `).get(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    if (conversation.participant1_id !== req.userId && conversation.participant2_id !== req.userId) {
      return res.status(403).json({ error: 'Access denied. You are not part of this conversation.' });
    }

    next();
  };
}

module.exports = {
  generateToken,
  authenticateToken,
  authorizeUser,
  authorizeConversationAccess,
  JWT_SECRET,
  JWT_EXPIRATION
};
