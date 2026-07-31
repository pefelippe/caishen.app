import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { env } from "./env.js";
import { auth } from "./auth.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { aiRouter } from "./routes/ai.js";
import { whatsappRouter } from "./routes/whatsapp.js";

const app = express();

app.use(cors({ origin: env.webOrigin, credentials: true }));

// Better Auth handler must be mounted BEFORE express.json().
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", ai: Boolean(env.anthropicApiKey) });
});

app.use("/subscriptions", subscriptionsRouter);
app.use("/ai", aiRouter);
app.use("/whatsapp", whatsappRouter);

app.listen(env.port, () => {
  console.log(`caishen api listening on :${env.port}`);
});
