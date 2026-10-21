import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { auth, resolveViewer } from '@zapbots/auth';
import { type Context, typeDefs } from '@zapbots/graphql/server';
import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';

import { resolvers } from './resolvers';
import { handleStripeEvent } from './services/billing/billing';
import { verifyWebhook } from './services/billing/stripe';
import { ChatError, replyInConversation, type ChatEvent } from './services/bots/chat';
import { failStaleJobs } from './services/bots/jobs';
import { runDueRoutines } from './services/bots/routines';
import { ModelError } from './services/models';

const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

/** The HTTP app: `index.ts` serves it as one long-lived process, Vercel as functions. */
const app = express();
app.use(cors({ credentials: true, origin: clientOrigin }));

// Better Auth reads the raw body itself, so it must be mounted before express.json().
app.all('/api/auth/*splat', toNodeHandler(auth));

// Stripe signs the raw body, so the webhook reads it untouched (docs/adr/0011).
app.post('/api/billing/webhook', express.text({ type: '*/*' }), async (req, res) => {
  const event = verifyWebhook(
    typeof req.body === 'string' ? req.body : '',
    req.header('stripe-signature')
  );
  if (!event) {
    res.status(400).json({ message: 'Assinatura inválida' });
    return;
  }
  try {
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (error) {
    console.error('stripe webhook failed:', error);
    // Stripe retries a failed delivery later.
    res.status(500).json({ message: 'Falhou' });
  }
});

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

// Streams a Bot's reply as server-sent events: `delta`, then `done` or `error`.
app.post('/api/chat/:conversationId', express.json(), async (req, res) => {
  const viewer = await resolveViewer(req.headers);
  if (!viewer) {
    res.status(401).json({ message: 'Faça login' });
    return;
  }
  res.writeHead(200, {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
  });
  const send = (event: ChatEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  const abort = new AbortController();
  res.on('close', () => abort.abort());
  try {
    const body = req.body as { content?: unknown; screen?: unknown };
    await replyInConversation({
      content: typeof body.content === 'string' ? body.content : '',
      conversationId: req.params.conversationId,
      screen: typeof body.screen === 'string' ? body.screen.slice(0, 120) : undefined,
      send,
      signal: abort.signal,
      viewer,
    });
  } catch (error) {
    const known = error instanceof ChatError || error instanceof ModelError;
    if (!known && !abort.signal.aborted) console.error('chat failed:', error);
    send({ message: known ? error.message : 'O Bot não conseguiu responder.', type: 'error' });
  }
  res.end();
});

// On Vercel there is no process to keep a clock: a Cron Job calls this once a day (docs/adr/0012).
app.get('/api/cron/routines', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.header('authorization') !== `Bearer ${secret}`) {
    res.status(401).json({ message: 'Não autorizado' });
    return;
  }
  await failStaleJobs();
  res.json({ handed: await runDueRoutines() });
});

const apollo = new ApolloServer<Context>({ resolvers, typeDefs });
await apollo.start();

app.use(
  '/graphql',
  express.json(),
  expressMiddleware(apollo, {
    context: async ({ req }) => ({ viewer: await resolveViewer(req.headers) }),
  })
);

export default app;
