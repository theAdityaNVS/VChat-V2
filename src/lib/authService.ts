import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User } from '../types/firebase';

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  // Create user in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = userCredential;

  // Update profile with display name
  await updateProfile(user, { displayName });

  // Create user document in Firestore
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: displayName,
    photoURL: user.photoURL || '',
    status: 'online',
    bio: '',
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
  } as User);

  return user;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<FirebaseUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const { user } = userCredential;

  // Check if user document exists, if not create it
  const userDocRef = doc(db, 'users', user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Anonymous',
      photoURL: user.photoURL || '',
      status: 'online',
      bio: '',
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    } as User);
  }

  return user;
}

/**
 * Sign out current user
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Update user profile
 */
export async function updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, updates, { merge: true });
}

/**
 * Get user document from Firestore
 */
export async function getUserDocument(uid: string): Promise<User | null> {
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);

  if (userDocSnap.exists()) {
    return userDocSnap.data() as User;
  }

  return null;
}
