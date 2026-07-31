import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";

export interface AuthedRequest extends Request {
  user?: { id: string; email: string };
}

/**
 * Validates the Better Auth session cookie and attaches the user to
 * `req.user`. Rejects with 401 when there is no valid session.
 */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.user = { id: session.user.id, email: session.user.email };
  next();
}
