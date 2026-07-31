"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Plan, UserSubscription } from "@caishen/types";
import { apiClient } from "./api-client";

const SUBSCRIPTION_KEY = ["subscription"] as const;

/** Fetch the current user's subscription from the backend. */
export function useSubscription() {
  return useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: () => apiClient<UserSubscription>("/subscriptions/me"),
  });
}

/** Update the current user's plan. */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: Plan) =>
      apiClient<UserSubscription>("/subscriptions/me", {
        method: "PUT",
        body: JSON.stringify({ plan }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(SUBSCRIPTION_KEY, data);
    },
  });
}
