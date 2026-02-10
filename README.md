# VChat V2

<div align="center">

**A modern, scalable real-time communication platform built with React, TypeScript, and Firebase**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646cff.svg)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12.9-ffca28.svg)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## Overview

VChat V2 is a complete rewrite of the legacy VChat application, designed to provide professional-grade real-time messaging, voice/video calling, and collaboration features. Built with modern web technologies, it emphasizes type safety, performance, and exceptional user experience.

### Key Features

- **Real-time Messaging** - Instant message delivery with Firestore real-time listeners
- **Rich Text Features** - Emoji reactions, message threading, editing, and file attachments
- **Video & Audio Calls** - High-quality peer-to-peer communication with screen sharing
- **Smart Presence** - Automatic online/offline status tracking
- **Typing Indicators** - Live feedback when users are composing messages
- **Multi-Provider Auth** - Email/Password, Google, and GitHub sign-in
- **Mobile-First** - Responsive design optimized for all screen sizes
- **Type Safe** - Full TypeScript coverage for robust development
- **PWA Ready** - Offline support and installable experience

---

## Tech Stack

### Frontend

- **Framework**: React 19.2 with TypeScript 5.9
- **Build Tool**: Vite 7.3 (Lightning-fast HMR)
- **Styling**: Tailwind CSS v4.1 (CSS-based theming)
- **Routing**: React Router DOM v7
- **Icons**: Lucide React
- **Date Utilities**: date-fns

### Backend & Services

- **Authentication**: Firebase Auth
- **Database**:
  - Firestore (persistent data: users, rooms, messages)
  - Realtime Database (ephemeral data: presence, typing indicators)
- **Storage**: Firebase Storage (images, file attachments)
- **Hosting**: Vercel (CI/CD pipeline)

### Real-time Communication

- **Chat Sync**: Firestore `onSnapshot` listeners
- **Video/Audio**: WebRTC (Native peer-to-peer implementation)
- **Signaling**: Firebase Firestore for SDP/ICE exchange
- **Screen Sharing**: Native `getDisplayMedia` API

### Code Quality

- **Linting**: ESLint 9 with TypeScript support
- **Formatting**: Prettier
- **Pre-commit Hooks**: Husky + lint-staged
- **Testing**: Jest + React Testing Library _(coming soon)_

---

## Project Structure

```
VChat-V2/
├── docs/                    # Documentation
│   ├── SPEC.md             # Technical specification
│   ├── V2_ROADMAP.md       # Development roadmap
│   └── phase plans/        # Phase-by-phase implementation guides
├── src/
│   ├── config/             # Firebase and app configuration
│   ├── context/            # React Context providers (Auth, Theme)
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Base components (Button, Input, Modal)
│   │   └── features/      # Feature-specific components
│   ├── pages/              # Route pages (Login, Chat, Profile)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and helpers
│   ├── types/              # TypeScript type definitions
│   └── styles/             # Global styles and Tailwind config
├── public/                 # Static assets
└── .husky/                 # Git hooks
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **Firebase Account** (for backend services)
- **Git** for version control

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/VChat-V2.git
   cd VChat-V2
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Email/Password, Google)
   - Enable Firestore Database
   - Enable Firebase Storage
   - Copy your Firebase config and create `.env.local`:

   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start development server with HMR  |
| `npm run build`   | Build optimized production bundle  |
| `npm run preview` | Preview production build locally   |
| `npm run lint`    | Run ESLint for code quality checks |
| `npm run format`  | Format code with Prettier          |

---

## Development Roadmap

VChat V2 was built in **4 phases**:

### ✅ Phase 1: Foundation & Authentication (Complete)

- [x] Project scaffolding with Vite + React + TypeScript
- [x] Tailwind CSS v4 configuration
- [x] Firebase SDK integration
- [x] Authentication UI (Login/Signup)
- [x] Auth Context with session persistence
- [x] Protected routes with RequireAuth

### ✅ Phase 2: Core Features (Complete)

- [x] Room management (create, list, join)
- [x] Real-time messaging with Firestore
- [x] User profiles and presence tracking
- [x] Message input with file upload
- [x] Room settings and member management
- [x] Direct messaging

### ✅ Phase 3: Enhanced Messaging (Complete)

- [x] Emoji reactions
- [x] Message threading (replies)
- [x] Edit/delete messages
- [x] Typing indicators
- [x] Image and file uploads
- [x] Message preview for replies

### ✅ Phase 4: Video Integration (Complete)

- [x] WebRTC video calling
- [x] 1-on-1 video calls
- [x] Screen sharing
- [x] Call notifications and UI
- [x] Audio/video controls
- [x] Firebase signaling for WebRTC

For detailed implementation notes, see [docs/DEVELOPMENT_JOURNAL.md](docs/DEVELOPMENT_JOURNAL.md).

---

## Data Architecture

### User Model

```typescript
interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  status: 'online' | 'away' | 'offline';
  bio?: string;
  createdAt: Timestamp;
  lastSeen: Timestamp;
}
```

### Room Model

```typescript
interface Room {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'voice' | 'video';
  createdBy: string;
  members: string[];
  isPrivate: boolean;
  createdAt: Timestamp;
}
```

### Message Model

```typescript
interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  reactions: Record<string, string[]>;
  edited: boolean;
  editedAt?: Timestamp;
  replyTo?: string;
  fileUrl?: string;
  createdAt: Timestamp;
}
```

See [docs/SPEC.md](docs/SPEC.md) for complete data models.

---

## Performance Targets

- **Build Time**: < 3s (Dev), < 30s (Prod)
- **Bundle Size**: < 200KB (gzipped)
- **Lighthouse Score**: > 95 (Performance, Accessibility, Best Practices)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository
2. Create a **feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes with conventional commits (`feat:`, `fix:`, `docs:`)
4. **Push** to your branch (`git push origin feature/amazing-feature`)
5. Open a **Pull Request**

### Commit Convention

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code formatting (no logic changes)
- `refactor:` - Code restructuring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

---

## Security

### Firestore Security Rules

- Row-level security ensures users can only access permitted data
- Private rooms are restricted to members only
- Users can only edit/delete their own content

### Storage Rules

- Authenticated uploads only
- Max file size: 10MB
- Allowed file types: images (jpg, png, gif, webp), documents (pdf)

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with [React](https://react.dev/)
- Powered by [Firebase](https://firebase.google.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide](https://lucide.dev/)

---

<div align="center">

**Made with ❤️ by the VChat Team**

[Report Bug](https://github.com/yourusername/VChat-V2/issues) · [Request Feature](https://github.com/yourusername/VChat-V2/issues)

</div>
