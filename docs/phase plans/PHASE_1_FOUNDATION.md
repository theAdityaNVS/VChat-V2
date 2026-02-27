# Phase 1: Foundation & Authentication

**Timeline**: Weeks 1-2
**Focus**: Project Setup, Architecture, and Authentication

## 1. Project Initialization

### Tasks

- [x] **Scaffold Project**: Initialize new Vite project with React and TypeScript.
  ```bash
  npm create vite@latest v-chat-v2 -- --template react-ts
  ```
- [x] **Dependencies**: Install core libraries.
  - `firebase`
  - `react-router-dom`
  - `date-fns`
  - `lucide-react` (for icons)
- [x] **Styling**: Configure Tailwind CSS.
  - Install `tailwindcss`, `postcss`, `autoprefixer`.
  - Initialize `tailwind.config.js`.
  - Define custom color palette in config to match VChat brand.
- [x] **Code Quality**: Setup ESLint, Prettier, and Husky pre-commit hooks.

### Testing Strategy

- **Unit**: Verify build script runs without errors.
- **Linting**: Ensure `npm run lint` passes on a fresh codebase.

---

## 2. Firebase Configuration

### Tasks

- [x] **Console Setup**: Create a new Firebase project.
  - Enable **Authentication** (Google, Email/Password).
  - Enable **Firestore Database**.
  - Enable **Storage**.
- [x] **SDK Integration**: Create `src/config/firebase.ts`.
  - Initialize Firebase app.
  - Export `auth`, `db`, and `storage` instances.
- [x] **Environment Variables**: Set up `.env.local` for Firebase config keys.

---

## 3. Authentication Architecture

### Tasks

- [x] **Auth Context**: Create `AuthProvider` context.
  - Track `currentUser` state.
  - Expose `login`, `signup`, `logout`, `signInWithGoogle` methods.
  - Handle Firebase `onAuthStateChanged` listener.
- [x] **Protected Routes**: Create a `RequireAuth` component to redirect unauthenticated users.

### Testing Strategy (Jest + RTL)

- **Test**: `AuthProvider` correctly updates state on mock login.
- **Test**: `RequireAuth` redirects to `/login` when user is null.

---

## 4. Authentication UI

### Tasks

- [x] **Layout**: Create a centered AuthLayout for Login/Signup screens.
- [x] **Login Page**:
  - Email/Password form with validation.
  - "Sign in with Google" button.
  - Error handling display.
- [x] **Signup Page**:
  - Name, Email, Password fields.
  - Profile picture upload (optional for now, default avatar).

### Testing Strategy

- **Test**: Form validation triggers on empty fields.
- **Test**: Clicking "Sign in" calls the auth method.
- **Test**: Error messages display correctly (e.g., "Wrong password").

---

## Phase 1 Deliverables

- ✅ Running React+TS+Vite application.
- ✅ Tailwind CSS configured.
- ✅ Firebase project connected.
- ✅ Functional Login/Signup flows.
- ✅ User session persistence.

---

## Directory Structure Preview

```
src/
  ├── config/      # firebase.ts
  ├── context/     # AuthContext.tsx
  ├── components/  # ui/Button.tsx, ui/Input.tsx
  ├── pages/       # Login.tsx, Signup.tsx
  └── hooks/       # useAuth.ts
```

---

## Conclusion

Phase 1 established the foundation for VChat V2:

✅ **Modern development environment** with Vite, React, and TypeScript  
✅ **Firebase integration** for authentication and backend services  
✅ **Professional authentication** with email/password and Google sign-in  
✅ **Code quality tools** with ESLint, Prettier, and Husky  
✅ **Reusable component architecture** ready for expansion

**Status**: Phase 1 **COMPLETE** ✓  
**Next**: [Phase 2 - Core Chat Features](./PHASE_2_CORE_FEATURES.md)
