import app from './app';
import { failInterruptedJobs } from './services/bots/jobs';
import { startRoutineClock } from './services/bots/routines';

const port = Number(process.env.SERVER_PORT ?? 4000);

await failInterruptedJobs();
startRoutineClock();

app.listen(port, () => {
  console.log(`🚀 server on http://localhost:${port} (graphql: /graphql, auth: /api/auth)`);
});
