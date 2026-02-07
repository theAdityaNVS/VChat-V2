# VChat V2 - Vision & Roadmap

## Vision Statement

VChat V2 will be a modern, scalable real-time communication platform built with React, TypeScript, and Firebase. It will maintain the simplicity of V1 while adding professivonal-grade authentication, video calling capabilities, and an extensible architecture for future features.

---

## Core Objectives

### 1. Enhanced User Experience
- **Professional Authentication**: Replace localStorage with Firebase Auth (Google, GitHub, Email)
- **User Profiles**: Avatars, status indicators, bio
- **Rich Messaging**: Emojis, reactions, message editing, threading
- **Real-time Typing Indicators**: Show when users are typing
- **Read Receipts**: Message delivery and read status

### 2. Video Communication
- **1-on-1 Video Calls**: WebRTC-based video chat
- **Screen Sharing**: Share your screen in video calls
- **Voice Channels**: Audio-only rooms for lightweight communication
- **Call History**: Track and rejoin previous calls

### 3. Modern Technical Stack
- **Type Safety**: Full TypeScript coverage
- **Component Architecture**: Reusable, testable React components
- **State Management**: Context API + custom hooks
- **Real-time Sync**: Optimistic updates with Firestore
- **Responsive Design**: Mobile-first with Tailwind CSS

### 4. Developer Experience
- **Fast Development**: Vite HMR (Hot Module Replacement)
- **Testing Suite**: Jest + React Testing Library
- **CI/CD Pipeline**: Automated testing and deployment
- **Documentation**: Storybook component library
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks

---

## Feature Comparison

| Feature | V1 (Current) | V2 (Planned) |
|---------|-------------|--------------|
| **Authentication** | localStorage username | Firebase Auth (Multi-provider) |
| **User Identity** | Anonymous/Name only | Full profiles with avatars |
| **Messaging** | Text only | Text, emojis, reactions, editing |
| **Channels** | 4 fixed rooms | Unlimited, user-created rooms |
| **Video Chat** | ❌ None | ✅ 1-on-1 + Screen share |
| **Voice Chat** | ❌ None | ✅ Audio channels |
| **Real-time Features** | Messages only | Messages, typing, presence |
| **Security** | Basic Firestore rules | Row-level security + Auth |
| **UI Framework** | Vanilla JS + Bootstrap | React + Tailwind CSS |
| **Language** | JavaScript | TypeScript |
| **Build System** | None (static) | Vite |
| **Testing** | Manual only | Automated (Jest, RTL) |
| **Deployment** | Vercel (manual) | Vercel (CI/CD) |
| **Mobile Support** | Basic responsive | PWA with offline support |

---

## Technical Architecture V2

### Frontend Stack
```
┌─────────────────────────────────────┐
│         React 18 + TypeScript        │
├─────────────────────────────────────┤
│  UI Layer: Tailwind CSS Components  │
├─────────────────────────────────────┤
│   State: Context API + Hooks        │
├─────────────────────────────────────┤
│  Real-time: Firebase SDK v9+        │
├─────────────────────────────────────┤
│   Video: WebRTC (PeerJS/LiveKit)    │
└─────────────────────────────────────┘
```

### Component Hierarchy
```
App
├── AuthProvider (Context)
├── ThemeProvider (Context)
└── Layout
    ├── Sidebar
    │   ├── UserProfile
    │   ├── RoomList
    │   └── CreateRoomButton
    ├── ChatWindow
    │   ├── ChatHeader
    │   ├── MessageList
    │   │   └── Message (with reactions)
    │   ├── TypingIndicator
    │   └── MessageInput (with emoji picker)
    └── VideoPanel (conditional)
        ├── VideoGrid
        ├── CallControls
        └── ScreenShare
```

### Data Models (TypeScript)

```typescript
// User Model
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

// Message Model
interface Message {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  reactions: Record<string, string[]>; // emoji -> userIds[]
  edited: boolean;
  editedAt?: Timestamp;
  replyTo?: string; // messageId for threading
  createdAt: Timestamp;
}

// Room Model
interface Room {
  id: string;
  name: string;
  description: string;
  type: 'text' | 'voice' | 'video';
  createdBy: string;
  members: string[]; // userIds
  isPrivate: boolean;
  createdAt: Timestamp;
}

// Call Model
interface Call {
  id: string;
  roomId: string;
  participants: string[];
  type: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended';
  startedAt: Timestamp;
  endedAt?: Timestamp;
}
```

---

## Migration Strategy

### Phase 1: Foundation (Weeks 1-2)
- ✅ Set up Vite + React + TypeScript project
- ✅ Configure Tailwind CSS
- ✅ Set up ESLint, Prettier, Git hooks
- ✅ Create base component structure
- ✅ Implement Firebase Auth (Email + Google)
- ✅ Build authentication UI (Login/Signup)

### Phase 2: Core Features (Weeks 3-4)
- ✅ Port chat functionality to React hooks
- ✅ Implement real-time message syncing
- ✅ Build MessageList component with virtualization
- ✅ Create MessageInput with emoji picker
- ✅ Implement room switching
- ✅ Add user presence (online/offline)
- ✅ Build user profile management

