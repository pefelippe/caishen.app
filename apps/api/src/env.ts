/** Central env access with sensible defaults for local development. */

export const env = {
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",

  // Postgres (Drizzle)
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://caishen:caishen@localhost:5432/caishen",

  // Better Auth. baseURL is the origin the browser hits (the web app, which
  // proxies /api/auth to this backend), so cookies stay first-party.
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "dev-insecure-secret",

  // Email (Resend) — magic-link delivery.
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM ?? "Caishen <onboarding@resend.dev>",

  // AI (Anthropic Claude)
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // WhatsApp (Twilio) webhook verification.
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
} as const;

export const isProd = process.env.NODE_ENV === "production";
