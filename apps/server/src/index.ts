import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { auth, resolveViewer } from '@mny/auth';
import { type Context, typeDefs } from '@mny/graphql/server';
import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';

import { resolvers } from './resolvers';

const port = Number(process.env.SERVER_PORT ?? 4000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.use(cors({ credentials: true, origin: clientOrigin }));

// Better Auth reads the raw body itself, so it must be mounted before express.json().
app.all('/api/auth/*splat', toNodeHandler(auth));

app.get('/health', (_, res) => {
  res.json({ ok: true });
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

app.listen(port, () => {
  console.log(`🚀 server on http://localhost:${port} (graphql: /graphql, auth: /api/auth)`);
});
