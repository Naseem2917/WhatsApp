# WhatsApp Platform

A modern WhatsApp-like social and communication platform with AI-powered features.

## Tech Stack

- **Frontend**: React (Vite) + TypeScript + Tailwind CSS
- **Backend**: Cloudflare Workers
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **AI**: Google Gemini API
- **Hosting**: Firebase Hosting

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/whatsapp.git
cd whatsapp
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features

### Authentication
- Email/password login and signup
- First-time user onboarding (username + phone)
- Unique identifier validation

### Messaging (Coming Soon)
- One-to-one chat
- Group chat
- Real-time messaging
- Message status (sent, delivered, read)
- Typing indicators
- Online/last seen status

### AI Features (Coming Soon)
- Conversation summary
- Scheduled messages
- Missed importance detector
- Group trip planner

## Project Structure

```
src/
├── components/     # Reusable UI components
├── config/         # Firebase and app configuration
├── context/        # React context providers
├── pages/          # Page components
├── services/       # API and database services
├── types/          # TypeScript type definitions
├── App.tsx         # Main app component
├── main.tsx        # Entry point
└── index.css       # Global styles
```

## License

MIT