const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../assemble_ai.db');
const db = new sqlite3.Database(dbPath);

async function runMigration() {
  console.log('Running database migration to add new profile fields...\n');

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Add new columns to researchers table
      const newColumns = [
        'occupation TEXT DEFAULT NULL',
        'school TEXT DEFAULT NULL',
        'major TEXT DEFAULT NULL',
        'year TEXT DEFAULT NULL',
        'company TEXT DEFAULT NULL',
        'title TEXT DEFAULT NULL',
        'degree TEXT DEFAULT NULL',
        'work_experience_years TEXT DEFAULT NULL',
        'research_area TEXT DEFAULT NULL',
        'other_description TEXT DEFAULT NULL',
        'interest_areas TEXT DEFAULT NULL',
        'current_skills TEXT DEFAULT NULL',
        'hobbies TEXT DEFAULT NULL',
      ];

      let completedAlters = 0;
      const totalAlters = newColumns.length;

      newColumns.forEach((columnDef, index) => {
        const columnName = columnDef.split(' ')[0];

        db.run(`ALTER TABLE researchers ADD COLUMN ${columnDef}`, function(err) {
          if (err) {
            // Column might already exist, which is okay
            if (err.message.includes('duplicate column name')) {
              console.log(`  ⚠ Column '${columnName}' already exists, skipping...`);
            } else {
              console.error(`  ✗ Error adding column '${columnName}':`, err.message);
              reject(err);
              return;
            }
          } else {
            console.log(`  ✓ Added column: ${columnName}`);
          }

          completedAlters++;

          // When all alterations are done
          if (completedAlters === totalAlters) {
            console.log('\n✅ Migration completed successfully!');
            console.log('\nNew fields added:');
            console.log('  - occupation (Student/Professional/Researcher/Other)');
            console.log('  - school');
            console.log('  - major');
            console.log('  - year');
            console.log('  - company');
            console.log('  - title');
            console.log('  - degree');
            console.log('  - work_experience_years');
            console.log('  - research_area');
            console.log('  - other_description');
            console.log('  - interest_areas (JSON)');
            console.log('  - current_skills (JSON)');
            console.log('  - hobbies (JSON)');
            console.log('\nExisting users have been preserved with NULL values for new fields.');

            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err.message);
                reject(err);
              } else {
                resolve();
              }
            });
          }
        });
      });
    });
  });
}

// Run the migration script
runMigration().catch(err => {
  console.error('Migration failed:', err);
  db.close();
  process.exit(1);
});
