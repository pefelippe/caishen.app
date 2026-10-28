import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { badInput } from '../resolvers/guards';
import { open, seal } from './sealed';

/**
 * Spotify (docs/adr/0032): what the User is listening to and has just heard, for a card on the
 * Página inicial. Our own OAuth code flow, not a Better Auth provider, so Spotify never becomes a
 * way to sign in; two read-only scopes; the refresh token sealed (`spotify-token`). Spotify's
 * Development Mode serves five people the app's owner names, so only `SPOTIFY_EMAILS` may link.
 */
const SCOPES = 'user-read-currently-playing user-read-recently-played';
const ACCOUNTS = 'https://accounts.spotify.com';
const API = 'https://api.spotify.com/v1';
const STATE_MINUTES = 10;

export interface MusicTrack {
  artists: string;
  imageUrl: string | null;
  playedAt: Date | null;
  title: string;
  url: string | null;
}

export interface Music {
  playing: MusicTrack | null;
  recent: MusicTrack[];
}

export function spotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

/** Where Spotify sends the User back; it must be registered as is in Spotify's dashboard. */
export function spotifyRedirectUri(): string {
  if (process.env.SPOTIFY_REDIRECT_URI) return process.env.SPOTIFY_REDIRECT_URI;
  const origin = process.env.CLIENT_ORIGIN ?? 'http://127.0.0.1:5173';
  return `${origin.replace(/\/$/, '')}/api/spotify/callback`;
}

async function allowedEmail(viewer: Viewer): Promise<boolean> {
  const allowed = (process.env.SPOTIFY_EMAILS ?? '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length) return false;
  const [user] = await db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, viewer.userId));
  return Boolean(user && allowed.includes(user.email.toLowerCase()));
}

/** Why this Viewer cannot link Spotify here, or `null` when they can. */
export async function spotifyUnavailable(viewer: Viewer): Promise<string | null> {
  if (!spotifyConfigured()) return 'O Spotify ainda não está ligado neste servidor.';
  if (!(await allowedEmail(viewer))) return 'O Spotify ainda não está aberto para sua conta.';
  return null;
}

const stateKey = () => `spotify-state:${process.env.BETTER_AUTH_SECRET ?? ''}`;
const sign = (body: string) => createHmac('sha256', stateKey()).update(body).digest('base64url');

/** `userId.expires.nonce.signature`: the callback takes it only from the same User, in time. */
function stateFor(viewer: Viewer): string {
  const expires = Date.now() + STATE_MINUTES * 60_000;
  const body = `${viewer.userId}.${expires}.${randomBytes(12).toString('base64url')}`;
  return `${body}.${sign(body)}`;
}

function stateIsFor(state: string, viewer: Viewer): boolean {
  const cut = state.lastIndexOf('.');
  if (cut < 0) return false;
  const body = state.slice(0, cut);
  const given = Buffer.from(state.slice(cut + 1));
  const wanted = Buffer.from(sign(body));
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return false;
  const [userId, expires] = body.split('.');
  return userId === viewer.userId && Number(expires) > Date.now();
}

/** The address of Spotify's consent screen, for this User. */
export async function startSpotifyLink(viewer: Viewer): Promise<string> {
  const reason = await spotifyUnavailable(viewer);
  if (reason) badInput(reason);
  const query = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    redirect_uri: spotifyRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    state: stateFor(viewer),
  });
  return `${ACCOUNTS}/authorize?${query}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

class SpotifyRefused extends Error {}

async function token(form: Record<string, string>): Promise<TokenResponse> {
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');
  const response = await fetch(`${ACCOUNTS}/api/token`, {
    body: new URLSearchParams(form),
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });
  if (response.status === 400 || response.status === 401) {
    throw new SpotifyRefused('O Spotify não aceitou mais o acesso. Conecte de novo.');
  }
  if (!response.ok) throw new Error(`Spotify token ${response.status}`);
  return (await response.json()) as TokenResponse;
}

/** Access tokens last an hour; kept in memory per User, never stored. */
const accessTokens = new Map<string, { expiresAt: number; token: string }>();

/** The callback: trades Spotify's code for the tokens and keeps the refresh token, sealed. */
export async function finishSpotifyLink(viewer: Viewer, code: string, state: string) {
  if (!stateIsFor(state, viewer)) badInput('Esse retorno do Spotify não vale mais. Tente de novo.');
  const reason = await spotifyUnavailable(viewer);
  if (reason) badInput(reason);
  const tokens = await token({
    code,
    grant_type: 'authorization_code',
    redirect_uri: spotifyRedirectUri(),
  });
  if (!tokens.refresh_token) throw new Error('Spotify sent no refresh token');
  const me = await fetch(`${API}/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = me.ok ? ((await me.json()) as { display_name?: string | null }) : null;
  const row = {
    error: null,
    name: profile?.display_name ?? null,
    organizationId: viewer.organizationId,
    sealedRefreshToken: seal(tokens.refresh_token, 'spotify-token'),
    updatedAt: new Date(),
  };
  await db
    .insert(schema.spotifyLink)
    .values({ ...row, userId: viewer.userId })
    .onConflictDoUpdate({ set: row, target: schema.spotifyLink.userId });
  accessTokens.set(viewer.userId, {
    expiresAt: Date.now() + (tokens.expires_in - 60) * 1000,
    token: tokens.access_token,
  });
}

