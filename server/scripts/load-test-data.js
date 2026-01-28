const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');

const dbPath = path.join(__dirname, '../assemble_ai.db');
const db = new sqlite3.Database(dbPath);

// Test user data with diverse schools, interests, and research areas
const testUsers = [
  { name: 'Alice Chen (Dummy)', email: 'alice.dummy@test.com', institution: 'MIT', research_areas: 'Machine Learning, Computer Vision', interests: 'deep learning, neural networks, image recognition', bio: 'Passionate about advancing computer vision through innovative deep learning architectures.' },
  { name: 'Bob Martinez (Dummy)', email: 'bob.dummy@test.com', institution: 'Stanford', research_areas: 'Natural Language Processing, AI', interests: 'language models, chatbots, text generation', bio: 'Exploring the boundaries of language understanding in artificial intelligence systems.' },
  { name: 'Carol Wang (Dummy)', email: 'carol.dummy@test.com', institution: 'MIT', research_areas: 'Robotics, Machine Learning', interests: 'autonomous systems, reinforcement learning, robot perception', bio: 'Building intelligent robots that can learn and adapt to complex environments.' },
  { name: 'David Johnson (Dummy)', email: 'david.dummy@test.com', institution: 'Berkeley', research_areas: 'Human-Computer Interaction, UX', interests: 'user experience, accessibility, interface design', bio: 'Designing intuitive interfaces that bridge the gap between humans and technology.' },
  { name: 'Emma Liu (Dummy)', email: 'emma.dummy@test.com', institution: 'Stanford', research_areas: 'Bioinformatics, Machine Learning', interests: 'genomics, healthcare AI, data analysis', bio: 'Applying machine learning to solve critical problems in genomics and personalized medicine.' },
  { name: 'Frank Brown (Dummy)', email: 'frank.dummy@test.com', institution: 'Carnegie Mellon', research_areas: 'Computer Vision, Graphics', interests: '3D reconstruction, augmented reality, computer graphics', bio: 'Creating immersive AR experiences through advanced computer vision techniques.' },
  { name: 'Grace Kim (Dummy)', email: 'grace.dummy@test.com', institution: 'MIT', research_areas: 'Natural Language Processing, Education', interests: 'educational technology, language learning, NLP', bio: 'Leveraging NLP to build adaptive learning systems for language education.' },
  { name: 'Henry Davis (Dummy)', email: 'henry.dummy@test.com', institution: 'Cornell', research_areas: 'Distributed Systems, Cloud Computing', interests: 'scalability, microservices, cloud infrastructure', bio: 'Architecting scalable distributed systems for the next generation of cloud applications.' },
  { name: 'Iris Patel (Dummy)', email: 'iris.dummy@test.com', institution: 'Berkeley', research_areas: 'Machine Learning, Security', interests: 'adversarial ML, privacy, cryptography', bio: 'Investigating security vulnerabilities in machine learning systems and developing robust defenses.' },
  { name: 'Jack Wilson (Dummy)', email: 'jack.dummy@test.com', institution: 'Stanford', research_areas: 'Computer Vision, Medical Imaging', interests: 'medical diagnosis, image segmentation, healthcare', bio: 'Using computer vision to improve early disease detection and diagnostic accuracy.' },
  { name: 'Karen Lee (Dummy)', email: 'karen.dummy@test.com', institution: 'Princeton', research_areas: 'Algorithms, Optimization', interests: 'algorithm design, complexity theory, optimization', bio: 'Developing efficient algorithms for solving complex computational problems.' },
  { name: 'Liam Taylor (Dummy)', email: 'liam.dummy@test.com', institution: 'MIT', research_areas: 'Quantum Computing, Algorithms', interests: 'quantum algorithms, quantum cryptography, quantum ML', bio: 'Exploring the intersection of quantum computing and machine learning algorithms.' },
  { name: 'Maya Singh (Dummy)', email: 'maya.dummy@test.com', institution: 'Carnegie Mellon', research_areas: 'Robotics, AI', interests: 'autonomous vehicles, robot navigation, SLAM', bio: 'Developing navigation systems for autonomous robots in unstructured environments.' },
  { name: 'Noah Anderson (Dummy)', email: 'noah.dummy@test.com', institution: 'Berkeley', research_areas: 'Natural Language Processing, Information Retrieval', interests: 'search engines, question answering, semantic search', bio: 'Building next-generation search systems with advanced natural language understanding.' },
  { name: 'Olivia Brown (Dummy)', email: 'olivia.dummy@test.com', institution: 'Columbia', research_areas: 'Social Computing, HCI', interests: 'social networks, online communities, collaborative systems', bio: 'Studying how technology shapes human social interactions and community formation.' },
  { name: 'Peter Zhang (Dummy)', email: 'peter.dummy@test.com', institution: 'Stanford', research_areas: 'Machine Learning, Finance', interests: 'algorithmic trading, risk analysis, financial modeling', bio: 'Applying machine learning to predict market trends and optimize investment strategies.' },
  { name: 'Quinn Murphy (Dummy)', email: 'quinn.dummy@test.com', institution: 'MIT', research_areas: 'Software Engineering, DevOps', interests: 'CI/CD, testing automation, software quality', bio: 'Streamlining software development through automated testing and continuous deployment.' },
  { name: 'Rachel Cohen (Dummy)', email: 'rachel.dummy@test.com', institution: 'Yale', research_areas: 'Computer Vision, Art', interests: 'generative art, style transfer, creative AI', bio: 'Creating AI-powered tools that enable new forms of artistic expression.' },
  { name: 'Sam Williams (Dummy)', email: 'sam.dummy@test.com', institution: 'Cornell', research_areas: 'Natural Language Processing, Ethics', interests: 'AI ethics, bias detection, fairness', bio: 'Ensuring AI systems are fair, transparent, and accountable to all stakeholders.' },
  { name: 'Tina Rodriguez (Dummy)', email: 'tina.dummy@test.com', institution: 'Berkeley', research_areas: 'Machine Learning, Climate', interests: 'climate modeling, environmental data, sustainability', bio: 'Using machine learning to model climate patterns and inform sustainability policies.' },
  { name: 'Uma Gupta (Dummy)', email: 'uma.dummy@test.com', institution: 'Princeton', research_areas: 'Databases, Big Data', interests: 'data mining, SQL optimization, distributed databases', bio: 'Optimizing database systems to handle massive-scale data analytics.' },
  { name: 'Victor Chang (Dummy)', email: 'victor.dummy@test.com', institution: 'Carnegie Mellon', research_areas: 'Computer Graphics, Animation', interests: 'animation, rendering, real-time graphics', bio: 'Pushing the boundaries of real-time rendering for interactive entertainment.' },
  { name: 'Wendy Harris (Dummy)', email: 'wendy.dummy@test.com', institution: 'Stanford', research_areas: 'AI, Healthcare', interests: 'medical AI, drug discovery, clinical decision support', bio: 'Accelerating drug discovery through AI-driven analysis of molecular structures.' },
  { name: 'Xavier Thompson (Dummy)', email: 'xavier.dummy@test.com', institution: 'MIT', research_areas: 'Cybersecurity, Networks', interests: 'network security, intrusion detection, cryptography', bio: 'Developing advanced techniques to detect and prevent cyber attacks.' },
  { name: 'Yara Osman (Dummy)', email: 'yara.dummy@test.com', institution: 'Columbia', research_areas: 'Machine Learning, Recommender Systems', interests: 'recommendation algorithms, personalization, collaborative filtering', bio: 'Building personalized recommendation engines that understand user preferences.' },
  { name: 'Zack Foster (Dummy)', email: 'zack.dummy@test.com', institution: 'Berkeley', research_areas: 'Computer Vision, Sports', interests: 'sports analytics, video analysis, player tracking', bio: 'Analyzing athletic performance through computer vision and motion tracking.' },
  { name: 'Amy Chen (Dummy)', email: 'amy.dummy@test.com', institution: 'Yale', research_areas: 'Natural Language Processing, Law', interests: 'legal tech, document analysis, contract review', bio: 'Automating legal document analysis with natural language processing technologies.' },
  { name: 'Brian Scott (Dummy)', email: 'brian.dummy@test.com', institution: 'Cornell', research_areas: 'Robotics, Manufacturing', interests: 'industrial automation, robot arms, quality control', bio: 'Revolutionizing manufacturing with intelligent robotic automation systems.' },
  { name: 'Chloe Martin (Dummy)', email: 'chloe.dummy@test.com', institution: 'Princeton', research_areas: 'AI, Psychology', interests: 'cognitive modeling, human behavior, AI psychology', bio: 'Understanding human cognition through computational models and AI simulations.' },
  { name: 'Derek Palmer (Dummy)', email: 'derek.dummy@test.com', institution: 'Stanford', research_areas: 'Machine Learning, Agriculture', interests: 'precision agriculture, crop monitoring, drone imaging', bio: 'Optimizing agricultural yields through ML-powered crop monitoring and analysis.' }
];

