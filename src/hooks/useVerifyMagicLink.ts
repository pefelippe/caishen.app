import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useVerifyMagicLink() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      try {
        console.log('Checking magic link...');
        console.log('Current URL:', window.location.href);
        
        const isMagicLink = isSignInWithEmailLink(auth, window.location.href);
        console.log('Is magic link:', isMagicLink);
        
        if (isMagicLink) {
          const email = window.localStorage.getItem('emailForSignIn');
          console.log('Email from localStorage:', email);
          
          if (!email) {
            setError('Email not found. Please try signing in again.');
            setLoading(false);
            return;
          }

          console.log('Signing in with magic link...');
          const result = await signInWithEmailLink(auth, email, window.location.href);
          console.log('Sign in result:', result);
          
          if (result.user) {
            console.log('User signed in successfully:', result.user.email);
            window.localStorage.removeItem('emailForSignIn');
            router.push('/app');
          }
        } else {
          console.log('Not a magic link, redirecting to login');
          router.push('/login');
        }
      } catch (error: unknown) {
        console.error('Error verifying magic link:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to verify magic link.';
        setError(errorMessage);
        setLoading(false);
      }
    };

    verify();
  }, [router]);

  return {
    loading,
    error,
  };
} 