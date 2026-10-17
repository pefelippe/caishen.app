import { auth } from '@zapbots/auth';
import { db, schema, type AttachmentRow } from '@zapbots/database';
import { and, eq } from 'drizzle-orm';

/** Only files the User picks are visible to zapbots; nothing else in their Drive is. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const GOOGLE_DOC = 'application/vnd.google-apps.document';
const MAX_CHARS = 4000;

export const googleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

async function googleAccount(userId: string) {
  const [account] = await db
    .select({ id: schema.account.id, scope: schema.account.scope })
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, 'google')));
  return account ?? null;
}

/** True when the User's Google account granted the Drive scope. */
export async function driveConnected(userId: string): Promise<boolean> {
  return (await googleAccount(userId))?.scope?.includes(DRIVE_SCOPE) ?? false;
}

/** A fresh Google access token; Better Auth refreshes it when it has expired. */
async function accessToken(userId: string): Promise<string | null> {
  const account = await googleAccount(userId);
  if (!account) return null;
  try {
    const result = await auth.api.getAccessToken({ body: { accountId: account.id, userId } });
    return result?.accessToken ?? null;
  } catch {
    return null;
  }
}

/**
 * The text of an Attachment, for a Bot to read: Google Docs are exported, plain-text files
 * downloaded. Other types (PDF, images, Sheets) have no text here and return `null`.
 */
export async function attachmentText(
  userId: string,
  attachment: Pick<AttachmentRow, 'fileId' | 'mimeType'>
): Promise<string | null> {
  const isDoc = attachment.mimeType === GOOGLE_DOC;
  if (!isDoc && !attachment.mimeType.startsWith('text/')) return null;
  const token = await accessToken(userId);
  if (!token) return null;

  const file = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(attachment.fileId)}`;
  const response = await fetch(isDoc ? `${file}/export?mimeType=text/plain` : `${file}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const text = (await response.text()).trim();
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}… (cortado)` : text;
}
