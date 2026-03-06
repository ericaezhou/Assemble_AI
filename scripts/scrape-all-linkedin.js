#!/usr/bin/env node
/**
 * Scrape LinkedIn profiles for all users who provided a LinkedIn URL
 * but don't have cached data in linkedin_profiles yet.
 *
 * Usage:
 *   node scripts/scrape-all-linkedin.js
 *
 * Requires the LinkedIn service to be running (npm run dev).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const LINKEDIN_SERVICE_URL = process.env.LINKEDIN_SERVICE_URL || 'http://localhost:5200';

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

const MAX_RETRIES = 3;
const RETRY_DELAY = 10000;

async function scrapeUser(userId, linkedinUrl) {
  const fullUrl = linkedinUrl.startsWith('http')
    ? linkedinUrl
    : `https://www.linkedin.com/in/${linkedinUrl}`;

  if (!/^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/.test(fullUrl)) {
    console.warn(`  Skipping — invalid LinkedIn URL: ${fullUrl}`);
    return false;
  }

  console.log(`  Scraping ${fullUrl}...`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`${LINKEDIN_SERVICE_URL}/api/linkedin/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [fullUrl] }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Service returned ${res.status}`);

      const { profiles } = await res.json();
      if (!profiles || profiles.length === 0) throw new Error('No profile data returned');

      const extracted = extractLinkedInFields(profiles[0]);

      await supabase
        .from('linkedin_profiles')
        .upsert({
          user_id: userId,
          linkedin_url: fullUrl,
          ...extracted,
          raw_data: profiles[0],
          status: 'success',
          error_message: null,
          scraped_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      console.log(`  Success! Name: ${extracted.name}, Headline: ${extracted.headline}`);
      return true;
    } catch (err) {
      console.warn(`  Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        console.log(`  Retrying in ${RETRY_DELAY / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  // All retries failed
  await supabase
    .from('linkedin_profiles')
    .upsert({
      user_id: userId,
      linkedin_url: fullUrl,
      status: 'failed',
      error_message: `Failed after ${MAX_RETRIES} attempts`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  console.error(`  Failed after ${MAX_RETRIES} attempts`);
  return false;
}

(async () => {
  // Get all users with LinkedIn URLs
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, name, linkedin')
    .not('linkedin', 'is', null)
    .neq('linkedin', '');

  if (error) { console.error('Query error:', error.message); process.exit(1); }

  // Get already-scraped user IDs and LinkedIn URLs
  const { data: existing } = await supabase
    .from('linkedin_profiles')
    .select('user_id, linkedin_url')
    .eq('status', 'success');

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

  for (const user of toScrape) {
    console.log(`\n--- ${user.name || 'Unknown'} (${user.id}) ---`);
    const ok = await scrapeUser(user.id, user.linkedin.trim());
    if (ok) succeeded++;
    else failed++;
  }

  console.log(`\nDone! Succeeded: ${succeeded}, Failed: ${failed}, Skipped: ${alreadyScraped.size}`);
})();
