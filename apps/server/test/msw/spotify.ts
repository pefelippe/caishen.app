import { http, HttpResponse, type HttpHandler } from 'msw';

const track = (name: string, artist: string) => ({
  album: {
    images: [
      { url: `https://i.scdn.co/${name}-640`, width: 640 },
      { url: `https://i.scdn.co/${name}-64`, width: 64 },
    ],
  },
  artists: [{ name: artist }],
  external_urls: { spotify: `https://open.spotify.com/track/${name}` },
  name,
});

/**
 * Fakes Spotify's token endpoint and the three reads the Música card makes. `revoked` makes the
 * API refuse the access token and the token endpoint refuse the refresh token, as after the User
 * removes the app on Spotify. `tokens` records each form sent to the token endpoint.
 */
export function spotifyHandlers(state: { playing?: boolean; revoked?: boolean } = {}): {
  handlers: HttpHandler[];
  tokens: URLSearchParams[];
} {
  const tokens: URLSearchParams[] = [];
  const authorized = (request: Request) =>
    !state.revoked && request.headers.get('Authorization')?.startsWith('Bearer access-');
  const handlers = [
    http.post('https://accounts.spotify.com/api/token', async ({ request }) => {
      const form = new URLSearchParams(await request.text());
      tokens.push(form);
      if (state.revoked) return HttpResponse.json({ error: 'invalid_grant' }, { status: 400 });
      return HttpResponse.json({
        access_token: `access-${tokens.length}`,
        expires_in: 3600,
        ...(form.get('grant_type') === 'authorization_code' ? { refresh_token: 'refresh-1' } : {}),
      });
    }),
    http.get('https://api.spotify.com/v1/me', ({ request }) =>
      authorized(request)
        ? HttpResponse.json({ display_name: 'Pedro', id: 'pedro' })
        : new HttpResponse(null, { status: 401 })
    ),
    http.get('https://api.spotify.com/v1/me/player/currently-playing', ({ request }) => {
      if (!authorized(request)) return new HttpResponse(null, { status: 401 });
      if (!state.playing) return new HttpResponse(null, { status: 204 });
      return HttpResponse.json({ is_playing: true, item: track('Águas de Março', 'Elis Regina') });
    }),
    http.get('https://api.spotify.com/v1/me/player/recently-played', ({ request }) => {
      if (!authorized(request)) return new HttpResponse(null, { status: 401 });
      return HttpResponse.json({
        items: [
          { played_at: '2026-10-28T12:00:00.000Z', track: track('Construção', 'Chico Buarque') },
          { played_at: '2026-10-28T11:55:00.000Z', track: track('Trem das Onze', 'Adoniran') },
        ],
      });
    }),
  ];
  return { handlers, tokens };
}
