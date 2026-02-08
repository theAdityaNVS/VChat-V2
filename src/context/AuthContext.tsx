/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import {
  signUp,
  signIn,
  signInWithGoogle,
  logout,
  updateUserProfile,
  getUserDocument,
} from '../lib/authService';
import { usePresence } from '../lib/presenceService';
import type { User } from '../types/firebase';

/**
 * Auth Context Type
 */
export interface AuthContextType {
  currentUser: FirebaseUser | null;
  userDoc: User | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

/**
 * Create Auth Context
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Props
 */
export interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Auth Provider Component
 * Handles authentication state and provides auth methods to child components
 */
export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manage user presence
  usePresence(currentUser?.uid);

  /**
   * Fetch user document from Firestore
   */
  const fetchUserDocument = useCallback(async (uid: string) => {
    try {
      const userData = await getUserDocument(uid);
      setUserDoc(userData);
    } catch (err) {
      console.error('Failed to fetch user document:', err);
      setUserDoc(null);
    }
  }, []);

  /**
   * Listen to auth state changes
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        await fetchUserDocument(user.uid);
      } else {
        setUserDoc(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserDocument]);

  /**
   * Sign up with email and password
   */
  const handleSignUp = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      await signUp(email, password, displayName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Sign in with email and password
   */
  const handleSignIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      await signIn(email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Sign in with Google
   */
  const handleSignInWithGoogle = useCallback(async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google sign in failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Sign out
   */
  const handleLogout = useCallback(async () => {
    try {
      setError(null);
      await logout();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  /**
   * Update user profile
   */
  const handleUpdateUserProfile = useCallback(
    async (updates: Partial<User>) => {
      if (!currentUser) return;

      try {
        setError(null);
        await updateUserProfile(currentUser.uid, updates);
        await fetchUserDocument(currentUser.uid);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Profile update failed';
        setError(errorMessage);
        throw err;
      }
    },
    [currentUser, fetchUserDocument]
  );

  const value: AuthContextType = {
    currentUser,
    userDoc,
    loading,
    error,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithGoogle: handleSignInWithGoogle,
    logout: handleLogout,
    updateUserProfile: handleUpdateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
