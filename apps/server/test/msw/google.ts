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
