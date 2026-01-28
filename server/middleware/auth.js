const { supabase } = require('../supabaseClient');

/**
 * Middleware to verify Supabase JWT token and authenticate requests
 * Adds user ID (UUID) to req.userId if authentication succeeds
 */
async function authenticateToken(req, res, next) {
  // Get token from Authorization header (format: "Bearer TOKEN")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }

    // Set user ID (UUID) on request
    req.userId = user.id;
    req.user = user; // Also attach full user object if needed
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token verification failed.' });
  }
}

/**
 * Middleware to verify the authenticated user matches the requested user ID
 * Use this after authenticateToken to ensure users can only access their own data
 * Note: IDs are now UUIDs, not integers
 */
function authorizeUser(req, res, next) {
  const requestedUserId = req.params.id || req.body.user_id;

  if (req.userId !== requestedUserId) {
    return res.status(403).json({ error: 'Access denied. You can only access your own data.' });
  }

  next();
}

/**
 * Middleware to verify the authenticated user is part of a conversation
 */
function authorizeConversationAccess() {
  return async (req, res, next) => {
    // Conversation IDs are bigints, no need to parse
    const conversationId = req.params.id || req.params.conversationId || req.body.conversation_id;

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required.' });
    }

    try {
      // Check if user is part of this conversation
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('participant1_id, participant2_id')
        .eq('id', conversationId)
        .single();

      if (error || !conversation) {
        return res.status(404).json({ error: 'Conversation not found.' });
      }

      if (conversation.participant1_id !== req.userId && conversation.participant2_id !== req.userId) {
        return res.status(403).json({ error: 'Access denied. You are not part of this conversation.' });
      }

      next();
    } catch (err) {
      return res.status(500).json({ error: 'Error verifying conversation access.' });
    }
  };
}

module.exports = {
  authenticateToken,
  authorizeUser,
  authorizeConversationAccess
};
