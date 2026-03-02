/**
 * Seed script: creates a test event with require_approval=true
 * and inserts 6 fake pending applicants with LinkedIn URLs.
 *
 * Run with:  node server/seed-test-applicants.js
 * (from the repo root, after server/.env is populated)
 */

require('dotenv').config({ path: __dirname + '/.env' });
const { createClient } = require('@supabase/supabase-js');

const HOST_USER_ID = '04e4a95d-4906-455e-b256-22239a837f1c';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Fake applicant profiles (realistic, AI/startup-adjacent people)
const FAKE_APPLICANTS = [
  {
    name: 'Aarav Shah',
    occupation: 'student',
    school: 'Stanford University',
    major: 'Computer Science',
    year: '3rd year PhD',
    research_area: 'Large language models and reasoning',
    interest_areas: ['AI/ML', 'NLP', 'Startups'],
    current_skills: ['Python', 'PyTorch', 'LLM fine-tuning', 'RLHF'],
    bio: 'PhD student at Stanford AI Lab working on reasoning in LLMs. Published at NeurIPS 2023.',
    linkedin: 'https://www.linkedin.com/in/aarav-shah-stanford',
    github: 'https://github.com/aaravshah',
  },
  {
    name: 'Priya Mehta',
    occupation: 'professional',
    company: 'Andreessen Horowitz',
    title: 'Partner',
    work_experience_years: '8',
    interest_areas: ['Venture Capital', 'AI/ML', 'Enterprise Software'],
    current_skills: ['Investment thesis', 'Due diligence', 'Portfolio management'],
    bio: 'VC Partner at a16z focused on AI-native enterprise startups. Former ML engineer at Google.',
    linkedin: 'https://www.linkedin.com/in/priya-mehta-a16z',
    github: null,
  },
  {
    name: 'Marcus Williams',
    occupation: 'professional',
    company: 'StealthAI',
    title: 'Founder & CEO',
    work_experience_years: '5',
    interest_areas: ['AI/ML', 'Startups', 'Product'],
    current_skills: ['Product management', 'Go-to-market', 'Python', 'Vision AI'],
    bio: 'Building an AI-powered computer vision platform for retail. Ex-PM at Meta.',
    linkedin: 'https://www.linkedin.com/in/marcus-williams-founder',
    github: 'https://github.com/mwilliamsai',
  },
  {
    name: 'Yuki Tanaka',
    occupation: 'student',
    school: 'Carnegie Mellon University',
    major: 'Machine Learning',
    year: '2nd year PhD',
    research_area: 'Multimodal AI and robotics',
    interest_areas: ['Robotics', 'AI/ML', 'Computer Vision'],
    current_skills: ['PyTorch', 'ROS', 'C++', 'Python', 'Simulation'],
    bio: 'CMU Robotics PhD studying multimodal learning for manipulation tasks. NSF Fellow.',
    linkedin: 'https://www.linkedin.com/in/yuki-tanaka-cmu',
    github: 'https://github.com/yukitanaka',
  },
  {
    name: 'Sofia Reyes',
    occupation: 'professional',
    company: 'Sequoia Capital',
    title: 'Associate',
    work_experience_years: '3',
    interest_areas: ['Venture Capital', 'Healthcare AI', 'Startups'],
    current_skills: ['Market analysis', 'Financial modeling', 'Healthcare domain'],
    bio: 'VC Associate at Sequoia covering healthcare AI and biotech. MBA from Wharton.',
    linkedin: 'https://www.linkedin.com/in/sofia-reyes-sequoia',
    github: null,
  },
  {
    name: 'James Chen',
    occupation: 'student',
    school: 'MIT',
    major: 'Electrical Engineering and Computer Science',
    year: 'Senior',
    research_area: 'Efficient neural networks and edge AI',
    interest_areas: ['AI/ML', 'Hardware', 'Startups'],
    current_skills: ['Python', 'CUDA', 'Model quantization', 'TensorRT'],
    bio: 'MIT senior building efficient on-device AI models. Interned at NVIDIA Research.',
    linkedin: 'https://www.linkedin.com/in/james-chen-mit-eecs',
    github: 'https://github.com/jameschen-mit',
  },
];

