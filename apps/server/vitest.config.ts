import { defineConfig } from 'vitest/config';

/** Tests run against their own database, `zapbots_test`, on the same Postgres as development. */
const databaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgres://zapbots:zapbots@localhost:5433/zapbots_test';

export default defineConfig({
  test: {
    env: {
      BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret',
      DATABASE_URL: databaseUrl,
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      OPENROUTER_DEFAULT_MODEL: 'test/with-tools',
      PLUGGY_CLIENT_ID: 'test-pluggy-id',
      PLUGGY_CLIENT_SECRET: 'test-pluggy-secret',
      PLUGGY_WEBHOOK_SECRET: 'test-webhook-secret',
      TELEGRAM_BOT_TOKEN: 'test-telegram-token',
      TELEGRAM_BOT_USERNAME: 'CaishenBot',
      TELEGRAM_WEBHOOK_SECRET: 'test-telegram-secret',
      WHATSAPP_APP_SECRET: 'test-app-secret',
      WHATSAPP_NUMBER: '5511999990000',
      WHATSAPP_PHONE_NUMBER_ID: 'test-phone-number-id',
      WHATSAPP_TOKEN: 'test-token',
      WHATSAPP_VERIFY_TOKEN: 'test-verify-token',
    },
    // One database: files must not interleave.
    fileParallelism: false,
    globalSetup: './test/globalSetup.ts',
    include: ['src/**/*.test.ts'],
    // MSW's interceptor rejects on its own when a faked response is cancelled mid-stream (Parar);
    // a real server's closes quietly. Only that abort is ignored.
    onUnhandledError: error => error.name !== 'AbortError',
  },
});
