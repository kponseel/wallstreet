import { create } from 'zustand';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  error: null,

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Create user object from Firebase Auth data immediately
        const defaultUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          stats: {
            matchesPlayed: 0,
            matchesWon: 0,
            totalReturns: 0,
            bestReturn: 0,
            averageRank: 0,
          },
        };

        // Set user immediately to avoid stuck loading state
        set({ firebaseUser, user: defaultUser, loading: false });

        // Try to fetch additional user data from Firestore (optional enhancement)
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            set({
              user: {
                ...defaultUser,
                displayName: userData.displayName || defaultUser.displayName,
                photoURL: userData.photoURL || defaultUser.photoURL,
                stats: userData.stats || defaultUser.stats,
              },
            });
          }
        } catch {
          // Firestore read failed - continue with Firebase Auth data
          console.warn('Could not fetch user profile from Firestore, using auth data');
        }
      } else {
        set({ firebaseUser: null, user: null, loading: false });
      }
    });

    return unsubscribe;
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, _displayName: string) => {
    set({ loading: true, error: null });
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      // Send verification email
      await sendEmailVerification(credential.user);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Google sign in failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      await firebaseSignOut(auth);
      set({ user: null, firebaseUser: null, loading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sign out failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  sendVerificationEmail: async () => {
    const { firebaseUser } = get();
    if (!firebaseUser) {
      throw new Error('No user logged in');
    }
    await sendEmailVerification(firebaseUser);
  },

  resetPassword: async (email: string) => {
    set({ loading: true, error: null });
    try {
      await sendPasswordResetEmail(auth, email);
      set({ loading: false });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Password reset failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