// Test conferences
const testConferences = [
  { id: 'TESTA001', name: 'Test Conference A', location: 'Boston, MA', start_date: '2025-03-15', end_date: '2025-03-17' },
  { id: 'TESTB002', name: 'Test Conference B', location: 'San Francisco, CA', start_date: '2025-04-20', end_date: '2025-04-22' },
  { id: 'TESTC003', name: 'Test Conference C', location: 'New York, NY', start_date: '2025-05-10', end_date: '2025-05-12' }
];

async function loadTestData() {
  console.log('Loading test data...');

  const password = await bcrypt.hash('password123', 10);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Insert test users
      const insertUser = db.prepare(`
        INSERT INTO researchers (name, email, password, institution, research_areas, bio, interests)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const userIds = [];
      let insertedUsers = 0;

      testUsers.forEach((user, index) => {
        insertUser.run(
          user.name,
          user.email,
          password,
          user.institution,
          user.research_areas,
          user.bio,
          user.interests,
          function(err) {
            if (err) {
              console.error(`Error inserting user ${user.name}:`, err.message);
            } else {
              userIds.push(this.lastID);
              insertedUsers++;
              console.log(`✓ Created user: ${user.name}`);

              if (insertedUsers === testUsers.length) {
                insertUser.finalize();
                insertConferences(userIds, resolve, reject);
              }
            }
          }
        );
      });
    });
  });
}

function insertConferences(userIds, resolve, reject) {
  // Insert test conferences
  const insertConference = db.prepare(`
    INSERT INTO conferences (id, name, location, start_date, end_date, host_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let insertedConferences = 0;

  testConferences.forEach((conference, index) => {
    // Use the first user of each group (0, 10, 20) as hosts
    const hostId = userIds[index * 10];

    insertConference.run(
      conference.id,
      conference.name,
      conference.location,
      conference.start_date,
      conference.end_date,
      hostId,
      function(err) {
        if (err) {
          console.error(`Error inserting conference ${conference.name}:`, err.message);
        } else {
          insertedConferences++;
          console.log(`✓ Created conference: ${conference.name} (ID: ${conference.id})`);

          if (insertedConferences === testConferences.length) {
            insertConference.finalize();
            addParticipants(userIds, resolve, reject);
          }
        }
      }
    );
  });
}

function addParticipants(userIds, resolve, reject) {
  // Distribute users across conferences
  // Conference A: users 0-9
  // Conference B: users 10-19
  // Conference C: users 20-29

  const insertParticipant = db.prepare(`
    INSERT INTO conference_participants (conference_id, researcher_id)
    VALUES (?, ?)
  `);

  let insertedParticipants = 0;
  const totalParticipants = userIds.length;

  userIds.forEach((userId, index) => {
    let conferenceId;
    if (index < 10) {
      conferenceId = 'TESTA001';
    } else if (index < 20) {
      conferenceId = 'TESTB002';
    } else {
      conferenceId = 'TESTC003';
    }

    insertParticipant.run(conferenceId, userId, function(err) {
      if (err) {
        console.error(`Error adding participant ${userId} to ${conferenceId}:`, err.message);
      } else {
        insertedParticipants++;
        console.log(`✓ Added user ${userId} to ${conferenceId}`);

        if (insertedParticipants === totalParticipants) {
          insertParticipant.finalize();
          db.close((err) => {
            if (err) {
              console.error('Error closing database:', err.message);
              reject(err);
            } else {
              console.log('\n✅ Test data loaded successfully!');
              console.log(`   - 30 test users created`);
              console.log(`   - 3 test conferences created`);
              console.log(`   - Users distributed across conferences`);
              console.log('\nTest Conference IDs:');
              console.log('   - Test Conference A: TESTA001');
              console.log('   - Test Conference B: TESTB002');
              console.log('   - Test Conference C: TESTC003');
              console.log('\nAll test users have password: password123');
              resolve();
            }
          });
        }
      }
    });
  });
}

// Run the script
loadTestData().catch(err => {
  console.error('Failed to load test data:', err);
  db.close();
  process.exit(1);
});
