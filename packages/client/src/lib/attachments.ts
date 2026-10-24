import { readTable } from './spreadsheet';

/** A file ready to go with a chat Message (docs/adr/0017): text, or an image or PDF as a data URL. */
export interface ChatAttachment {
  data: string;
  kind: 'IMAGE' | 'PDF' | 'TEXT';
  name: string;
}

/** What the file picker offers; the server takes the same. */
export const ATTACHMENT_ACCEPT =
  '.csv,.tsv,.txt,.md,.xlsx,.pdf,image/png,image/jpeg,image/webp,image/gif';
export const MAX_ATTACHMENTS = 5;
const MAX_TEXT_CHARS = 40_000;
/** Images and PDFs of one Message together, as the server counts them. */
export const MAX_BINARY_BYTES = 3 * 1024 * 1024;
/** Photos are scaled down to this longest side before going, which keeps them small. */
const IMAGE_SIDE = 1600;

/** A file the chat cannot take, with the reason in pt-BR. */
export class AttachmentError extends Error {}

/** Bytes an attachment weighs on the request, counted as the server does. */
export const binaryBytes = (attachment: ChatAttachment) =>
  attachment.kind === 'TEXT'
    ? 0
    : Math.floor(((attachment.data.length - attachment.data.indexOf(',') - 1) * 3) / 4);

/** Reads a picked file for the chat: spreadsheets and text as text, photos scaled down, PDFs whole. */
export async function readAttachment(file: File): Promise<ChatAttachment> {
  const name = file.name;
  if (/\.(csv|tsv|txt|md)$/i.test(name)) return text(name, await file.text());
  if (/\.xlsx$/i.test(name)) {
    const table = await readTable(file);
    const rows = [table.headers, ...table.rows].map(row =>
      row
        .map(cell => (cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell ?? '')))
        .join(';')
    );
    return text(name, rows.join('\n'));
  }
  if (file.type === 'application/pdf' || /\.pdf$/i.test(name)) {
    if (file.size > MAX_BINARY_BYTES) throw new AttachmentError(`"${name}" passa de 3 MB.`);
    return { data: await dataUrl(file), kind: 'PDF', name };
  }
  if (file.type.startsWith('image/')) return { data: await scaledImage(file), kind: 'IMAGE', name };
  throw new AttachmentError(`"${name}": anexe planilhas, textos, imagens ou PDF.`);
}

function text(name: string, content: string): ChatAttachment {
  const cut = content.length > MAX_TEXT_CHARS;
  return {
    data: cut ? `${content.slice(0, MAX_TEXT_CHARS - 40)}\n[arquivo cortado aqui]` : content,
    kind: 'TEXT',
    name,
  };
}

function dataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new AttachmentError('Não deu para ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

/** The photo as a JPEG no larger than `IMAGE_SIDE` on its longest side. */
async function scaledImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new AttachmentError(`"${file.name}" não é uma imagem que dê para abrir.`);
  });
  const scale = Math.min(1, IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return dataUrl(file);
  // JPEG has no transparency: a white page under it, as on paper.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Reads `picked` and adds them to `current` within the limits (how many, how heavy), keeping what
 * fits; `error` says why something was left out. The + and pasting both go through it.
 */
export async function addAttachments(
  current: ChatAttachment[],
  picked: File[]
): Promise<{ error: string | null; files: ChatAttachment[] }> {
  const next = [...current];
  let error: string | null = null;
  for (const file of picked) {
    if (next.length >= MAX_ATTACHMENTS) {
      error = `Anexe até ${MAX_ATTACHMENTS} arquivos por mensagem.`;
      break;
    }
    try {
      const attachment = await readAttachment(file);
      const total = [...next, attachment].reduce((sum, item) => sum + binaryBytes(item), 0);
      if (total > MAX_BINARY_BYTES) {
        error = 'Imagens e PDFs passam de 3 MB juntos. Anexe menos ou menores.';
        continue;
      }
      next.push(attachment);
    } catch (cause) {
      error = cause instanceof AttachmentError ? cause.message : `Não deu para ler "${file.name}".`;
    }
  }
  return { error, files: next };
}

/**
 * The files in a paste (a screenshot, a file copied in the file manager); a pasted image without a
 * name gets one. Empty when the paste is only text, which then goes in as usual.
 */
export function pastedFiles(data: DataTransfer): File[] {
  return [...data.files].map((file, index) =>
    file.name && file.name !== 'image.png'
      ? file
      : new File([file], `imagem-colada-${index + 1}.${file.type.split('/')[1] ?? 'png'}`, {
          type: file.type,
        })
  );
}
