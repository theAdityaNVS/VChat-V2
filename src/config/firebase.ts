import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Database } from 'firebase/database';

/**
 * Firebase configuration from environment variables
 * For Firebase JS SDK v7.20.0 and later, measurementId is optional
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/**
 * Initialize Firebase app
 */
const app = initializeApp(firebaseConfig);

/**
 * Initialize Firebase Analytics
 */
const analytics = getAnalytics(app);

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
 * Export analytics
 */
export { analytics };

/**
 * Export Firebase app for client initialization
 */
export default app;
