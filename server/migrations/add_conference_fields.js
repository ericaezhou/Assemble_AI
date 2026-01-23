const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'assemble_ai.db');
const db = new sqlite3.Database(dbPath);

// Add new columns to conferences table
const migrations = [
  "ALTER TABLE conferences ADD COLUMN location_type TEXT DEFAULT 'in-person'",
  "ALTER TABLE conferences ADD COLUMN virtual_link TEXT",
  "ALTER TABLE conferences ADD COLUMN start_time TEXT",
  "ALTER TABLE conferences ADD COLUMN end_time TEXT",
  "ALTER TABLE conferences ADD COLUMN price_type TEXT DEFAULT 'free'",
  "ALTER TABLE conferences ADD COLUMN price_amount REAL",
  "ALTER TABLE conferences ADD COLUMN capacity INTEGER",
  "ALTER TABLE conferences ADD COLUMN require_approval BOOLEAN DEFAULT 0",
  "ALTER TABLE conferences ADD COLUMN description TEXT",
  "ALTER TABLE conferences ADD COLUMN rsvp_questions TEXT",
];

console.log('Running conference fields migration...');

db.serialize(() => {
  migrations.forEach((sql, index) => {
    db.run(sql, (err) => {
      if (err) {
        // Column might already exist, which is fine
        if (err.message.includes('duplicate column name')) {
          console.log(`Column already exists, skipping: ${sql.split('ADD COLUMN ')[1]?.split(' ')[0]}`);
        } else {
          console.error(`Migration ${index + 1} error:`, err.message);
        }
      } else {
        console.log(`Migration ${index + 1} successful`);
      }
    });
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('Migration complete!');
  }
});
