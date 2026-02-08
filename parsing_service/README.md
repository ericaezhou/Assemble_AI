# Parsing Service

Resume/photo parsing API for Assemble AI.

## Setup

```bash
cd parsing_service
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install -r requirements.txt
```

Create `parsing_service/.env` (loaded by `python-dotenv` when Supabase client initializes):

```
SUPABASE_URL=...                            # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=...               # preferred; required for insert/update
# SUPABASE_KEY=...                          # fallback anon key (limited permissions)
OPENAI_API_KEY=...                          # OpenAI API key
OPENAI_MODEL=gpt-4o-mini                    # Responses API model name
OPENAI_BASE_URL=https://api.openai.com/v1   # optional; use proxy/private gateway URL
PARSING_PROMPT_ID=pmpt_...                  # OpenAI Prompt ID on platform
PARSING_PROMPT_VERSION=...                  # optional; lock prompt version
PARSING_JSON_INSTRUCTIONS=Return JSON only. # optional; added to hint for JSON
PARSING_UPLOAD_DIR=...                      # optional; default parsing_service/uploads
HOST=127.0.0.1                              # optional; Flask bind host
PORT=5100                                   # optional; Flask port
DEBUG=1                                     # optional; 1 enable debug
```

## Run

```bash
python app.py
```

## API

- `POST /api/parsing/upload` (multipart form: `user_id`, `file`)
- `GET /api/parsing/status?job_id=...`
- `GET /api/parsing/result?job_id=...`
- `POST /api/parsing/confirm` (json: `job_id`, optional `overrides`)

## Prompt on OpenAI Platform (optional)
If you want to update prompts without code changes, create a Prompt in the
OpenAI dashboard and set its ID in `PARSING_PROMPT_ID`.

Recommended variables in your Prompt template:
- `{{content}}` (required) — the resume text or image input
- `{{hint}}` (optional) — extra instruction text for image parsing

The service always uses the platform Prompt specified by `PARSING_PROMPT_ID`.
