import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import Cookies from 'js-cookie';

export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      if (result.user) {
        // Set auth cookie
        const token = await result.user.getIdToken();
        Cookies.set('auth', token, { expires: 7 }); // Cookie expires in 7 days
        
        // Redirect to /app after successful login
        window.location.href = '/app';
        return true;
      }
      return false;
    } catch (error: unknown) {
      console.error('Error signing in with Google:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    signInWithGoogle,
    loading,
    error,
    reset: () => setError(null)
  };
}; 