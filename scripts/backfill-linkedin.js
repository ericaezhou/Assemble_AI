#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function sanitizeForLLM(text, maxLength = 100) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[\x00-\x1F\x7F]/g, '').replace(/\n+/g, ' ').trim().slice(0, maxLength);
}

function extractLinkedInFields(rawProfile) {
  const allEmployers = [
    ...(rawProfile.current_employers || []),
    ...(rawProfile.past_employers || []),
  ];
  allEmployers.sort((a, b) => new Date(b.end_date || '9999') - new Date(a.end_date || '9999'));
  const latest = allEmployers[0];

  let description = rawProfile.summary || '';
  if (!description && rawProfile.headline) {
    const school = (rawProfile.all_schools || [])[0];
    description = school ? `${rawProfile.headline}. ${school}` : rawProfile.headline;
  }

  const experiences = allEmployers.map(emp => ({
    company: sanitizeForLLM(emp.employer_name, 100),
    title: sanitizeForLLM(emp.employee_title, 100),
    description: sanitizeForLLM(emp.employee_description, 500),
    start_date: emp.start_date || null,
    end_date: emp.end_date || null,
  }));

  return {
    name: sanitizeForLLM(rawProfile.name, 50),
    headline: sanitizeForLLM(rawProfile.headline, 100),
    description: sanitizeForLLM(description, 200),
    company: sanitizeForLLM(latest?.employer_name, 100),
    title: sanitizeForLLM(latest?.employee_title, 100),
    experiences,
    posts: [],
  };
}

(async () => {
  const { data: rows, error } = await supabase
    .from('linkedin_profiles')
    .select('id, user_id, name, headline, description, company, title, experiences, posts, raw_data')
    .eq('status', 'success')
    .eq('source', 'crustdata')
    .not('raw_data', 'is', null);

  if (error) { console.error('Query error:', error.message); process.exit(1); }

  console.log(`Found ${rows.length} rows to check`);
  let updated = 0;

  for (const row of rows) {
    const needsBackfill = !row.name || !row.headline || !row.description || !row.company || !row.title || !row.experiences?.length || !row.posts?.length;
    if (!needsBackfill) {
      console.log(`Row ${row.id} - all fields populated, skipping`);
      continue;
    }

    const extracted = extractLinkedInFields(row.raw_data);
    const patch = {};
    if (!row.name && extracted.name) patch.name = extracted.name;
    if (!row.headline && extracted.headline) patch.headline = extracted.headline;
    if (!row.description && extracted.description) patch.description = extracted.description;
    if (!row.company && extracted.company) patch.company = extracted.company;
    if (!row.title && extracted.title) patch.title = extracted.title;
    if ((!row.experiences || !row.experiences.length) && extracted.experiences.length) patch.experiences = extracted.experiences;
    if ((!row.posts || !row.posts.length) && extracted.posts.length) patch.posts = extracted.posts;

    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('linkedin_profiles')
        .update(patch)
        .eq('id', row.id);

      if (updateError) {
        console.error(`Update error for ${row.id}:`, updateError.message);
      } else {
        console.log(`Updated row ${row.id} - filled: ${Object.keys(patch).join(', ')}`);
        updated++;
      }
    } else {
      console.log(`Row ${row.id} - nothing extractable from raw_data`);
    }
  }

  console.log(`\nDone. Updated ${updated} of ${rows.length} rows`);
})();
