import { useQuery } from '@apollo/client/react';
import { HomeMusicDocument, type HomeMusicQuery } from '@zapbots/graphql/client';
import { MusicIcon } from 'lucide-react';

import { useI18n } from '../lib/i18n';
import { Empty, Lines, Panel } from './panel';

type Track = NonNullable<HomeMusicQuery['music']>['recent'][number];

function TrackLine({ now, track }: { now?: boolean; track: Omit<Track, 'playedAt'> }) {
  const { t } = useI18n();
  const body = (
    <>
      {track.imageUrl ? (
        <img
          alt=""
          className="size-10 shrink-0 rounded-md bg-muted object-cover"
          src={track.imageUrl}
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <MusicIcon className="size-4 text-muted-foreground" />
        </span>
      )}
      <span className="grid min-w-0 text-sm">
        <span className="truncate font-medium">{track.title}</span>
        <span className="truncate text-muted-foreground">
          {now ? `${t('home.music.now')} · ` : ''}
          {track.artists}
        </span>
      </span>
    </>
  );
  return track.url ? (
    <a
      className="flex items-center gap-3 hover:text-primary"
      href={track.url}
      rel="noreferrer"
      target="_blank"
    >
      {body}
    </a>
  ) : (
    <div className="flex items-center gap-3">{body}</div>
  );
}

/** Música: what Spotify is playing now and the last songs heard (docs/adr/0032). */
export function MusicCard() {
  const { t } = useI18n();
  const { data, loading } = useQuery(HomeMusicDocument, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  });
  const music = data?.music;
  return (
    <Panel
      link={{ label: t('home.music.open'), to: '/integrations#spotify' }}
      title={t('home.card.music')}
    >
      {!data && loading ? (
        <Lines count={3} />
      ) : !music ? (
        <Empty>{t('home.music.unlinked')}</Empty>
      ) : !music.playing && music.recent.length === 0 ? (
        <Empty>{t('home.music.empty')}</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {music.playing && (
            <li>
              <TrackLine now track={music.playing} />
            </li>
          )}
          {music.recent.slice(0, music.playing ? 3 : 4).map(track => (
            <li key={`${track.title}-${track.playedAt}`}>
              <TrackLine track={track} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
