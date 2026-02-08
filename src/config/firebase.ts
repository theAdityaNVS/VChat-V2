import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Database } from 'firebase/database';
import type { FirebaseConfig } from '../types/firebase';

/**
 * Get Firebase configuration from environment variables
 * Ensures all required variables are present
 */
function getFirebaseConfig(): FirebaseConfig {
  const config: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  // Validate all required configuration fields are present
  const requiredFields: (keyof FirebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingFields = requiredFields.filter((field) => !config[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing Firebase configuration: ${missingFields.join(', ')}. ` +
        `Please check your .env.local file against .env.example.`
    );
  }

  return config;
}

/**
 * Initialize Firebase app
 */
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);

/**
 * Initialize Firebase App Check with reCAPTCHA v3
 * This protects your Firebase resources from abuse
 */
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

if (recaptchaSiteKey) {
  // Initialize App Check
  // In development, you can use a debug token
  // For production, always use ReCaptchaV3Provider
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      // Set to true to allow App Check to use debug tokens in development
      isTokenAutoRefreshEnabled: true,
    });
    console.log('Firebase App Check initialized with reCAPTCHA v3');
  } catch (error) {
    console.error('Failed to initialize App Check:', error);
  }
} else {
  console.warn('reCAPTCHA site key not found. App Check not initialized.');
}

/**
 * Firebase Services
 */
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const rtdb: Database = getDatabase(app);

/**
 * Export Firebase app for client initialization
 */
export default app;
