require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('./database');
const { sendVerificationCode, verifyCode } = require('./emailService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Send verification code to email
app.post('/api/auth/send-verification-code', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Check if email already exists
  db.get('SELECT id FROM researchers WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (user) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    try {
      const result = await sendVerificationCode(email);
      res.json({
        success: true,
        message: 'Verification code sent to your email',
        devMode: result.devMode,
        code: result.devMode ? result.code : undefined // Only include code in dev mode
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// Signup - Create researcher profile with password
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, institution, research_areas, bio, interests, verificationCode } = req.body;

  // Verify the email verification code
  const verification = verifyCode(email, verificationCode);
  if (!verification.valid) {
    return res.status(400).json({ error: verification.message });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare(`
      INSERT INTO researchers (name, email, password, institution, research_areas, bio, interests)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(name, email, hashedPassword, institution, research_areas, bio, interests, function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'Profile created successfully' });
    });

    stmt.finalize();
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login - Authenticate researcher
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM researchers WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    try {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, message: 'Login successful' });
    } catch (err) {
      res.status(500).json({ error: 'Login failed' });
    }
  });
});

// Get all researchers
app.get('/api/researchers', (req, res) => {
  db.all('SELECT * FROM researchers', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get researcher by ID
app.get('/api/researchers/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM researchers WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Researcher not found' });
    }
    res.json(row);
  });
});

// Search researchers
app.get('/api/researchers/search/:query', (req, res) => {
  const { query } = req.params;
  const searchPattern = `%${query}%`;

  db.all(`
    SELECT * FROM researchers
    WHERE name LIKE ?
       OR research_areas LIKE ?
       OR interests LIKE ?
       OR institution LIKE ?
  `, [searchPattern, searchPattern, searchPattern, searchPattern], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get recommendations for a researcher
app.get('/api/researchers/:id/recommendations', (req, res) => {
  const { id } = req.params;

  // First get the current researcher's profile
  db.get('SELECT * FROM researchers WHERE id = ?', [id], (err, researcher) => {
    if (err || !researcher) {
      return res.status(404).json({ error: 'Researcher not found' });
    }

    const userInterests = researcher.interests ? researcher.interests.toLowerCase().split(',').map(i => i.trim()) : [];
    const userResearchAreas = researcher.research_areas ? researcher.research_areas.toLowerCase().split(',').map(i => i.trim()) : [];

    // Get all other researchers
    db.all('SELECT * FROM researchers WHERE id != ?', [id], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Calculate similarity scores
      const recommendations = rows.map(other => {
        const otherInterests = other.interests ? other.interests.toLowerCase().split(',').map(i => i.trim()) : [];
        const otherResearchAreas = other.research_areas ? other.research_areas.toLowerCase().split(',').map(i => i.trim()) : [];

        // Count matching interests and research areas
        const matchingInterests = userInterests.filter(i => otherInterests.includes(i)).length;
        const matchingResearchAreas = userResearchAreas.filter(r => otherResearchAreas.includes(r)).length;

        const score = matchingInterests * 2 + matchingResearchAreas * 3;

        return {
          ...other,
          similarity_score: score
        };
      });

      // Sort by similarity score (highest first) and return top matches
      // Remove password field from all recommendations
      const cleanedRecommendations = recommendations.map(({ password, ...r }) => r);
      cleanedRecommendations.sort((a, b) => b.similarity_score - a.similarity_score);

      // Return top 20 recommendations (including those with score 0)
      res.json(cleanedRecommendations.slice(0, 20));
    });
  });
});

// Conference endpoints

// Create conference
app.post('/api/conferences', (req, res) => {
  const { name, location, start_date, end_date, host_id } = req.body;

  const conferenceId = crypto.randomBytes(4).toString('hex').toUpperCase();

  const stmt = db.prepare(`
    INSERT INTO conferences (id, name, location, start_date, end_date, host_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(conferenceId, name, location, start_date, end_date, host_id, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const participantStmt = db.prepare(`
      INSERT INTO conference_participants (conference_id, researcher_id)
      VALUES (?, ?)
    `);

    participantStmt.run(conferenceId, host_id, function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.json({ id: conferenceId, message: 'Conference created successfully' });
    });

    participantStmt.finalize();
  });

  stmt.finalize();
});

// Join conference
app.post('/api/conferences/:id/join', (req, res) => {
  const { id } = req.params;
  const { researcher_id } = req.body;

  db.get('SELECT * FROM conferences WHERE id = ?', [id], (err, conference) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!conference) {
      return res.status(404).json({ error: 'Conference not found' });
    }

    db.get(
      'SELECT * FROM conference_participants WHERE conference_id = ? AND researcher_id = ?',
      [id, researcher_id],
      (err, existing) => {
        if (existing) {
          return res.status(400).json({ error: 'Already joined this conference' });
        }

        const stmt = db.prepare(`
          INSERT INTO conference_participants (conference_id, researcher_id)
          VALUES (?, ?)
        `);

        stmt.run(id, researcher_id, function(err) {
          if (err) {
            return res.status(400).json({ error: err.message });
          }
          res.json({ message: 'Joined conference successfully', conference });
        });

        stmt.finalize();
      }
    );
  });
});

// Get user's conferences
app.get('/api/researchers/:id/conferences', (req, res) => {
  const { id } = req.params;

  db.all(`
    SELECT c.*,
           CASE WHEN c.host_id = ? THEN 1 ELSE 0 END as is_host
    FROM conferences c
    INNER JOIN conference_participants cp ON c.id = cp.conference_id
    WHERE cp.researcher_id = ?
    ORDER BY c.start_date ASC
  `, [id, id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get conference by ID (for verification)
app.get('/api/conferences/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM conferences WHERE id = ?', [id], (err, conference) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!conference) {
      return res.status(404).json({ error: 'Conference not found' });
    }
    res.json(conference);
  });
});

// Get conference participants with details
app.get('/api/conferences/:id/participants', (req, res) => {
  const { id } = req.params;
  const { current_user_id } = req.query;

  db.all(`
    SELECT r.*, cp.joined_at
    FROM researchers r
    INNER JOIN conference_participants cp ON r.id = cp.researcher_id
    WHERE cp.conference_id = ?
    ORDER BY cp.joined_at ASC
  `, [id], (err, participants) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!current_user_id) {
      return res.json(participants.map(({ password, ...p }) => p));
    }

    // Get current user's data to calculate similarity
    db.get('SELECT * FROM researchers WHERE id = ?', [current_user_id], (err, currentUser) => {
      if (err || !currentUser) {
        return res.json(participants.map(({ password, ...p }) => p));
      }

      const userInterests = currentUser.interests ? currentUser.interests.toLowerCase().split(',').map(i => i.trim()) : [];
      const userResearchAreas = currentUser.research_areas ? currentUser.research_areas.toLowerCase().split(',').map(i => i.trim()) : [];

      const participantsWithScores = participants.map(participant => {
        if (participant.id === parseInt(current_user_id)) {
          const { password, ...cleanParticipant } = participant;
          return { ...cleanParticipant, similarity_score: 0 };
        }

        const otherInterests = participant.interests ? participant.interests.toLowerCase().split(',').map(i => i.trim()) : [];
        const otherResearchAreas = participant.research_areas ? participant.research_areas.toLowerCase().split(',').map(i => i.trim()) : [];

        const matchingInterests = userInterests.filter(i => otherInterests.includes(i)).length;
        const matchingResearchAreas = userResearchAreas.filter(r => otherResearchAreas.includes(r)).length;

        const score = matchingInterests * 2 + matchingResearchAreas * 3;

        const { password, ...cleanParticipant } = participant;
        return { ...cleanParticipant, similarity_score: score };
      });

      res.json(participantsWithScores);
    });
  });
});

