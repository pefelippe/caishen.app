import { useState } from 'react';
import { sendMagicLink } from '@/lib/firebase';

export function useMagicLink() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const sendLink = async (email: string) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    console.log('Sending magic link to:', email);

    try {
      const result = await sendMagicLink(email);
      console.log('Magic link send result:', result);
      
      if (result) {
        window.localStorage.setItem('emailForSignIn', email);
        console.log('Email saved to localStorage:', email);
        setSuccess(true);
        return true;
      } else {
        setError('Failed to send magic link. Please try again.');
        return false;
      }
    } catch (error: unknown) {
      console.error('Error sending magic link:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send magic link. Please try again.';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError('');
    setSuccess(false);
  };

  return {
    sendLink,
    loading,
    error,
    success,
    reset,
  };
} 