### Phase 3: Enhanced Messaging (Weeks 5-6)
- ✅ Add message reactions
- ✅ Implement message editing/deletion
- ✅ Build typing indicators
- ✅ Add message threading (replies)
- ✅ Support file/image uploads
- ✅ Implement search functionality

### Phase 4: Video Integration (Weeks 7-8)
- ✅ Integrate WebRTC (via LiveKit/PeerJS)
- ✅ Build video call UI
- ✅ Implement 1-on-1 video calls
- ✅ Add screen sharing
- ✅ Create call controls (mute, camera, end)
- ✅ Build call history feature

### Phase 5: Polish & Deploy (Week 9-10)
- ✅ Write comprehensive tests
- ✅ Performance optimization
- ✅ Accessibility audit (WCAG 2.1)
- ✅ PWA implementation (offline support)
- ✅ Set up CI/CD pipeline
- ✅ Production deployment to Vercel
- ✅ Documentation & launch

---

## Technology Decisions

### Why React over Vue/Svelte?
- **Ecosystem**: Largest community, more libraries for WebRTC/chat
- **Talent Pool**: Easier to find contributors/maintainers
- **Firebase Integration**: Official React Firebase hooks library
- **Career Skills**: Most demanded framework in 2026

### Why Tailwind over styled-components?
- **Performance**: No runtime CSS-in-JS overhead
- **DX**: Faster prototyping with utility classes
- **Bundle Size**: Easier to purge unused CSS
- **Consistency**: Design system through config

### Why Vite over Create React App?
- **Speed**: 10-100x faster HMR and cold starts
- **Modern**: Built for ESM, optimized for production
- **Flexibility**: Better plugin ecosystem
- **Future-proof**: CRA is deprecated in 2026

### Video Call Technology Options

| Option | Pros | Cons | Choice |
|--------|------|------|--------|
| **Native WebRTC** | Full control, no cost | Complex signaling | 🟡 Learning |
| **LiveKit** | Scalable, SFU architecture | Paid tier for scale | 🟢 Recommended |
| **Firebase WebRTC** | Good docs, simple | P2P only (no SFU) | 🟡 Alternative |
| **Agora** | Enterprise-grade | Expensive | 🔴 Overkill |

**Decision**: Start with **LiveKit** for production-ready SFU, keep native WebRTC for learning/fallback.

---

## Success Metrics

### Technical KPIs
- **Build Time**: < 3 seconds (dev), < 30 seconds (prod)
- **Bundle Size**: < 200KB (gzipped)
- **Test Coverage**: > 80%
- **Lighthouse Score**: > 95
- **Type Coverage**: 100% (strict mode)

### User Experience KPIs
- **Message Latency**: < 500ms (Firebase real-time)
- **Video Call Setup**: < 3 seconds
- **Mobile Performance**: 60fps scrolling
- **Accessibility**: WCAG 2.1 AA compliant

### Business KPIs
- **Active Users**: Track DAU/MAU
- **Session Duration**: Average time in app
- **Video Call Usage**: % of users using video
- **Retention**: 7-day and 30-day retention rates

---

## Open Questions & Decisions Needed

### Database Structure
- **Q**: Should we use subcollections for messages or a flat structure?
- **A**: Flat with room index for better query performance at scale

### User Presence
- **Q**: How to handle presence efficiently with many users?
- **A**: Use Firebase Realtime Database for presence (lower latency than Firestore)

### File Storage
- **Q**: Where to store images/files?
- **A**: Firebase Storage with CDN, max 10MB per file

### Monetization (Future)
- **Q**: Free vs paid model?
- **A**: V2 Launch = Free; Post-launch = Freemium (premium rooms, unlimited history)

---

## V2 vs V3 Future

**V2 Scope (This Roadmap)**:
- 1-on-1 video calls
- User authentication
- Enhanced messaging
- Modern tech stack

**V3 Vision (2027)**:
- AI moderation
- Group video calls (4+ participants)
- End-to-end encryption
- Mobile apps (React Native)
- API for third-party integrations
- Custom bots/integrations

---

## Getting Started with V2 Development

See [UPGRADE_STACK.md](UPGRADE_STACK.md) for detailed migration steps and code examples.

**Quick Start**:
```bash
# Create V2 branch
git checkout -b v2-development

# Initialize new Vite project in /v2 folder
npm create vite@latest v2 -- --template react-ts
cd v2
npm install

# Install dependencies
npm install firebase react-router-dom date-fns
npm install -D tailwindcss autoprefixer postcss

# Start development
npm run dev
```

---

## Contributing to V2

Interested in contributing? See our contribution guidelines and pick an issue tagged `v2-development` in the GitHub issues.

**Priority Areas**:
1. TypeScript type definitions
2. React component development
3. WebRTC integration
4. Testing infrastructure
5. Documentation

---

*Last Updated: February 7, 2026*
