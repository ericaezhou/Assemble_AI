/**
 * LinkedIn profile scraper using Scrapfly REST API.
 *
 * Requires env variable:
 *   SCRAPFLY_KEY - your Scrapfly API key
 */

const SCRAPFLY_KEY = process.env.SCRAPFLY_KEY;
const SCRAPFLY_BASE = 'https://api.scrapfly.io/scrape';

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // ms

function refineProfile(data) {
  const profileData = data['@graph'].find((item) => item['@type'] === 'Person');
  if (!profileData) throw new Error('No Person found in JSON-LD @graph');

  // Wrap worksFor in array if it isn't one
  if (!Array.isArray(profileData.worksFor)) {
    profileData.worksFor = [profileData.worksFor];
  }

  const articles = data['@graph'].filter((item) => item['@type'] === 'Article');

  return { profile: profileData, posts: articles };
}

function parseProfile(html) {
  const match = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) {
    throw new Error('No JSON-LD data found — LinkedIn may have returned a login wall');
  }
  const data = JSON.parse(match[1]);
  return refineProfile(data);
}

/**
 * Scrape one or more LinkedIn profile URLs.
 * @param {string[]} urls - LinkedIn profile URLs to scrape
 * @returns {Promise<Array<{profile: object, posts: object[]}>>}
 */
async function scrapeProfiles(urls) {
  const results = [];

  for (const url of urls) {
    let profileData = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const params = new URLSearchParams({
          key: SCRAPFLY_KEY,
          url: url,
          asp: 'true',
          render_js: 'true',
          country: 'us',
        });

        const res = await fetch(`${SCRAPFLY_BASE}?${params}`);
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.error?.message || `Scrapfly returned success=false (status ${res.status})`);
        }

        const html = json.result.content;
        profileData = parseProfile(html);
        break;
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          console.warn(
            `Scrape failed for ${url} (attempt ${attempt}/${MAX_RETRIES}): ${err.message}. Retrying in ${RETRY_DELAY / 1000}s...`
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        } else {
          console.error(`Failed to scrape ${url} after ${attempt} attempt(s): ${err.message}`);
        }
      }
    }

    if (profileData) {
      results.push(profileData);
    }
  }

  console.log(`Scraped ${results.length} profiles from LinkedIn`);
  return results;
}

module.exports = { scrapeProfiles };
