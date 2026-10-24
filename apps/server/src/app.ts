// First, so error monitoring is set up before anything else loads.
import { reportError, Sentry } from './sentry';

import { ApolloServer } from '@apollo/server';
import { unwrapResolverError } from '@apollo/server/errors';
import { expressMiddleware } from '@as-integrations/express5';
import { auth, resolveViewer } from '@zapbots/auth';
import { type Context, typeDefs } from '@zapbots/graphql/server';
import { waitUntil } from '@vercel/functions';
import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import { GraphQLError } from 'graphql';

import { resolvers } from './resolvers';
import { handleStripeEvent } from './services/billing/billing';
import { verifyWebhook } from './services/billing/stripe';
import { AttachmentError, readAttachments } from './services/bots/attachments';
import { ChatError, replyInConversation, type ChatEvent } from './services/bots/chat';
import { failStaleJobs } from './services/bots/jobs';
import { runDueRoutines } from './services/bots/routines';
import { ModelError } from './services/models';
import {
  handlePluggyEvent,
  pluggyWebhookAuthorized,
  pluggyWebhookConfigured,
  type PluggyEvent,
} from './services/openFinance/webhook';
import { handleWebhook, type WebhookPayload } from './services/whatsapp/inbound';
import { verifyChallenge, verifySignature, whatsappConfigured } from './services/whatsapp/meta';

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
    reportError(error);
    // Stripe retries a failed delivery later.
    res.status(500).json({ message: 'Falhou' });
  }
});

// Meta's check when the webhook is subscribed: it sends our verify token and wants the challenge back.
app.get('/api/whatsapp/webhook', (req, res) => {
  const challenge = whatsappConfigured() ? verifyChallenge(req.query) : null;
  if (challenge === null) {
    res.status(403).end();
    return;
  }
  res.type('text/plain').send(challenge);
});

// Meta signs the raw body, so it is read as bytes. The answer goes out at once and the messages are
// handled after it, since Meta retries a slow delivery (docs/adr/0019).
app.post('/api/whatsapp/webhook', express.raw({ type: '*/*' }), (req, res) => {
  if (!whatsappConfigured()) {
    res.status(404).end();
    return;
  }
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!verifySignature(raw, req.header('x-hub-signature-256'))) {
    res.status(403).json({ message: 'Assinatura inválida' });
    return;
  }
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw.toString('utf8')) as WebhookPayload;
  } catch {
    res.status(400).end();
    return;
  }
  res.sendStatus(200);
  waitUntil(handleWebhook(payload));
});

// Pluggy says an item changed; the answer goes out at once (it waits 5 seconds at most) and the
// item is read after it (docs/adr/0020).
app.post('/api/openfinance/webhook', express.json(), (req, res) => {
  if (!pluggyWebhookConfigured()) {
    res.status(404).end();
    return;
  }
  const token =
    typeof req.query.token === 'string' ? req.query.token : req.header('x-webhook-secret');
  if (!pluggyWebhookAuthorized(token)) {
    res.status(403).json({ message: 'Não autorizado' });
    return;
  }
  res.json({ received: true });
  waitUntil(
    handlePluggyEvent((req.body ?? {}) as PluggyEvent).catch(error => {
      console.error('pluggy webhook failed:', error);
      reportError(error);
    })
  );
});

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

// Streams a Bot's reply as server-sent events: `delta`, then `done` or `error`.
// Attachments come inline (images and PDFs as data URLs), so this body may be a few MB.
app.post('/api/chat/:conversationId', express.json({ limit: '5mb' }), async (req, res) => {
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
    const body = req.body as { attachments?: unknown; content?: unknown; screen?: unknown };
    await replyInConversation({
      attachments: readAttachments(body.attachments),
      content: typeof body.content === 'string' ? body.content : '',
      conversationId: req.params.conversationId,
      screen: typeof body.screen === 'string' ? body.screen.slice(0, 120) : undefined,
      send,
      signal: abort.signal,
      viewer,
    });
  } catch (error) {
    const known =
      error instanceof AttachmentError || error instanceof ChatError || error instanceof ModelError;
    if (!known && !abort.signal.aborted) {
      console.error('chat failed:', error);
      reportError(error);
    }
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

const apollo = new ApolloServer<Context>({
  plugins: [
    {
      // Errors thrown on purpose (a GraphQLError for the User) are answers, not failures.
      requestDidStart: async () => ({
        didEncounterErrors: async ({ errors }) => {
          for (const error of errors) {
            if (error.originalError && !(error.originalError instanceof GraphQLError)) {
              reportError(error.originalError);
            }
          }
        },
      }),
    },
  ],
  // Only errors thrown on purpose reach the User with their message; anything else (a failed
  // query, a bug) is reported above and answered in general words, so no SQL or ids leak out.
  formatError: (formatted, error) =>
    unwrapResolverError(error) instanceof Error &&
    !(unwrapResolverError(error) instanceof GraphQLError)
      ? {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
          message: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
        }
      : formatted,
  resolvers,
  typeDefs,
});
await apollo.start();

app.use(
  '/graphql',
  express.json(),
  expressMiddleware(apollo, {
    context: async ({ req }) => ({ viewer: await resolveViewer(req.headers) }),
  })
);

// Whatever a route throws without answering ends up in Sentry, then in Express's own handler.
Sentry.setupExpressErrorHandler(app);

export default app;
