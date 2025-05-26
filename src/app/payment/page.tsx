'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plan, plans } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { createCheckoutSession } from '@/lib/stripe';

export default function PaymentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const planId = searchParams.get('plan') as Plan;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!planId || !plans[planId]) {
      router.push('/pricing');
      return;
    }
  }, [user, planId, router]);

  const handlePayment = async () => {
    if (!user || !planId) return;

    setIsLoading(true);
    try {
      await createCheckoutSession(user.uid, planId, plans[planId].price);
    } catch (error) {
      console.error('Error processing payment:', error);
      setIsLoading(false);
    }
  };

  if (!planId || !plans[planId]) {
    return null;
  }

  const selectedPlan = plans[planId];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Complete Your Subscription</h1>
          
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Plan</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{selectedPlan.name}</h3>
                  <p className="text-gray-500">${selectedPlan.price}/month</p>
                </div>
                <button
                  onClick={() => router.push('/pricing')}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  Change Plan
                </button>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-500">
                You will be redirected to our secure payment processor to complete your subscription.
              </p>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg px-6 py-3 text-center font-medium hover:from-emerald-700 hover:to-green-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : `Pay $${selectedPlan.price}/month`}
          </button>

          <p className="mt-4 text-sm text-gray-500 text-center">
            By subscribing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
} 