// Get or create conversation between two users
app.post('/api/conversations', (req, res) => {
  const { user1_id, user2_id } = req.body;

  // Ensure consistent ordering (lower ID always as participant1)
  const participant1_id = Math.min(user1_id, user2_id);
  const participant2_id = Math.max(user1_id, user2_id);

  // Check if conversation already exists
  db.get(`
    SELECT * FROM conversations
    WHERE participant1_id = ? AND participant2_id = ?
  `, [participant1_id, participant2_id], (err, conversation) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (conversation) {
      // Conversation exists, return it
      return res.json(conversation);
    }

    // Create new conversation
    db.run(`
      INSERT INTO conversations (participant1_id, participant2_id)
      VALUES (?, ?)
    `, [participant1_id, participant2_id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const conversationId = this.lastID;

      // Get both users' data to generate intro message
      db.get('SELECT * FROM researchers WHERE id = ?', [user1_id], (err, user1) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        db.get('SELECT * FROM researchers WHERE id = ?', [user2_id], (err, user2) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Find common interests
          const user1Interests = user1.interests ? user1.interests.split(',').map(i => i.trim()) : [];
          const user2Interests = user2.interests ? user2.interests.split(',').map(i => i.trim()) : [];
          const commonInterests = user1Interests.filter(i =>
            user2Interests.some(j => j.toLowerCase() === i.toLowerCase())
          );

          // Generate intro message
          let introMessage;
          if (commonInterests.length > 0) {
            const interestList = commonInterests.slice(0, 3).join(', ');
            introMessage = `Hi ${user1.name} and ${user2.name}! Looks like you might be interested in chatting about ${interestList}!`;
          } else {
            introMessage = `Hi ${user1.name} and ${user2.name}! Welcome to your conversation. Feel free to introduce yourselves and discuss your research!`;
          }

          // Insert system intro message
          db.run(`
            INSERT INTO messages (conversation_id, sender_id, content, is_system_message)
            VALUES (?, ?, ?, 1)
          `, [conversationId, user1_id, introMessage], (err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Return the new conversation
            db.get('SELECT * FROM conversations WHERE id = ?', [conversationId], (err, newConversation) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              res.json(newConversation);
            });
          });
        });
      });
    });
  });
});

