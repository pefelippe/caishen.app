import { signInWithPopup, sendSignInLinkToEmail, AuthError } from 'firebase/auth';
import { auth, googleProvider, actionCodeSettings } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  UserCredential,
  User
} from 'firebase/auth'

export async function signInWithGoogleService() {
  try {
    await signInWithPopup(auth, googleProvider);
    return { success: true };
  } catch (error) {
    const authError = error as AuthError;
    return { success: false, error: authError.message || 'Google sign-in failed.' };
  }
}

export async function sendMagicLinkService(email: string) {
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
    return { success: true };
  } catch (error) {
    const authError = error as AuthError;
    if (authError.code === 'auth/operation-not-allowed') {
      return { success: false, error: 'Magic link sign-in is not enabled. Please contact support.' };
    }
    return { success: false, error: 'Failed to send magic link. Please try again.' };
  }
}

export const signIn = async (email: string, password: string): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password)
}

export const signUp = async (email: string, password: string): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth, email, password)
}

export const signOut = async (): Promise<void> => {
  return firebaseSignOut(auth)
}

export const getCurrentUser = (): User | null => {
  return auth.currentUser
}

export async function signInWithAppleService() {
  try {
    // TODO: Implement actual Apple Sign In
    // This is a placeholder that simulates a successful sign-in
    return { success: true };
  } catch (error) {
    const authError = error as AuthError;
    console.error('Apple sign in error:', authError);
    return {
      success: false,
      error: 'Failed to sign in with Apple. Please try again.'
    };
  }
} 