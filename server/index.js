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

      // Sort by similarity score and return top matches
      recommendations.sort((a, b) => b.similarity_score - a.similarity_score);
      res.json(recommendations.filter(r => r.similarity_score > 0).slice(0, 10));
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
