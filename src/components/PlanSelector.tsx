import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plan, plans, updateUserSubscription } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export default function PlanSelector() {
  const [selectedPlan] = useState("Free")
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
      await updateUserSubscription(user.uid, plan);
      router.push('/app');
    } catch (error) {
      console.error('Error selecting plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const plansArray = Object.entries(plans).map(([key, value]) => ({
    id: key as Plan,
    ...value
  }));

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plansArray.map((plan) => (
        <Card key={plan.id} className={`p-6 ${selectedPlan === plan.name ? "border-primary" : ""}`}>
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="mt-2 text-3xl font-bold">${plan.price}</p>
          <p className="mt-1 text-sm text-gray-500">per month</p>
          <ul className="mt-6 space-y-4">
            {plan.features.map((feature: string) => (
              <li key={feature} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-6 w-full" variant={selectedPlan === plan.name ? "default" : "outline"} onClick={() => handlePlanSelect(plan.id)} disabled={isLoading}>
            {selectedPlan === plan.name ? "Current Plan" : "Select Plan"}
          </Button>
        </Card>
      ))}
    </div>
  );
} 