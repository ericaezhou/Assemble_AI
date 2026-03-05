This linkedin service uses the scrapfly.io scraper to scrape profile data from linkedin.com.
Code based on: https://github.com/scrapfly/scrapfly-scrapers/blob/main/linkedin-scraper/README.md

## Setup

1. Create and activate a virtual environment, then install dependencies:

```bash
cd linkedin_parser
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Set the Scrapfly API key in a `.env` file within the `linkedin_service` directory. Please reach out to the Assemble AI team for access to the API key.

## Usage

Start the service:

```bash
python app.py
```

The service runs on port 5200 by default. To scrape profiles, send a POST request:

```bash
curl -X POST http://localhost:5200/api/linkedin/scrape \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://www.linkedin.com/in/williamhgates"]}'
```
