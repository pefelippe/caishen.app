import { http, HttpResponse, type HttpHandler } from 'msw';

const FILES = 'https://www.googleapis.com/drive/v3/files';

/** Serves `text` as the plain-text export of the Google Doc `fileId`, recording the bearer token. */
export function docExportHandler(
  fileId: string,
  text: string
): { handler: HttpHandler; tokens: string[] } {
  const tokens: string[] = [];
  const handler = http.get(`${FILES}/${fileId}/export`, ({ request }) => {
    tokens.push(request.headers.get('authorization') ?? '');
    return HttpResponse.text(text);
  });
  return { handler, tokens };
}

/** Serves `body` as the content of the Drive file `fileId` (`?alt=media`). */
export function fileDownloadHandler(fileId: string, body: Uint8Array | string): HttpHandler {
  return http.get(`${FILES}/${fileId}`, () => new HttpResponse(body));
}

/** A one-page PDF whose text layer holds `lines`, written by hand so tests need no fixture file. */
export function pdfWithText(lines: string[]): Uint8Array {
  const escape = (text: string) => text.replace(/[\\()]/g, char => `\\${char}`);
  const stream = [
    'BT /F1 12 Tf 14 TL 72 720 Td',
    ...lines.map(line => `(${escape(line)}) Tj T*`),
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