// Get user's conversations
app.get('/api/conversations/user/:userId', (req, res) => {
  const { userId } = req.params;

  db.all(`
    SELECT
      c.*,
      CASE
        WHEN c.participant1_id = ? THEN c.participant2_id
        ELSE c.participant1_id
      END as other_user_id,
      CASE
        WHEN c.participant1_id = ? THEN r2.name
        ELSE r1.name
      END as other_user_name,
      m.content as last_message,
      m.created_at as last_message_time
    FROM conversations c
    LEFT JOIN researchers r1 ON c.participant1_id = r1.id
    LEFT JOIN researchers r2 ON c.participant2_id = r2.id
    LEFT JOIN (
      SELECT conversation_id, content, created_at
      FROM messages
      WHERE id IN (
        SELECT MAX(id) FROM messages GROUP BY conversation_id
      )
    ) m ON c.id = m.conversation_id
    WHERE c.participant1_id = ? OR c.participant2_id = ?
    ORDER BY c.last_message_at DESC
  `, [userId, userId, userId, userId], (err, conversations) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(conversations);
  });
});

// Get messages in a conversation
app.get('/api/conversations/:id/messages', (req, res) => {
  const { id } = req.params;

  db.all(`
    SELECT m.*, r.name as sender_name
    FROM messages m
    LEFT JOIN researchers r ON m.sender_id = r.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
  `, [id], (err, messages) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(messages);
  });
});

// Send a message
app.post('/api/messages', (req, res) => {
  const { conversation_id, sender_id, content } = req.body;

  db.run(`
    INSERT INTO messages (conversation_id, sender_id, content)
    VALUES (?, ?, ?)
  `, [conversation_id, sender_id, content], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Update conversation's last_message_at
    db.run(`
      UPDATE conversations
      SET last_message_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [conversation_id], (err) => {
      if (err) {
        console.error('Failed to update conversation timestamp:', err);
      }
    });

    // Return the new message
    db.get(`
      SELECT m.*, r.name as sender_name
      FROM messages m
      LEFT JOIN researchers r ON m.sender_id = r.id
      WHERE m.id = ?
    `, [this.lastID], (err, message) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(message);
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