/** This User's link in the Organization they are signed in to. */
async function linkOf(viewer: Viewer) {
  const [link] = await db
    .select()
    .from(schema.spotifyLink)
    .where(eq(schema.spotifyLink.userId, viewer.userId));
  return link && link.organizationId === viewer.organizationId ? link : null;
}

export async function spotifyLinkOf(viewer: Viewer) {
  const link = await linkOf(viewer);
  return link ? { error: link.error, name: link.name } : null;
}

export async function unlinkSpotify(viewer: Viewer) {
  accessTokens.delete(viewer.userId);
  await db.delete(schema.spotifyLink).where(eq(schema.spotifyLink.userId, viewer.userId));
}

async function accessToken(link: NonNullable<Awaited<ReturnType<typeof linkOf>>>) {
  const cached = accessTokens.get(link.userId);
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const tokens = await token({
    grant_type: 'refresh_token',
    refresh_token: open(link.sealedRefreshToken, 'spotify-token'),
  });
  // Spotify may hand a new refresh token over; the old one then stops working.
  if (tokens.refresh_token) {
    await db
      .update(schema.spotifyLink)
      .set({
        sealedRefreshToken: seal(tokens.refresh_token, 'spotify-token'),
        updatedAt: new Date(),
      })
      .where(eq(schema.spotifyLink.userId, link.userId));
  }
  accessTokens.set(link.userId, {
    expiresAt: Date.now() + (tokens.expires_in - 60) * 1000,
    token: tokens.access_token,
  });
  return tokens.access_token;
}

interface SpotifyTrack {
  album?: { images?: { url: string; width?: number | null }[] };
  artists?: { name: string }[];
  external_urls?: { spotify?: string };
  name: string;
  show?: { images?: { url: string; width?: number | null }[]; name: string };
}

function trackOf(item: SpotifyTrack, playedAt: string | null): MusicTrack {
  // The smallest picture that is still at least 64px, for the card's square.
  const images = [...(item.album?.images ?? item.show?.images ?? [])].sort(
    (a, b) => (a.width ?? 0) - (b.width ?? 0)
  );
  const image = images.find(picture => (picture.width ?? 0) >= 64) ?? images.at(-1);
  return {
    artists: item.artists?.map(artist => artist.name).join(', ') || item.show?.name || '',
    imageUrl: image?.url ?? null,
    playedAt: playedAt ? new Date(playedAt) : null,
    title: item.name,
    url: item.external_urls?.spotify ?? null,
  };
}

/** What is playing now and the last five heard; `null` when the User has no link. */
export async function music(viewer: Viewer): Promise<Music | null> {
  const link = await linkOf(viewer);
  if (!link) return null;
  try {
    const bearer = { Authorization: `Bearer ${await accessToken(link)}` };
    const [now, recent] = await Promise.all([
      fetch(`${API}/me/player/currently-playing?additional_types=episode`, { headers: bearer }),
      fetch(`${API}/me/player/recently-played?limit=5`, { headers: bearer }),
    ]);
    if (now.status === 401 || recent.status === 401) {
      throw new SpotifyRefused('O Spotify não aceitou mais o acesso. Conecte de novo.');
    }
    const playing =
      now.status === 200
        ? ((await now.json()) as { is_playing?: boolean; item?: SpotifyTrack | null })
        : null;
    const heard = recent.ok
      ? ((await recent.json()) as { items?: { played_at: string; track: SpotifyTrack }[] })
      : null;
    if (link.error) {
      await db
        .update(schema.spotifyLink)
        .set({ error: null })
        .where(eq(schema.spotifyLink.userId, link.userId));
    }
    return {
      playing: playing?.is_playing && playing.item ? trackOf(playing.item, null) : null,
      recent: (heard?.items ?? []).map(item => trackOf(item.track, item.played_at)),
    };
  } catch (error) {
    if (!(error instanceof SpotifyRefused)) throw error;
    accessTokens.delete(link.userId);
    await db
      .update(schema.spotifyLink)
      .set({ error: error.message })
      .where(eq(schema.spotifyLink.userId, link.userId));
    return { playing: null, recent: [] };
  }
}
