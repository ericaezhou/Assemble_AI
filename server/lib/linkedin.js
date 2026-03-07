/**
 * LinkedIn profile enrichment using Crustdata People Enrichment API.
 *
 * Requires env variable:
 *   CRUSTDATA_API_KEY - your Crustdata API token
 */

const CRUSTDATA_API_KEY = process.env.CRUSTDATA_API_KEY;
const CRUSTDATA_BASE = 'https://api.crustdata.com/screener/person/enrich';

/**
 * Enrich one or more LinkedIn profile URLs via Crustdata.
 * @param {string[]} urls - LinkedIn profile URLs
 * @returns {Promise<Array<object>>} - Array of Crustdata profile objects
 */
async function scrapeProfiles(urls) {
  const results = [];

  for (const url of urls) {
    try {
      const res = await fetch(
        `${CRUSTDATA_BASE}?linkedin_profile_url=${encodeURIComponent(url)}&enrich_realtime=false`,
        {
          headers: { Authorization: `Token ${CRUSTDATA_API_KEY}` },
        }
      );

      if (!res.ok) {
        throw new Error(`Crustdata returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      // Response may be an array or have a profiles array
      const profiles = Array.isArray(data) ? data : data.profiles || [data];
      if (!profiles.length) {
        throw new Error('No profile data returned from Crustdata');
      }

      results.push(profiles[0]);
    } catch (err) {
      console.error(`Failed to enrich ${url}: ${err.message}`);
    }
  }

  console.log(`Enriched ${results.length} profiles from Crustdata`);
  return results;
}

module.exports = { scrapeProfiles };
