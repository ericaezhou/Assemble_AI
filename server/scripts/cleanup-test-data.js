const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../research_connect.db');
const db = new sqlite3.Database(dbPath);

async function cleanupTestData() {
  console.log('Cleaning up test data...');

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Delete test conference participants first (due to foreign key constraints)
      db.run(`
        DELETE FROM conference_participants
        WHERE conference_id IN ('TESTA001', 'TESTB002', 'TESTC003')
      `, function(err) {
        if (err) {
          console.error('Error deleting test participants:', err.message);
          reject(err);
          return;
        }
        console.log(`✓ Deleted ${this.changes} test conference participants`);

        // Delete test conferences
        db.run(`
          DELETE FROM conferences
          WHERE id IN ('TESTA001', 'TESTB002', 'TESTC003')
        `, function(err) {
          if (err) {
            console.error('Error deleting test conferences:', err.message);
            reject(err);
            return;
          }
          console.log(`✓ Deleted ${this.changes} test conferences`);

          // Delete test users (all users with "(Dummy)" in their name)
          db.run(`
            DELETE FROM researchers
            WHERE name LIKE '%(Dummy)%'
          `, function(err) {
            if (err) {
              console.error('Error deleting test users:', err.message);
              reject(err);
              return;
            }
            console.log(`✓ Deleted ${this.changes} test users`);

            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err.message);
                reject(err);
              } else {
                console.log('\n✅ Test data cleanup completed successfully!');
                resolve();
              }
            });
          });
        });
      });
    });
  });
}

// Run the cleanup script
cleanupTestData().catch(err => {
  console.error('Failed to cleanup test data:', err);
  db.close();
  process.exit(1);
});
