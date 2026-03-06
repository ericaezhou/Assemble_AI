#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function sanitizeForLLM(text, maxLength = 100) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[\x00-\x1F\x7F]/g, '').replace(/\n+/g, ' ').trim().slice(0, maxLength);
}

function extractLinkedInFields(rawProfile) {
  const liProfile = rawProfile.profile || {};
  const liPosts = rawProfile.posts || [];

  const headline = Array.isArray(liProfile.jobTitle)
    ? liProfile.jobTitle[0]
    : liProfile.jobTitle;

  let firstOrg = liProfile.worksFor;
  while (Array.isArray(firstOrg)) firstOrg = firstOrg[0];
  const company = firstOrg?.name;

  let description = liProfile.description || liProfile.disambiguatingDescription || '';
  if (!description) {
    let workEntries = liProfile.worksFor;
    while (Array.isArray(workEntries) && Array.isArray(workEntries[0])) workEntries = workEntries[0];
    if (Array.isArray(workEntries)) {
      const firstDesc = workEntries.find(w => w?.member?.description)?.member?.description;
      if (firstDesc) description = firstDesc;
    }
  }

  const posts = liPosts.slice(0, 5)
    .map(p => sanitizeForLLM(p.articleBody || p.headline || p.name, 100))
    .filter(Boolean);

  return {
    name: sanitizeForLLM(liProfile.name, 50),
    headline: sanitizeForLLM(headline, 100),
    description: sanitizeForLLM(description, 200),
    company: sanitizeForLLM(company, 100),
    title: sanitizeForLLM(headline, 100),
    posts,
  };
}

(async () => {
  const { data: rows, error } = await supabase
    .from('linkedin_profiles')
    .select('id, user_id, name, headline, description, company, title, posts, raw_data')
    .eq('status', 'success')
    .not('raw_data', 'is', null);

  if (error) { console.error('Query error:', error.message); process.exit(1); }

  console.log(`Found ${rows.length} rows to check`);
  let updated = 0;

  for (const row of rows) {
    const needsBackfill = !row.name || !row.headline || !row.description || !row.company || !row.title || !row.posts?.length;
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
