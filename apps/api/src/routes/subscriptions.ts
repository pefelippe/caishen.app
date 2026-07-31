import { Router, type Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type { UserSubscription } from "@caishen/types";
import { plans } from "@caishen/types";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth.js";
import { db } from "../db/index.js";
import { subscription } from "../db/schema.js";

export const subscriptionsRouter = Router();

const updateSchema = z.object({
  plan: z.enum(["free", "pro", "enterprise"]),
});

function toDto(row: typeof subscription.$inferSelect): UserSubscription {
  return {
    plan: row.plan as UserSubscription["plan"],
    status: row.status as UserSubscription["status"],
    startDate: row.startDate,
    endDate: row.endDate ?? undefined,
  };
}

/** Fetch the caller's subscription, creating a free plan on first access. */
subscriptionsRouter.get(
  "/me",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    const uid = req.user!.id;
    const [existing] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, uid));

    if (existing) {
      res.json(toDto(existing));
      return;
    }

    const [created] = await db
      .insert(subscription)
      .values({ userId: uid, plan: "free", status: "active" })
      .returning();
    res.json(toDto(created!));
  },
);

/** Update the caller's plan. */
subscriptionsRouter.put(
  "/me",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid plan" });
      return;
    }

    const [row] = await db
      .insert(subscription)
      .values({ userId: req.user!.id, plan: parsed.data.plan, status: "active" })
      .onConflictDoUpdate({
        target: subscription.userId,
        set: { plan: parsed.data.plan, status: "active" },
      })
      .returning();
    res.json(toDto(row!));
  },
);

/** Static plan catalogue (public). */
subscriptionsRouter.get("/plans", (_req, res) => {
  res.json(plans);
});
