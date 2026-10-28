import type { Viewer } from '@zapbots/auth';
import { closeDb, db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { mswServer } from '../../test/msw/openrouter';
import { spotifyHandlers } from '../../test/msw/spotify';
import { finishSpotifyLink } from '../services/spotify';

beforeAll(() => mswServer.listen());
afterEach(() => {
  mswServer.resetHandlers();
  delete process.env.SPOTIFY_EMAILS;
});
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

async function emailOf(viewer: Viewer) {
  const [user] = await db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, viewer.userId));
  return user!.email;
}

/** A Viewer named in SPOTIFY_EMAILS, as on the owner's server. */
async function allowed() {
  const viewer = await createViewer();
  process.env.SPOTIFY_EMAILS = `outra@pessoa.com, ${(await emailOf(viewer)).toUpperCase()}`;
  return viewer;
}

const stateOf = (url: string) => new URL(url).searchParams.get('state')!;
const start = async (viewer: Viewer) =>
  (await gql(viewer, `mutation { startSpotifyLink }`)).data.startSpotifyLink as string;
const MUSIC = `{ music { playing { title artists url imageUrl } recent { title artists playedAt } } }`;

describe('Spotify', () => {
  it('is closed to anyone not in SPOTIFY_EMAILS', async () => {
    const viewer = await createViewer();
    const { data } = await gql(viewer, `{ connections { kind available unavailableReason } }`);
    expect(data.connections).toContainEqual({
      available: false,
      kind: 'SPOTIFY',
      unavailableReason: 'O Spotify ainda não está aberto para sua conta.',
    });
    const { errors } = await gql(viewer, `mutation { startSpotifyLink }`);
    expect(errors).toEqual(['BAD_USER_INPUT']);
  });

  it('links through the consent screen, only for the User who started it', async () => {
    const viewer = await allowed();
    const url = await start(viewer);
    const consent = new URL(url);
    expect(consent.origin + consent.pathname).toBe('https://accounts.spotify.com/authorize');
    expect(consent.searchParams.get('scope')).toBe(
      'user-read-currently-playing user-read-recently-played'
    );

    // Someone else's session cannot finish it, nor can a state that was tampered with.
    const other = await createViewer();
    process.env.SPOTIFY_EMAILS += `, ${await emailOf(other)}`;
    const spotify = spotifyHandlers({ playing: true });
    mswServer.use(...spotify.handlers);
    await expect(finishSpotifyLink(other, 'code-1', stateOf(url))).rejects.toThrow('não vale');
    await expect(finishSpotifyLink(viewer, 'code-1', `${stateOf(url)}x`)).rejects.toThrow(
      'não vale'
    );
    expect(spotify.tokens).toEqual([]);

    await finishSpotifyLink(viewer, 'code-1', stateOf(url));
    expect(spotify.tokens[0]?.get('code')).toBe('code-1');
    const [link] = await db
      .select()
      .from(schema.spotifyLink)
      .where(eq(schema.spotifyLink.userId, viewer.userId));
    // The refresh token is kept sealed, never as Spotify sent it.
    expect(link!.sealedRefreshToken).not.toContain('refresh-1');
    expect(link!.name).toBe('Pedro');

    const { data } = await gql(viewer, MUSIC);
    expect(data.music).toEqual({
      playing: {
        artists: 'Elis Regina',
        imageUrl: 'https://i.scdn.co/Águas de Março-64',
        title: 'Águas de Março',
        url: 'https://open.spotify.com/track/Águas de Março',
      },
      recent: [
        { artists: 'Chico Buarque', playedAt: '2026-10-28T12:00:00.000Z', title: 'Construção' },
        { artists: 'Adoniran', playedAt: '2026-10-28T11:55:00.000Z', title: 'Trem das Onze' },
      ],
    });
    // Another User of the same server sees nothing of it.
    expect((await gql(other, MUSIC)).data.music).toBeNull();

    const connections = (await gql(viewer, `{ connections { kind connected detail } }`)).data
      .connections;
    expect(connections).toContainEqual({
      connected: true,
      detail: 'Conta: Pedro.',
      kind: 'SPOTIFY',
    });

    await gql(viewer, `mutation { unlinkSpotify }`);
    expect((await gql(viewer, MUSIC)).data.music).toBeNull();
  });

  it('says so when Spotify no longer accepts the access', async () => {
    const viewer = await allowed();
    const url = await start(viewer);
    mswServer.use(...spotifyHandlers().handlers);
    await finishSpotifyLink(viewer, 'code-2', stateOf(url));

    mswServer.use(...spotifyHandlers({ revoked: true }).handlers);
    expect((await gql(viewer, MUSIC)).data.music).toEqual({ playing: null, recent: [] });
    // The next read tries the refresh token, which Spotify refuses too.
    const spotify = spotifyHandlers({ revoked: true });
    mswServer.use(...spotify.handlers);
    await gql(viewer, MUSIC);
    expect(spotify.tokens[0]?.get('grant_type')).toBe('refresh_token');
    const { data } = await gql(viewer, `{ spotifyLink { error } }`);
    expect(data.spotifyLink.error).toContain('Conecte de novo');
  });
});