async function seed() {
  console.log('🌱 Starting seed script...\n');

  // 1. Find or create a test event hosted by the user
  let eventId;

  const { data: existingEvents } = await supabase
    .from('conferences')
    .select('id, name, require_approval')
    .eq('host_id', HOST_USER_ID)
    .eq('require_approval', true)
    .limit(1);

  if (existingEvents && existingEvents.length > 0) {
    eventId = existingEvents[0].id;
    console.log(`✅ Found existing approval-required event: "${existingEvents[0].name}" (ID: ${eventId})\n`);
  } else {
    const { data: newEvent, error: createErr } = await supabase
      .from('conferences')
      .insert({
        name: 'AI Demo Day 2025',
        description: 'Annual showcase for AI researchers and founders. Curated audience of VCs, builders, and top academics.',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: 'Gates Hillman Center, CMU',
        host_id: HOST_USER_ID,
        require_approval: true,
        max_participants: 50,
      })
      .select('id, name')
      .single();

    if (createErr) {
      console.error('❌ Failed to create event:', createErr.message);
      process.exit(1);
    }

    eventId = newEvent.id;
    console.log(`✅ Created new event: "${newEvent.name}" (ID: ${eventId})\n`);
  }

  // 2. Create auth users (needed due to FK profiles.id -> auth.users.id)
  //    then update the auto-created profile row with applicant details.
  const profileIds = [];

  for (const applicant of FAKE_APPLICANTS) {
    const slug = applicant.name.toLowerCase().replace(/\s+/g, '.');
    const email = `${slug}.seed@example.com`;

    // Check if auth user already exists by looking for existing profile with this email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    let userId;

    if (existingProfile) {
      userId = existingProfile.id;
      console.log(`  ↩ Reusing existing user: ${applicant.name}`);
    } else {
      // Create auth user via admin API — triggers DB trigger to create profile row
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password: 'SeedPass123!',
        email_confirm: true,
        user_metadata: { name: applicant.name },
      });

      if (authErr) {
        console.error(`❌ Failed to create auth user for ${applicant.name}:`, authErr.message);
        continue;
      }

      userId = authData.user.id;

      // Small delay for DB trigger to create profile row
      await new Promise(r => setTimeout(r, 400));
      console.log(`  ✓ Created auth user: ${applicant.name}`);
    }

    // Update profile with full applicant details
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        name: applicant.name,
        occupation: applicant.occupation,
        school: applicant.school || null,
        major: applicant.major || null,
        year: applicant.year || null,
        company: applicant.company || null,
        title: applicant.title || null,
        work_experience_years: applicant.work_experience_years || null,
        research_area: applicant.research_area || null,
        interest_areas: applicant.interest_areas || [],
        current_skills: applicant.current_skills || [],
        bio: applicant.bio || null,
        linkedin: applicant.linkedin || null,
        github: applicant.github || null,
      })
      .eq('id', userId);

    if (updateErr) {
      console.error(`❌ Failed to update profile for ${applicant.name}:`, updateErr.message);
      continue;
    }

    profileIds.push(userId);
  }

  console.log('');

  // 3. Insert pending participants (skip if already joined)
  let added = 0;
  let skipped = 0;

  for (const profileId of profileIds) {
    // Check if already a participant
    const { data: existing } = await supabase
      .from('conference_participants')
      .select('researcher_id')
      .eq('conference_id', eventId)
      .eq('researcher_id', profileId)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    const { error: joinErr } = await supabase
      .from('conference_participants')
      .insert({
        conference_id: eventId,
        researcher_id: profileId,
        status: 'pending',
      });

    if (joinErr) {
      console.error(`❌ Failed to add participant ${profileId}:`, joinErr.message);
    } else {
      added++;
    }
  }

  console.log(`✅ Added ${added} pending applicants to event (${skipped} already existed)\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎉 Done! Open the app, go to Events, and find:`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   Click the event → "Review Applicants" tab`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
