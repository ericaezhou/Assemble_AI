# Research Connect

A discovery tool for research conferences that helps researchers connect with others working on similar topics.

## Features

- **Onboarding Form**: Simple profile creation with research areas, interests, institution, and bio
- **Smart Recommendations**: Get matched with researchers based on shared research areas and interests
- **Search Functionality**: Search for researchers by name, institution, interests, or research areas
- **Profile Display**: View detailed profiles of other researchers

## Tech Stack

- **Frontend**: Next.js with TypeScript
- **Backend**: Node.js with Express
- **Database**: SQLite
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository and navigate to the project directory:
```bash
cd research_connect
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

### Running the Application

You can run both the backend and frontend simultaneously:

```bash
npm run dev
```

Or run them separately:

**Backend (runs on port 5000):**
```bash
npm run server
```

**Frontend (runs on port 3000):**
```bash
npm run client
```

### Using the Application

1. Open your browser to `http://localhost:3000`
2. Sign up with your email and password or log in if you already have an account
3. Fill out the onboarding form with your information:
   - Name and email (required)
   - Password and confirmation
   - Institution
   - Research areas (comma-separated, e.g., "Machine Learning, Computer Vision")
   - Research interests (comma-separated, e.g., "Deep Learning, Healthcare")
   - Bio
4. After onboarding, you'll see your dashboard with conferences
5. Create or join conferences using conference IDs
6. View conference details, search participants, and get recommendations

### Loading Test Data

To populate the database with test data for development and testing:

**Load test data:**
```bash
node server/scripts/load-test-data.js
```

This will create:
- 30 test users with diverse research interests and institutions
- 3 test conferences (Test Conference A, B, C)
- Test users distributed across the conferences (10 users per conference)

Test conference IDs:
- Test Conference A: `TESTA001`
- Test Conference B: `TESTB002`
- Test Conference C: `TESTC003`

All test users have:
- Password: `password123`
- Names ending with `(Dummy)` for easy identification

**Remove test data:**
```bash
node server/scripts/cleanup-test-data.js
```

This will remove all test users, test conferences, and their associated data from the database.

## API Endpoints

### Authentication
- `POST /api/signup` - Create a new user account
- `POST /api/login` - Login with email and password

### Researchers
- `GET /api/researchers` - Get all researchers
- `GET /api/researchers/:id` - Get a specific researcher
- `GET /api/researchers/search/:query` - Search researchers
- `GET /api/researchers/:id/recommendations` - Get personalized recommendations

### Conferences
- `POST /api/conferences` - Create a new conference
- `POST /api/conferences/join` - Join a conference by ID
- `GET /api/conferences/user/:userId` - Get all conferences for a user
- `GET /api/conferences/:id` - Get conference details
- `GET /api/conferences/:id/participants` - Get conference participants with similarity scores

## How Recommendations Work

The recommendation algorithm calculates similarity scores based on:
- Matching research interests (weight: 2)
- Matching research areas (weight: 3)

Researchers with higher similarity scores appear first in your recommendations.

## Future Enhancements

- Natural language search for finding participants
- Advanced filtering options
- Messaging system between researchers
- Profile photos and attachments
- Export connections to contact list
- Real-time chat functionality
- Conference schedule and session management

## License

MIT
