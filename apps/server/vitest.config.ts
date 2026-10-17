import { defineConfig } from 'vitest/config';

/** Tests run against their own database, `zapbots_test`, on the same Postgres as development. */
const databaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgres://zapbots:zapbots@localhost:5433/zapbots_test';

export default defineConfig({
  test: {
    env: {
      BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
      DATABASE_URL: databaseUrl,
      DEMO_MODE: 'false',
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      OPENROUTER_API_KEY: 'test-key',
      OPENROUTER_DEFAULT_MODEL: 'test/with-tools',
    },
    // One database: files must not interleave.
    fileParallelism: false,
    globalSetup: './test/globalSetup.ts',
    include: ['src/**/*.test.ts'],
  },
});
