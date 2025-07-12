import { initializeApp } from "firebase/app"
import { 
  getAuth, 
  isSignInWithEmailLink, 
  GoogleAuthProvider,
  signInWithEmailLink,
  signOut
} from "firebase/auth"
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import Cookies from 'js-cookie';

const firebaseConfig = {
  apiKey: "AIzaSyAy_FIS-E1c1XP6V7xbk56AKUDULrDxsOs",
  authDomain: "cent-1bcb9.firebaseapp.com",
  projectId: "cent-1bcb9",
  storageBucket: "cent-1bcb9.firebasestorage.app",
  messagingSenderId: "591912339550",
  appId: "1:591912339550:web:c7e889552abc4fea720ccf",
  measurementId: "G-VMRY2PB26K"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Configure Email Link Settings
const actionCodeSettings = {
  url: process.env.NEXT_PUBLIC_APP_URL + '/login',
  handleCodeInApp: true,
};

// Check if current URL is a magic link
const isMagicLink = () => {
  return isSignInWithEmailLink(auth, window.location.href);
};

// Handle magic link sign in
const handleMagicLinkSignIn = async (email: string) => {
  try {
    const result = await signInWithEmailLink(auth, email, window.location.href);
    if (result.user) {
      // Set auth cookie
      const token = await result.user.getIdToken();
      Cookies.set('auth', token, { expires: 7 }); // Cookie expires in 7 days
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error signing in with magic link:', error);
    return false;
  }
};

// Set up auth state observer
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // User is signed in
    const token = await user.getIdToken();
    Cookies.set('auth', token, { expires: 7 }); // Cookie expires in 7 days
  } else {
    // User is signed out
    Cookies.remove('auth');
  }
});

// Handle user logout
const handleLogout = async () => {
  try {
    await signOut(auth);
    Cookies.remove('auth');
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    return false;
  }
};

export type Plan = 'free' | 'pro' | 'enterprise';

export interface UserSubscription {
  plan: Plan;
  status: 'active' | 'inactive';
  startDate: Date;
  endDate?: Date;
}

export const plans = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      'Basic expense tracking',
      'WhatsApp notifications',
      'Basic AI insights'
    ]
  },
  pro: {
    name: 'Pro',
    price: 5,
    features: [
      'Everything in Free',
      'Advanced AI insights',
      'Custom categories',
      'Priority support'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: 25,
    features: [
      'Everything in Pro',
      'Multiple accounts',
      'Advanced analytics',
      '24/7 dedicated support'
    ]
  }
};

export const getUserSubscription = async (userId: string): Promise<UserSubscription | null> => {
  try {
    const subscriptionDoc = await getDoc(doc(db, 'subscriptions', userId));
    
    if (subscriptionDoc.exists()) {
      return subscriptionDoc.data() as UserSubscription;
    }
    
    // If no subscription exists, create a free plan
    const freeSubscription: UserSubscription = {
      plan: 'free',
      status: 'active',
      startDate: new Date()
    };
    
    await setDoc(doc(db, 'subscriptions', userId), freeSubscription);
    return freeSubscription;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return null;
  }
};

export const updateUserSubscription = async (
  userId: string,
  newPlan: Plan
): Promise<boolean> => {
  try {
    const subscription: UserSubscription = {
      plan: newPlan,
      status: 'active',
      startDate: new Date()
    };

    await setDoc(doc(db, 'subscriptions', userId), subscription);
    return true;
  } catch (error) {
    console.error('Error updating user subscription:', error);
    return false;
  }
};

export const checkSubscriptionStatus = async (userId: string): Promise<boolean> => {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) return false;

    // Check if subscription is active and not expired
    if (subscription.status === 'active') {
      if (subscription.endDate) {
        return new Date() < subscription.endDate;
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};

// Function to get plan features
export const getPlanFeatures = (plan: Plan): string[] => {
  return plans[plan].features;
};

// Function to get plan price
export const getPlanPrice = (plan: Plan): number => {
  return plans[plan].price;
};

// Function to check if user can access a feature
export const canAccessFeature = async (userId: string, feature: string): Promise<boolean> => {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) return false;

    const planFeatures = getPlanFeatures(subscription.plan);
    return planFeatures.includes(feature);
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
};

export {
  app,
  auth,
  db,
  functions,
  storage,
  googleProvider,
  actionCodeSettings,
  isMagicLink,
  handleMagicLinkSignIn,
  handleLogout,
}; 