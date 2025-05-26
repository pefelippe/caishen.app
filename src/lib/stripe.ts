import { loadStripe } from '@stripe/stripe-js';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export const createCheckoutSession = async (userId: string, planId: string, price: number) => {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        planId,
        price,
      }),
    });

    const { sessionId } = await response.json();
    const stripe = await stripePromise;
    
    if (!stripe) {
      throw new Error('Stripe failed to initialize');
    }

    // Store the session ID in Firestore
    await setDoc(doc(db, 'checkout_sessions', sessionId), {
      userId,
      planId,
      status: 'pending',
      createdAt: new Date(),
    });

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({
      sessionId,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const handleSubscriptionChange = async (userId: string, planId: string) => {
  try {
    const response = await fetch('/api/update-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        planId,
      }),
    });

    const { success } = await response.json();
    return success;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

export default stripePromise; 