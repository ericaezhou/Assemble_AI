"""
LinkedIn profile scraper using Scrapfly.
Based on: https://github.com/scrapfly/scrapfly-scrapers/blob/main/linkedin-scraper

To run this scraper set env variable $SCRAPFLY_KEY with your scrapfly API key:
$ export SCRAPFLY_KEY="your key from https://scrapfly.io/dashboard"
"""

import os
import json
from typing import Dict, List
from parsel import Selector
from loguru import logger as log
from scrapfly import ScrapeConfig, ScrapflyClient, ScrapeApiResponse

SCRAPFLY = ScrapflyClient(key=os.environ["SCRAPFLY_KEY"])

BASE_CONFIG = {
    "asp": True,
    "country": "US",
    "headers": {
        "Accept-Language": "en-US,en;q=0.5"
    },
    "render_js": True,
    "proxy_pool": "public_residential_pool",
}


def refine_profile(data: Dict) -> Dict:
    parsed_data = {}
    profile_data = [key for key in data["@graph"] if key["@type"] == "Person"][0]
    profile_data["worksFor"] = [profile_data["worksFor"]]
    articles = [key for key in data["@graph"] if key["@type"] == "Article"]
    parsed_data["profile"] = profile_data
    parsed_data["posts"] = articles
    return parsed_data


def parse_profile(response: ScrapeApiResponse) -> Dict:
    selector = response.selector
    data = json.loads(
        selector.xpath("//script[@type='application/ld+json']/text()").get()
    )
    refined_data = refine_profile(data)
    return refined_data


async def scrape_profile(urls: List[str]) -> List[Dict]:
    """Scrape one or more LinkedIn profile URLs."""
    to_scrape = [ScrapeConfig(url, **BASE_CONFIG) for url in urls]
    data = []
    async for response in SCRAPFLY.concurrent_scrape(to_scrape):
        try:
            profile_data = parse_profile(response)
            data.append(profile_data)
        except Exception as e:
            log.error("An error occurred while scraping profile pages", e)
    log.success(f"scraped {len(data)} profiles from LinkedIn")
    return data
