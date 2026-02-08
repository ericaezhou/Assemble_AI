# Parsing Service

Resume/photo parsing API for Assemble AI.

## Setup

```bash
cd parsing_service
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install -r requirements.txt
```

Create `parsing_service/.env`:

```
SUPABASE_URL=...
SUPABASE_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
PARSING_PROMPT_ID=pmpt_...
PARSING_PROMPT_VERSION=   # optional
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
