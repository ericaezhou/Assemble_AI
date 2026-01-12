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
- **Database**: SQLite
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

### Email Verification Setup (Optional for Production)

By default, the application runs in **development mode** where verification codes are printed to the server console instead of being emailed. This allows you to test without configuring email.

**For production email sending:**

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your email credentials in `.env`:
   - For Gmail: Use your email and create an [app-specific password](https://myaccount.google.com/apppasswords)
   - For other services: Update `server/emailService.js` with your service configuration

3. Restart the server to load the new environment variables

**In development mode** (no email configured):
- Verification codes are printed to the server console
- Check the terminal running `npm run dev` to see the 6-digit code
- Copy the code and paste it into the signup form

### Using the Application

1. Open your browser to `http://localhost:3000`
2. Click "Sign up" to create a new account
3. Fill out the signup form:
   - Enter your email and click "Get Code" to receive a verification code
   - In development mode, check the server console for the code
   - Enter the 6-digit verification code
   - Complete the form with your name, password, institution, research areas, interests, and bio
4. After signup, you'll see your dashboard with conferences
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
- `POST /api/auth/send-verification-code` - Send verification code to email
- `POST /api/auth/signup` - Create a new user account (requires verification code)
- `POST /api/auth/login` - Login with email and password

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

### Messaging
- `POST /api/conversations` - Create or get a conversation between two users
- `GET /api/conversations/user/:userId` - Get all conversations for a user
- `GET /api/conversations/:id/messages` - Get all messages in a conversation
- `POST /api/messages` - Send a message in a conversation

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
