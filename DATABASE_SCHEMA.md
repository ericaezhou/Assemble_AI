# Database Schema Documentation

## Overview
Assemble AI uses SQLite for local development with plans to migrate to PostgreSQL on Supabase for production.

## Tables

### researchers
Stores user profile information collected during onboarding.

```sql
CREATE TABLE researchers (
  -- Core fields
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Onboarding: Occupation
  occupation TEXT,  -- Student/Professional/Researcher/Other

  -- Onboarding: Educational/Work details (conditional)
  school TEXT,                    -- School/Institution/Company name
  major TEXT,                     -- For students
  year TEXT,                      -- Student year (Freshman/Sophomore/etc)
  company TEXT,                   -- For professionals
  title TEXT,                     -- For professionals
  work_experience_years TEXT,     -- For professionals (0-1 years, 1-3 years, etc)
  degree TEXT,                    -- Highest degree (High School/Associate/Bachelor's/Master's/PhD/None)
  research_area TEXT,             -- For researchers
  other_description TEXT,         -- For "Other" occupation

  -- Onboarding: Interests, Skills, Hobbies (JSON arrays)
  interest_areas TEXT,            -- JSON array of interest values
  current_skills TEXT,            -- JSON array of skill values
  hobbies TEXT,                   -- JSON array of hobby values

  -- Legacy fields (backward compatibility)
  institution TEXT,
  research_areas TEXT,
  bio TEXT,
  interests TEXT
);
```

**Example Data:**
```json
{
  "id": 1,
  "name": "Alice Chen",
  "email": "alice@example.com",
  "occupation": "Student",
  "school": "MIT",
  "major": "Computer Science",
  "year": "Junior",
  "degree": "Bachelor's",
  "interest_areas": "[\"ai-agents\",\"machine-learning\",\"computer-vision\"]",
  "current_skills": "[\"frontend\",\"backend\",\"ml-engineering\"]",
  "hobbies": "[\"gaming\",\"hiking\",\"matcha\"]"
}
```

### conferences
Stores conference/event information.

```sql
CREATE TABLE conferences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  host_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES researchers(id)
);
```

### conference_participants
Junction table for many-to-many relationship between researchers and conferences.

```sql
CREATE TABLE conference_participants (
  conference_id TEXT NOT NULL,
  researcher_id INTEGER NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conference_id, researcher_id),
  FOREIGN KEY (conference_id) REFERENCES conferences(id),
  FOREIGN KEY (researcher_id) REFERENCES researchers(id)
);
```

### conversations
Stores 1-on-1 conversations between users.

```sql
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant1_id INTEGER NOT NULL,
  participant2_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant1_id) REFERENCES researchers(id),
  FOREIGN KEY (participant2_id) REFERENCES researchers(id),
  UNIQUE(participant1_id, participant2_id)
);
```

### messages
Stores messages within conversations.

```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_system_message BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (sender_id) REFERENCES researchers(id)
);
```

## API Endpoints

### POST /api/auth/signup
Creates a new user account with all onboarding data.

**Request Body:**
```json
{
  "name": "Alice Chen",
  "email": "alice@example.com",
  "password": "password123",
  "verificationCode": "123456",
  "occupation": "Student",
  "school": "MIT",
  "major": "Computer Science",
  "year": "Junior",
  "degree": "Bachelor's",
  "interest_areas": ["ai-agents", "machine-learning"],
  "current_skills": ["frontend", "backend"],
  "hobbies": ["gaming", "hiking"]
}
```

### parsing_jobs
Tracks resume/photo parsing jobs.

```sql
CREATE TABLE parsing_jobs (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL,              -- pending/processing/success/failed
  error TEXT,
  parsed_data TEXT,                  -- JSON string of parsed profile data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES researchers(id)
);
```

**Response:**
```json
{
  "id": 1,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Profile created successfully"
}
```

### GET /api/researchers/:id
Retrieves full user profile with parsed JSON fields.

**Response:**
```json
{
  "id": 1,
  "name": "Alice Chen",
  "email": "alice@example.com",
  "occupation": "Student",
  "school": "MIT",
  "major": "Computer Science",
  "year": "Junior",
  "degree": "Bachelor's",
  "interest_areas": ["ai-agents", "machine-learning", "computer-vision"],
  "current_skills": ["frontend", "backend", "ml-engineering"],
  "hobbies": ["gaming", "hiking", "matcha"],
  "created_at": "2026-01-19T19:00:00.000Z"
}
```

Note: Password field is excluded from response.

## Data Types

### Occupation Types
- `Student`
- `Professional`
- `Researcher`
- `Other`

### Year Options (for Students)
- `Freshman`
- `Sophomore`
- `Junior`
- `Senior`
- `Graduate`

### Experience Options (for Professionals)
- `0-1 years`
- `1-3 years`
- `3-5 years`
- `5-10 years`
- `10+ years`

### Degree Options
- `High School`
- `Associate`
- `Bachelor's`
- `Master's`
- `PhD`
- `None`

### Interest Areas, Skills, and Hobbies
See `client/utils/profileOptions.ts` for complete lists with fun descriptions.

## Migration to PostgreSQL/Supabase

When migrating to PostgreSQL, the schema will remain largely the same with these changes:

1. **AUTO_INCREMENT** → **SERIAL**
2. **TEXT** → **VARCHAR** or **TEXT** (PostgreSQL TEXT is more flexible)
3. **DATETIME** → **TIMESTAMP WITH TIME ZONE**
4. **JSON fields**: Use native **JSONB** type instead of TEXT

Example PostgreSQL schema:
```sql
CREATE TABLE researchers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  occupation VARCHAR(50),
  interest_areas JSONB,  -- Native JSON support
  current_skills JSONB,
  hobbies JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Benefits of JSONB:
- Native indexing support
- Efficient querying: `interest_areas @> '["ai-agents"]'`
- Better performance than TEXT-stored JSON
