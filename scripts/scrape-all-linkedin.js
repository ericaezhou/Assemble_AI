#!/usr/bin/env node
/**
 * Scrape LinkedIn profiles for all users who provided a LinkedIn URL
 * but don't have cached data in linkedin_profiles yet.
 *
 * Usage:
 *   node scripts/scrape-all-linkedin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const { scrapeProfiles } = require('../server/lib/linkedin');

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

async function scrapeUser(userId, linkedinUrl) {
  const fullUrl = linkedinUrl.startsWith('http')
    ? linkedinUrl
    : `https://www.linkedin.com/in/${linkedinUrl}`;

  if (!/^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/.test(fullUrl)) {
    console.warn(`  Skipping — invalid LinkedIn URL: ${fullUrl}`);
    return false;
  }

  console.log(`  Scraping ${fullUrl}...`);

  try {
    const profiles = await scrapeProfiles([fullUrl]);

    if (!profiles || profiles.length === 0) {
      // Profile not found in Crustdata — mark so we don't retry
      await supabase
        .from('linkedin_profiles')
        .upsert({
          user_id: userId,
          linkedin_url: fullUrl,
          source: 'crustdata',
          status: 'not_found',
          error_message: 'Profile not found in Crustdata',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      console.warn(`  Not found in Crustdata`);
      return false;
    }

    const extracted = extractLinkedInFields(profiles[0]);

    await supabase
      .from('linkedin_profiles')
      .upsert({
        user_id: userId,
        linkedin_url: fullUrl,
        ...extracted,
        raw_data: profiles[0],
        source: 'crustdata',
        status: 'success',
        error_message: null,
        scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    console.log(`  Success! Name: ${extracted.name}, Headline: ${extracted.headline}`);
    return true;
  } catch (err) {
    await supabase
      .from('linkedin_profiles')
      .upsert({
        user_id: userId,
        linkedin_url: fullUrl,
        source: 'crustdata',
        status: 'failed',
        error_message: err.message,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    console.error(`  Failed: ${err.message}`);
    return false;
  }
}

(async () => {
  // Get all users with LinkedIn URLs
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, name, linkedin')
    .not('linkedin', 'is', null)
    .neq('linkedin', '');

  if (error) { console.error('Query error:', error.message); process.exit(1); }

  // Get already-scraped or not-found user IDs and LinkedIn URLs
  const { data: existing } = await supabase
    .from('linkedin_profiles')
    .select('user_id, linkedin_url, status')
    .in('status', ['success', 'not_found']);

  const scrapedUserIds = new Set((existing || []).map(r => r.user_id));
  const scrapedUrls = new Set((existing || []).map(r => r.linkedin_url));

  // Normalize a LinkedIn slug/URL to a canonical form for dedup
  function normalizeLinkedInUrl(url) {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase();
  }
  const scrapedNormalized = new Set([...scrapedUrls].map(normalizeLinkedInUrl));

  const toScrape = users.filter(u => {
    if (scrapedUserIds.has(u.id)) return false;
    const fullUrl = u.linkedin.trim().startsWith('http')
      ? u.linkedin.trim()
      : `https://www.linkedin.com/in/${u.linkedin.trim()}`;
    if (scrapedNormalized.has(normalizeLinkedInUrl(fullUrl))) {
      console.log(`Skipping ${u.name} — LinkedIn URL already scraped for another user`);
      return false;
    }
    return true;
  });
  console.log(`Found ${users.length} users with LinkedIn URLs, ${toScrape.length} need scraping\n`);

  let succeeded = 0;
  let failed = 0;
  const scrapedThisRun = new Set();

  for (const user of toScrape) {
    const fullUrl = user.linkedin.trim().startsWith('http')
      ? user.linkedin.trim()
      : `https://www.linkedin.com/in/${user.linkedin.trim()}`;
    const normalized = normalizeLinkedInUrl(fullUrl);

    if (scrapedThisRun.has(normalized)) {
      console.log(`\nSkipping ${user.name} — LinkedIn URL already scraped earlier in this run`);
      continue;
    }

    console.log(`\n--- ${user.name || 'Unknown'} (${user.id}) ---`);
    const ok = await scrapeUser(user.id, user.linkedin.trim());
    if (ok) succeeded++;
    else failed++;
    scrapedThisRun.add(normalized);
  }

  console.log(`\nDone! Succeeded: ${succeeded}, Failed: ${failed}, Skipped: ${scrapedUserIds.size}`);
})();
