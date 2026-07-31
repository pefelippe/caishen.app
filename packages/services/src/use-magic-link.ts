"use client";

import { useState } from "react";
import { signIn } from "./auth-client";

/**
 * Send a passwordless magic-link email via Better Auth. Keeps the original
 * `{ sendLink, loading, error, success, reset }` shape so LoginForm is
 * unchanged.
 */
export function useMagicLink() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const sendLink = async (email: string) => {
    setLoading(true);
    setError("");
    setSuccess(false);

    const { error: signInError } = await signIn.magicLink({
      email,
      callbackURL: "/app",
    });

    setLoading(false);

    if (signInError) {
      setError(
        signInError.message ?? "Failed to send magic link. Please try again.",
      );
      return false;
    }

    setSuccess(true);
    return true;
  };

  const reset = () => {
    setError("");
    setSuccess(false);
  };

  return { sendLink, loading, error, success, reset };
}
