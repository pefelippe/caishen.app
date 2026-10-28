import type { AttachmentRow } from '@zapbots/database';
import { extractText } from 'unpdf';

import { googleAccessToken, googleConfigured, googleGranted } from './google';

/** Only files the User picks are visible to zapbots; nothing else in their Drive is. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const GOOGLE_DOC = 'application/vnd.google-apps.document';
const PDF = 'application/pdf';
const MAX_CHARS = 4000;
/** Files above this are not downloaded: statements and contracts are far smaller. */
const MAX_BYTES = 10 * 1024 * 1024;

/** True when the User's Google account granted the Drive scope. */
export const driveConnected = (userId: string) => googleGranted(userId, DRIVE_SCOPE);

export { googleConfigured };

/**
 * The text of an Attachment, for a Bot to read: Google Docs are exported, plain-text files
 * downloaded and PDFs read page by page. Other types (images, Sheets) and scanned PDFs with no
 * text layer return `null`.
 */
export async function attachmentText(
  userId: string,
  attachment: Pick<AttachmentRow, 'fileId' | 'mimeType'>
): Promise<string | null> {
  const kind =
    attachment.mimeType === GOOGLE_DOC
      ? 'doc'
      : attachment.mimeType === PDF
        ? 'pdf'
        : attachment.mimeType.startsWith('text/')
          ? 'text'
          : null;
  if (!kind) return null;
  const token = await googleAccessToken(userId);
  if (!token) return null;

  const file = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(attachment.fileId)}`;
  const response = await fetch(
    kind === 'doc' ? `${file}/export?mimeType=text/plain` : `${file}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) return null;
  if (Number(response.headers.get('content-length') ?? 0) > MAX_BYTES) return null;
  const text = (
    kind === 'pdf' ? await pdfText(await response.arrayBuffer()) : await response.text()
  )?.trim();
  if (!text) return null;
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}… (cortado)` : text;
}

/** The text layer of a PDF; `null` when it has none or cannot be read. */
async function pdfText(bytes: ArrayBuffer): Promise<string | null> {
  if (bytes.byteLength > MAX_BYTES) return null;
  try {
    const { text } = await extractText(new Uint8Array(bytes), { mergePages: true });
    // Collapse the runs of spaces PDF layouts leave between columns.
    return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
  } catch {
    return null;
  }
}
