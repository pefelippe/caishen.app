'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMagicLink } from '@/hooks/useMagicLink';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const { sendLink, loading, error, success, reset } = useMagicLink();
  const { signInWithGoogle, loading: googleLoading, error: googleError } = useGoogleAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendLink(email);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        ease: "easeOut",
        type: "spring",
        stiffness: 100,
        damping: 20
      }}
      className="bg-white/80 backdrop-blur-sm p-10 rounded-2xl shadow-2xl border border-white/20 max-w-md w-full"
    >
      {!success && (
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.div 
            className="w-16 h-16 bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              duration: 0.6, 
              delay: 0.3,
              type: "spring",
              stiffness: 200
            }}
            whileHover={{ 
              scale: 1.1, 
              rotate: 5,
              transition: { duration: 0.2 }
            }}
          >
            <motion.span 
              className="text-white text-2xl font-bold"
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
            >
              💰
            </motion.span>
          </motion.div>
          <motion.h1 
            className="text-3xl font-bold text-gray-900 mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Welcome to Caishen
          </motion.h1>
          <motion.p 
            className="text-gray-600 text-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            Enter your email to receive a magic link
          </motion.p>
        </motion.div>
      )}

      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.5,
            type: "spring",
            stiffness: 150
          }}
          className="text-center"
        >
          <motion.div 
            className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              duration: 0.6,
              type: "spring",
              stiffness: 200
            }}
          >
            <motion.span 
              className="text-white text-2xl"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, 0]
              }}
              transition={{ 
                duration: 0.8,
                repeat: 2
              }}
            >
              ✅
            </motion.span>
          </motion.div>
          <motion.h3 
            className="text-xl font-semibold text-gray-900 mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Magic link sent!
          </motion.h3>
          <motion.p 
            className="text-gray-600 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Check your email and click the link to sign in.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
                      <Button
            onClick={() => {
              reset();
              setEmail('');
            }}
            className="bg-stone-800 hover:bg-stone-900 px-8 py-3 rounded-xl transition-all duration-200 hover:scale-105"
          >
            Send another link
          </Button>
          </motion.div>
        </motion.div>
      ) : (
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {/* Google Sign In Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <Button
              type="button"
              onClick={signInWithGoogle}
              disabled={googleLoading}
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-lg transition-all duration-200 transform hover:scale-[1.02] cursor-pointer border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center space-x-3"
            >
              {googleLoading ? (
                <motion.div 
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div 
                    className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span>Signing in...</span>
                </motion.div>
              ) : (
                <>
                  <motion.svg 
                    className="w-6 h-6" 
                    viewBox="0 0 24 24"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </motion.svg>
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Continue with Google
                  </motion.span>
                </>
              )}
            </Button>
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with email</span>
            </div>
          </motion.div>

          {googleError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                duration: 0.4,
                type: "spring",
                stiffness: 200
              }}
              className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-4 rounded-xl"
            >
              <motion.span 
                className="text-red-500"
                animate={{ 
                  rotate: [0, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 0.6,
                  repeat: 2
                }}
              >
                ⚠️
              </motion.span>
              <span>{googleError}</span>
            </motion.div>
          )}

          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</Label>
            <motion.div
              whileFocus={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-12 px-4 rounded-xl text-black border-gray-200 focus:border-stone-800 focus:ring-stone-800 text-lg transition-all duration-200"
              />
            </motion.div>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                duration: 0.4,
                type: "spring",
                stiffness: 200
              }}
              className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-4 rounded-xl"
            >
              <motion.span 
                className="text-red-500"
                animate={{ 
                  rotate: [0, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 0.6,
                  repeat: 2
                }}
              >
                ⚠️
              </motion.span>
              <span>{error}</span>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-stone-800 to-stone-900 hover:from-stone-900 hover:to-stone-800 text-white font-semibold rounded-xl text-lg transition-all duration-200 transform hover:scale-[1.02] cursor-pointer"
            >
              {loading ? (
                <motion.div 
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div 
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <span>Sending magic link...</span>
                </motion.div>
              ) : (
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Send magic link
                </motion.span>
              )}
            </Button>
          </motion.div>
        </motion.form>
      )}

      <motion.div 
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.9 }}
      >
        <p className="text-sm text-gray-500">
          By signing in, you agree to our{' '}
          <motion.a 
            href="#" 
            className="text-stone-800 hover:text-stone-900 font-medium underline"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Terms of Service
          </motion.a>
        </p>
      </motion.div>
    </motion.div>
  );
} 