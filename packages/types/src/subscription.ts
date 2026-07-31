export type Plan = "free" | "pro" | "enterprise";

export interface UserSubscription {
  plan: Plan;
  status: "active" | "inactive";
  startDate: Date;
  endDate?: Date;
}

export interface PlanDefinition {
  name: string;
  price: number;
  features: string[];
}

export const plans: Record<Plan, PlanDefinition> = {
  free: {
    name: "Free",
    price: 0,
    features: [
      "Basic expense tracking",
      "WhatsApp notifications",
      "Basic AI insights",
    ],
  },
  pro: {
    name: "Pro",
    price: 5,
    features: [
      "Everything in Free",
      "Advanced AI insights",
      "Custom categories",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 25,
    features: [
      "Everything in Pro",
      "Multiple accounts",
      "Advanced analytics",
      "24/7 dedicated support",
    ],
  },
};

export function getPlanFeatures(plan: Plan): string[] {
  return plans[plan].features;
}

export function getPlanPrice(plan: Plan): number {
  return plans[plan].price;
}
