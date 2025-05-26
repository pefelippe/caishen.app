import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plan, plans, updateUserSubscription } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export default function PlanSelector() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('free');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handlePlanSelect = async (plan: Plan) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    try {
      if (plan === 'free') {
        // Free plan can be activated immediately
        await updateUserSubscription(user.uid, plan);
        router.push('/app');
      } else {
        // For paid plans, redirect to payment page
        router.push(`/payment?plan=${plan}`);
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
      {Object.entries(plans).map(([planId, plan]) => (
        <div
          key={planId}
          className={`relative flex flex-col p-8 bg-white border ${
            selectedPlan === planId ? 'border-emerald-500' : 'border-gray-200'
          } rounded-2xl shadow-sm`}
        >
          {planId === 'pro' && (
            <div className="absolute -top-4 left-0 right-0 mx-auto w-32 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 px-3 py-1 text-center text-sm font-medium text-white">
              Most Popular
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
            <p className="mt-4 flex items-baseline text-gray-900">
              <span className="text-5xl font-extrabold tracking-tight">${plan.price}</span>
              <span className="ml-1 text-xl font-semibold">/month</span>
            </p>
            <p className="mt-6 text-gray-500">
              {planId === 'free' ? 'Perfect for getting started' :
               planId === 'pro' ? 'For serious financial management' :
               'For power users and businesses'}
            </p>
            <ul className="mt-6 space-y-4">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-sm text-gray-500">{feature}</p>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => handlePlanSelect(planId as Plan)}
            disabled={isLoading}
            className={`mt-8 block w-full ${
              planId === 'pro'
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            } text-white rounded-lg px-6 py-3 text-center font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? 'Processing...' : 'Get Started'}
          </button>
        </div>
      ))}
    </div>
  );
} 