// Better Auth client + helpers
export {
  authClient,
  signIn,
  signOut,
  useSession,
  handleLogout,
} from "./auth-client";

// Auth context + hooks
export { AuthContext, AuthProvider, useAuth, type AuthUser } from "./auth-context";
export { useMagicLink } from "./use-magic-link";

// Backend API client + data hooks
export { apiClient, ApiError } from "./api-client";
export { useSubscription, useUpdateSubscription } from "./use-subscription";

// Shared validation schemas
export * from "./schemas";
