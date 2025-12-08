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
2. Fill out the onboarding form with your information:
   - Name and email (required)
   - Institution
   - Research areas (comma-separated, e.g., "Machine Learning, Computer Vision")
   - Research interests (comma-separated, e.g., "Deep Learning, Healthcare")
   - Bio
3. After onboarding, you'll see your profile and recommendations
4. Use the search bar to find specific researchers
5. Click "Contact" on any researcher card to send them an email

## API Endpoints

- `POST /api/researchers` - Create a new researcher profile
- `GET /api/researchers` - Get all researchers
- `GET /api/researchers/:id` - Get a specific researcher
- `GET /api/researchers/search/:query` - Search researchers
- `GET /api/researchers/:id/recommendations` - Get personalized recommendations

## How Recommendations Work

The recommendation algorithm calculates similarity scores based on:
- Matching research interests (weight: 2)
- Matching research areas (weight: 3)

Researchers with higher similarity scores appear first in your recommendations.

## Future Enhancements

- User authentication and authorization
- Advanced filtering options
- Messaging system
- Conference event integration
- Profile photos and attachments
- Export connections to contact list
- Real-time chat functionality

## License

MIT
