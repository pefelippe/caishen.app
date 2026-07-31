import { Router } from "express";
import { env } from "../env.js";

export const whatsappRouter = Router();

/**
 * Webhook verification handshake (Meta Cloud API style). Twilio uses a
 * different validation scheme; swap this out when the provider is finalised.
 */
whatsappRouter.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.whatsappVerifyToken) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

/**
 * Inbound message handler. Groundwork stub — validates payload shape and
 * routes messages to the AI provider in a future iteration.
 */
whatsappRouter.post("/webhook", (req, res) => {
  // TODO: validate provider signature (Twilio X-Twilio-Signature / Meta HMAC),
  // parse inbound message, and route to the AI insights pipeline.
  console.log("WhatsApp inbound:", JSON.stringify(req.body).slice(0, 500));
  res.sendStatus(200);
});
