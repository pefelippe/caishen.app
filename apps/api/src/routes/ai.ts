import { Router, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/require-auth.js";
import { aiProvider } from "../lib/ai.js";
import { env } from "../env.js";

export const aiRouter = Router();

const insightsSchema = z.object({
  prompt: z.string().min(1).max(4000),
});

/**
 * Stream AI financial insights over Server-Sent Events.
 * Body: { prompt: string }. Emits `data: <text>` chunks, then `event: done`.
 */
aiRouter.post(
  "/insights",
  requireAuth,
  async (req: AuthedRequest, res: Response) => {
    if (!env.anthropicApiKey) {
      res.status(503).json({ error: "AI backend not configured" });
      return;
    }
    const parsed = insightsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid prompt" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      await aiProvider.streamInsights(parsed.data.prompt, (delta) => {
        res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
      });
      res.write("event: done\ndata: {}\n\n");
    } catch (error) {
      console.error("AI insights error:", error);
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: "stream_failed" })}\n\n`,
      );
    } finally {
      res.end();
    }
  },
);
