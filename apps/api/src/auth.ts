import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db, schema } from "./db/index.js";
import { env } from "./env.js";
import { sendMagicLinkEmail } from "./lib/resend.js";

export const auth = betterAuth({
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  trustedOrigins: [env.webOrigin],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
  ],
});
