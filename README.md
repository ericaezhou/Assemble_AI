# Assemble AI

A discovery tool for research conferences that helps researchers connect with others working on similar topics.

## Features

- **Onboarding Form**: Simple profile creation with research areas, interests, institution, and bio
- **Smart Recommendations**: Get matched with researchers based on shared research areas and interests
- **Search Functionality**: Search for researchers by name, institution, interests, or research areas
- **Profile Display**: View detailed profiles of other researchers

## Tech Stack

- **Frontend**: Next.js with TypeScript
- **Backend**: Node.js with Express
- **Database**: Supabase
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository and navigate to the project directory:

```bash
cd Assemble_AI
```

2. Install backend dependencies:

```bash
npm install
```

3. Install frontend dependencies:

```bash
cd client
npm install
cd ..
```

4. Install parsing service dependencies:

```bash
cd parsing_service
pip install -r requirements.txt
cd ..
```

### Running the Application

You can run the backend, frontend, and parsing service simultaneously:

```bash
npm run dev
```

Or run them separately:

**Backend (runs on port 5001):**

```bash
npm run server
```

**Frontend (runs on port 3000):**

```bash
npm run client
```

**Parsing Service (runs on port 5100):**

```bash
python app.py
```

### Env Files

For security purposes, all necessary API keys stored within the repo's env files have not been pushed to GitHub. Please reach out privately to receive the files if you do not have them already as the application cannot run locally without them.

### Using the Application

1. Open your browser to `http://localhost:3000`
2. Click "Sign up" to create a new account
3. Complete the onboarding flow:
   - Optionally upload your resume or LinkedIn screenshot to auto-fill your profile
   - Enter your name, email, and password
   - Select your occupation and provide relevant details
   - Choose your interests, skills, and hobbies
   - A bio will be automatically generated from your GitHub/resume data
4. After signup, you'll see your dashboard with events
5. Create or join events using event IDs
6. View event details, search participants, and get recommendations

## API Endpoints

### Authentication

Authentication (signup/login) happens client-side via Supabase Auth.

- `POST /api/auth/check-email` - Check if an email is already registered

### Researchers

- `GET /api/researchers` - Get all researchers
- `GET /api/researchers/:id` - Get a specific researcher
- `PUT /api/researchers/:id` - Update researcher profile
- `GET /api/researchers/search/:query` - Search researchers
- `GET /api/researchers/:id/recommendations` - Get personalized recommendations
- `GET /api/researchers/:id/conferences` - Get all conferences for a user

### Profiles

- `POST /api/profiles/:id/generate-bio` - Generate a bio using LLM from GitHub and/or resume data

### Conferences

- `POST /api/conferences` - Create a new conference
- `POST /api/conferences/:id/join` - Join a conference by ID
- `GET /api/conferences/:id` - Get conference details
- `GET /api/conferences/:id/participants` - Get conference participants with similarity scores

### Messaging

- `POST /api/conversations` - Create or get a conversation between two users
- `GET /api/conversations/user/:userId` - Get all conversations for a user
- `GET /api/conversations/:id/messages` - Get all messages in a conversation
- `POST /api/messages` - Send a message in a conversation

### GitHub

- `GET /api/github/profile/:username` - Get GitHub profile and repository data

### Resume Parsing

The parsing service runs on port 5100. These endpoints are proxied through the main server.

- `POST /api/parsing/upload` - Upload a resume/LinkedIn screenshot for parsing
- `GET /api/parsing/result` - Get the parsed result for a job
- `POST /api/parsing/confirm` - Confirm parsed data with optional overrides
- `POST /api/parsing/claim` - Associate a parsing job with a user

## How Recommendations Work

The recommendation algorithm calculates similarity scores based on:

- Matching research interests (weight: 2)
- Matching research areas (weight: 3)

Researchers with higher similarity scores appear first in your recommendations.

## Features

### 1:1 Messaging

- Click "Connect" on any researcher's profile to start a conversation
- Auto-generated intro messages based on common interests
- View all your connections in the "Connections" tab
- Resume conversations anytime

### Smart Introductions

When you connect with someone for the first time, the system automatically generates a friendly intro message highlighting your common research interests, eliminating the need for awkward ice-breaking!

## Future Enhancements

- Natural language search for finding participants (AI-powered intro messages)
- Advanced filtering options
- Group chat functionality
- Real-time notifications
- Profile photos and attachments
- Export connections to contact list
- Conference schedule and session management

## License

MIT
