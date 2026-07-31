import { Resend } from "resend";
import { env } from "../env.js";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

/**
 * Send a magic-link sign-in email. In local dev without a RESEND_API_KEY the
 * link is logged to the console so sign-in still works end-to-end.
 */
export async function sendMagicLinkEmail(
  email: string,
  url: string,
): Promise<void> {
  if (!resend) {
    console.log(`[dev] magic link for ${email}: ${url}`);
    return;
  }

  await resend.emails.send({
    from: env.emailFrom,
    to: email,
    subject: "Your Caishen sign-in link",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Sign in to Caishen</h2>
        <p>Click the button below to sign in. This link expires shortly.</p>
        <p>
          <a href="${url}"
             style="display:inline-block;background:#0B3D91;color:#fff;
                    padding:12px 24px;border-radius:8px;text-decoration:none;">
            Sign in
          </a>
        </p>
        <p style="color:#666;font-size:13px;">
          If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  });
}
