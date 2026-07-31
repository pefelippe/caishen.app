"use client";

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

/**
 * Better Auth browser client. baseURL defaults to the current origin; the
 * Next.js app proxies `/api/auth/*` to the backend, so auth stays same-origin
 * and session cookies are first-party.
 */
export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});

export const { signIn, signOut, useSession } = authClient;

/** Sign out and report success (compat shape for LogoutButton/UserMenu). */
export async function handleLogout(): Promise<boolean> {
  const { error } = await authClient.signOut();
  return !error;
}
