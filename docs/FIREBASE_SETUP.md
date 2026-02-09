# Firebase Setup Guide for VChat V2

This guide provides step-by-step instructions for setting up Firebase for the VChat V2 application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Firebase Project Setup](#firebase-project-setup)
- [Firebase Services Configuration](#firebase-services-configuration)
- [Environment Variables](#environment-variables)
- [Security Rules](#security-rules)
- [Firebase App Check (Optional)](#firebase-app-check-optional)
- [Data Structure](#data-structure)

## Prerequisites

- A Google account
- Node.js and npm installed
- VChat V2 project cloned locally

## Firebase Project Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** or **Create a project**
3. Enter your project name (e.g., "vchat-v2")
4. (Optional) Enable Google Analytics if desired
5. Click **Create project**
6. Wait for the project to be created and click **Continue**

### 2. Register Your Web App

1. In the Firebase Console, click the **Web** icon (`</>`) to add a web app
2. Enter an app nickname (e.g., "VChat V2 Web")
3. **Do NOT** check "Also set up Firebase Hosting" (unless you plan to use it)
4. Click **Register app**
5. Copy the Firebase configuration object - you'll need these values for your environment variables
6. Click **Continue to console**

## Firebase Services Configuration

VChat V2 uses the following Firebase services:

### 1. Authentication

1. In the Firebase Console, go to **Build** → **Authentication**
2. Click **Get started**
3. Enable the following sign-in methods:
   - **Email/Password**: Enable this provider
   - **Google**: Enable this provider and configure OAuth consent screen
4. Click **Save**

#### Configure Authorized Domains

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your application domains:
   - `localhost` (for development)
   - Your production domain (when deployed)

### 2. Firestore Database

1. In the Firebase Console, go to **Build** → **Firestore Database**
2. Click **Create database**
3. Select your database location (choose one closest to your users)
4. Start in **Test mode** (we'll add security rules later)
5. Click **Create**

#### Collections Structure

VChat V2 uses the following Firestore collections:

- `users` - User profiles and metadata
- `rooms` - Chat room information
- `rooms/{roomId}/messages` - Messages within each room

### 3. Realtime Database

1. In the Firebase Console, go to **Build** → **Realtime Database**
2. Click **Create Database**
3. Select your database location
4. Start in **Test mode** (we'll add security rules later)
5. Click **Enable**

#### Data Structure

The Realtime Database is used for:

- `status/{userId}` - User online/offline presence
- `typing/{roomId}/{userId}` - Typing indicators

### 4. Storage

1. In the Firebase Console, go to **Build** → **Storage**
2. Click **Get started**
3. Start in **Test mode** (we'll add security rules later)
4. Select a location for your storage bucket
5. Click **Done**

#### Storage Structure

Files are organized as:

```
rooms/
  {roomId}/
    files/
      {timestamp}_{filename}
    images/
      {timestamp}_{filename}
avatars/
  {userId}.{ext}
```

## Environment Variables

### 1. Create Environment File

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

### 2. Configure Firebase Credentials

From your Firebase Console:

1. Go to **Project settings** (gear icon) → **General**
2. Scroll down to **Your apps** section
3. Find your web app and look for the **Config** object

Update `.env.local` with your Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional: For reCAPTCHA v3 / App Check
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
```

### 3. Verify Configuration

The application includes validation in `src/config/firebase.ts` that will check for missing environment variables on startup.

## Security Rules

### Firestore Security Rules

Replace the default rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && isOwner(userId);
      allow update: if isSignedIn() && isOwner(userId);
      allow delete: if isSignedIn() && isOwner(userId);
    }

    // Rooms collection
    match /rooms/{roomId} {
      // Allow read if user is a member OR if room is public
      allow read: if isSignedIn() &&
                     (request.auth.uid in resource.data.members ||
                      resource.data.type == 'public');
      allow create: if isSignedIn();
      allow update: if isSignedIn() &&
                      request.auth.uid in resource.data.members;
      allow delete: if isSignedIn() &&
                      resource.data.createdBy == request.auth.uid;

      // Messages subcollection
      match /messages/{messageId} {
        // Allow read if user is member OR room is public
        allow read: if isSignedIn() &&
                      (request.auth.uid in get(/databases/$(database)/documents/rooms/$(roomId)).data.members ||
                       get(/databases/$(database)/documents/rooms/$(roomId)).data.type == 'public');
        // Allow create if user is member OR room is public (anyone can send to public rooms)
        allow create: if isSignedIn() &&
                        (request.auth.uid in get(/databases/$(database)/documents/rooms/$(roomId)).data.members ||
                         get(/databases/$(database)/documents/rooms/$(roomId)).data.type == 'public');
        allow update: if isSignedIn() &&
                        resource.data.senderId == request.auth.uid;
        allow delete: if isSignedIn() &&
                        (resource.data.senderId == request.auth.uid ||
                         get(/databases/$(database)/documents/rooms/$(roomId)).data.createdBy == request.auth.uid);
      }
    }
  }
}
```

To apply these rules:

1. Go to **Firestore Database** → **Rules**
2. Replace the existing rules with the above
3. Click **Publish**

### Realtime Database Security Rules

```json
{
  "rules": {
    "status": {
      "$userId": {
        ".read": true,
        ".write": "$userId === auth.uid"
      }
    },
    "rooms": {
      "$roomId": {
        "typing": {
          "$userId": {
            ".read": true,
            ".write": "$userId === auth.uid"
          }
        }
      }
    }
  }
}
```

To apply these rules:

1. Go to **Realtime Database** → **Rules**
2. Replace the existing rules with the above
3. Click **Publish**

### Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isValidImage() {
      return request.resource.contentType.matches('image/.*');
    }

    function isValidFile() {
      return request.resource.size < 10 * 1024 * 1024; // 10MB limit
    }

    // Room files and images
    match /rooms/{roomId}/{fileType}/{fileName} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && isValidFile();
    }

    // User avatars
    match /avatars/{fileName} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() &&
                     isValidImage() &&
                     request.resource.size < 2 * 1024 * 1024; // 2MB limit
    }
  }
}
```

To apply these rules:

1. Go to **Storage** → **Rules**
2. Replace the existing rules with the above
3. Click **Publish**

## Firebase App Check (Optional)

Firebase App Check helps protect your Firebase resources from abuse. VChat V2 is configured to use reCAPTCHA v3.

### 1. Enable App Check

1. In the Firebase Console, go to **Build** → **App Check**
2. Click **Get started**
3. Select your web app
4. Select **reCAPTCHA v3** as the provider
5. Register for a reCAPTCHA v3 site key at [Google reCAPTCHA](https://www.google.com/recaptcha/admin)
6. Add your reCAPTCHA site key to the App Check configuration
7. Click **Save**

### 2. Configure reCAPTCHA

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click **Create** (+) button
3. Fill in the form:
   - **Label**: VChat V2
   - **reCAPTCHA type**: reCAPTCHA v3
   - **Domains**: Add `localhost` and your production domain
4. Accept terms and click **Submit**
5. Copy the **Site Key**
6. Add it to your `.env.local`:
   ```env
   VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
   ```

### 3. Enable App Check for Services

1. In App Check settings, go to **APIs**
2. Enable App Check enforcement for:
   - Firestore
   - Realtime Database
   - Storage

⚠️ **Note**: Start with App Check in monitoring mode before enforcing to ensure your app works correctly.

## Data Structure

### Firestore Collections

#### users Collection

```typescript
{
  uid: string; // User ID (matches Auth UID)
  email: string; // User email
  displayName: string; // Display name
  photoURL: string; // Profile photo URL
  status: 'online' | 'away' | 'offline';
  bio: string; // User bio
  createdAt: Timestamp; // Account creation time
  lastSeen: Timestamp; // Last activity time
}
```

#### rooms Collection

```typescript
{
  name: string;             // Room name
  description: string;      // Room description
  type: 'text' | 'voice' | 'video';
  members: string[];        // Array of user IDs
  createdBy: string;        // Creator user ID
  createdAt: Timestamp;     // Room creation time
  lastMessage: string;      // Last message preview
  lastMessageAt: Timestamp; // Last message time
}
```

#### messages Subcollection (rooms/{roomId}/messages)

```typescript
{
  roomId: string;           // Parent room ID
  senderId: string;         // Sender user ID
  senderName: string;       // Sender display name
  senderAvatar: string;     // Sender avatar URL
  content: string;          // Message content
  type: 'text' | 'image' | 'file' | 'system';
  createdAt: Timestamp;     // Message creation time
  replyTo: string | null;   // ID of message being replied to
  isEdited: boolean;        // Whether message was edited
  isDeleted: boolean;       // Whether message was deleted
  reactions: {              // Emoji reactions
    [emoji: string]: string[] // Array of user IDs who reacted
  };
  readBy: string[];         // Array of user IDs who read the message
}
```

### Realtime Database Structure

#### User Status

```typescript
status/{userId}: {
  state: 'online' | 'offline';
  lastChanged: ServerValue.TIMESTAMP;
}
```

#### Typing Indicators

```typescript
typing/{roomId}/{userId}: {
  isTyping: boolean;
  lastTyped: ServerValue.TIMESTAMP;
}
```

## Troubleshooting

### Common Issues

#### Missing Environment Variables

**Error**: `Missing Firebase configuration: apiKey, authDomain...`

**Solution**: Ensure all required environment variables are set in `.env.local`

#### Permission Denied Errors

**Error**: `FirebaseError: Missing or insufficient permissions`

**Solution**:

1. Check that security rules are properly configured
2. Verify user is authenticated
3. Ensure user has access to the requested resource

#### App Check Token Errors

**Error**: `Firebase: Error (app-check/...)`

**Solution**:

1. Verify reCAPTCHA site key is correct
2. Check that domain is registered in reCAPTCHA admin
3. Try disabling App Check enforcement temporarily for debugging

## Next Steps

After completing this setup:

1. ✅ Run the development server: `npm run dev`
2. ✅ Test user registration and login
3. ✅ Create a test room
4. ✅ Send test messages
5. ✅ Test file uploads
6. ✅ Monitor Firebase Console for activity
7. ✅ Review security rules in production mode

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Database](https://firebase.google.com/docs/firestore)
- [Realtime Database](https://firebase.google.com/docs/database)
- [Firebase Storage](https://firebase.google.com/docs/storage)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)

## Support

For issues specific to VChat V2:

- Check the [Development Journal](./DEVELOPMENT_JOURNAL.md)
- Review the [Project Roadmap](./V2_ROADMAP.md)
- Report issues on the project repository
