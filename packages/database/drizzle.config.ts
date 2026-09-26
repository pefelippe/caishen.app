import { defineConfig } from 'drizzle-kit';

process.loadEnvFile?.('../../.env');

export default defineConfig({
  dbCredentials: { url: process.env.DATABASE_URL! },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/schema/index.ts',
});
