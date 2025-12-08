const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Create researcher profile
app.post('/api/researchers', (req, res) => {
  const { name, email, institution, research_areas, bio, interests } = req.body;

  const stmt = db.prepare(`
    INSERT INTO researchers (name, email, institution, research_areas, bio, interests)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(name, email, institution, research_areas, bio, interests, function(err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json({ id: this.lastID, message: 'Profile created successfully' });
  });

  stmt.finalize();
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
