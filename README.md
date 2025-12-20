# 💬 WhatsApp Clone - Full Featured Chat Application

A modern, feature-rich WhatsApp clone built with React, TypeScript, Firebase, and AI-powered features.

🌐 **Live Demo**: [https://whatsapp-hackthon.web.app/](https://whatsapp-hackthon.web.app/)

---

## ✨ Features

### 🔐 Authentication & User Management
- **Email/Password Authentication** - Secure signup and login with Firebase Auth
- **Google Sign-In** - One-click social authentication
- **User Onboarding** - First-time users set unique username and phone number
- **Profile Management** - Edit display name, username, phone, location, and profile photo
- **Online Status** - Real-time online/offline indicators
- **Last Seen** - Track when users were last active

### 💬 Real-Time Messaging
- **One-to-One Chat** - Private conversations between two users
- **Group Chat** - Create groups with multiple participants
- **Real-Time Updates** - Instant message delivery using Firestore listeners
- **Message Status** - Sent ✓, Delivered ✓✓, Read (blue) ✓✓ indicators
- **Typing Indicators** - See when someone is typing
- **Message Search** - Search within conversations
- **File Sharing** - Send images and text files (up to 5MB, with image compression)

### 😀 Message Actions & Reactions
- **Quick Reactions** - React with 👍 ❤️ 😂 😮 😢 🙏 emojis
- **Full Emoji Picker** - Access all emojis via the + button
- **Reply to Messages** - Quote and reply with preview bar above input
- **Forward Messages** - Forward to any chat with chat selector modal
- **Copy Messages** - Copy message text to clipboard
- **Star Messages** - Mark important messages with ⭐ indicator
- **Pin Messages** - Pin messages in conversations
- **Delete Messages** - Delete your own messages
- **Reply Privately** - In groups, start private chat with a sender

### 👥 Group Features
- **Create Groups** - Add multiple participants with group name and photo
- **Group Info Panel** - View members, admins, and group details
- **Add/Remove Members** - Manage group participants
- **Make Admin** - Promote members to admin role
- **Leave Group** - Exit from group conversations
- **Group Member Colors** - Unique colors for each sender in groups

### 🤖 AI-Powered Features

#### ✨ AI Message Rewrite
- **Tone Options**: Professional, Casual, Short, Polite, Friendly
- **Live Preview** - See rewritten message before applying
- **One-Click Apply** - Replace your text with AI suggestion
- Access via ✨ button next to message input

#### 📝 AI Conversation Summary
- **Quick Summaries** - Get AI-generated summary of long conversations
- **Key Points** - Highlights decisions, dates, and action items

#### 💬 Smart Replies
- **Context-Aware** - AI suggests 3 quick reply options based on conversation
- **One-Tap Reply** - Click to insert suggested message

#### ✈️ Group Trip Planner
- **AI Travel Planning** - Generate trip plans from group chat discussions
- **Multi-Location Support** - Plan from different participant locations
- **Detailed Itinerary** - Dates, meeting points, preparation lists

### ⏰ Scheduled Messages
- **Schedule for Later** - Set date and time for message delivery
- **Automatic Sending** - Messages sent at scheduled time
- **Manage Scheduled** - View and cancel pending messages

### 🔍 Search & Discovery
- **User Search** - Find users by name, username, or email
- **Chat Search** - Search messages within conversations
- **New Chat Modal** - Quick access to start new conversations

### 📱 User Interface
- **WhatsApp-Style Design** - Familiar, intuitive layout
- **Dark/Light Mode** - Toggle between themes (persisted)
- **Responsive Design** - Works on desktop and mobile
- **Smooth Animations** - Micro-interactions and transitions
- **Three-Panel Layout** - Sidebar, chat list, and conversation view

### 🔔 Additional Features
- **Favorites** - Star important chats for quick access
- **Unread Count** - Badge showing unread messages per chat
- **Message Timestamps** - Relative and absolute time display
- **Image Preview** - View sent images in full size
- **Error Handling** - Graceful error messages and fallbacks
- **Call Button** - Coming soon placeholder for WebRTC calls

### ⚠️ Limitations & Design Decisions

> **Firebase Free Tier Constraints**

- **Client-Side Scheduling** - Scheduled messages send when app is open (no Cloud Functions)
- **File Types** - Images and .txt files only (to minimize storage costs)
- **Phone Login** - Limited by Firebase SMS quota; email is primary auth
- **AI Usage** - All AI features are manual-only to control Gemini API quota
- **No Calling** - WebRTC calling planned for post-hackathon (complexity)

> These limitations are documented transparently in the UI.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | Frontend framework |
| **TypeScript** | Type-safe development |
| **Vite** | Fast build tool |
| **Tailwind CSS** | Utility-first styling |
| **Firebase Auth** | User authentication |
| **Firebase Firestore** | Real-time database |
| **Firebase Storage** | File uploads |
| **Firebase Hosting** | Deployment |
| **Cloudflare Workers** | AI API proxy |
| **Google Gemini API** | AI features |
| **emoji-picker-react** | Emoji selection |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project with Auth, Firestore, Storage enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/naseem-2917/WhatsApp/
cd whatsapp

# Install dependencies
npm install

# Create .env file with your Firebase config
cp .env.example .env

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Environment Variables

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_WORKER_URL=your_cloudflare_worker_url
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── chat/           # Chat-specific components
│   │   ├── AIRewriteModal.tsx
│   │   ├── AISuggestionBar.tsx
│   │   ├── ConversationSummaryModal.tsx
│   │   ├── ForwardModal.tsx
│   │   ├── GroupInfoPanel.tsx
│   │   ├── MessageActionMenu.tsx
│   │   ├── NewChatModal.tsx
│   │   ├── ScheduleMessageModal.tsx
│   │   ├── SmartRepliesPanel.tsx
│   │   ├── TripPlannerModal.tsx
│   │   └── UserProfilePanel.tsx
│   ├── common/         # Shared UI components
│   └── layout/         # Header, Sidebar, etc.
├── config/             # Firebase configuration
├── context/            # React context (Auth, App)
├── pages/              # Main page components
│   ├── ChatPage.tsx
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── ProfilePage.tsx
│   └── SignupPage.tsx
├── services/           # API and database services
│   ├── aiService.ts
│   ├── chatService.ts
│   ├── fileService.ts
│   ├── scheduledMessageService.ts
│   └── userService.ts
├── types/              # TypeScript interfaces
├── App.tsx             # Main app with routing
├── main.tsx            # Entry point
└── index.css           # Global styles
```

---

## 📸 Screenshots

> Visit the [live demo](https://whatsapp-hackthon.web.app/) to see the app in action!

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Developer

Built with ❤️ for learning and demonstration purposes.

**Live Demo**: [https://whatsapp-hackthon.web.app/](https://whatsapp-hackthon.web.app/)