import { useMutation, useQuery } from '@apollo/client/react';
import {
  HomeLayoutDocument,
  SaveHomeLayoutDocument,
  type HomeCardKey,
} from '@zapbots/graphql/client';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { Fragment } from 'react';

import { BottomSheet } from '@zapbots/ui/blocks/bottom-sheet';
import { Button } from '@zapbots/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@zapbots/ui/components/dialog';
import { Switch } from '@zapbots/ui/components/switch';
import { useIsMobile } from '@zapbots/ui/hooks/use-mobile';

import { useToast } from '../components/Toaster';
import { useI18n } from '../lib/i18n';
import { DEFAULT_LAYOUT, HOME_CARDS, type CardArea } from './cards';
import { moveCard, resolveLayout, type CardSetting } from './layout';

type Layout = CardSetting<HomeCardKey>[];

/**
 * The Viewer's Página inicial: the cards in order, and how to save a new arrangement. Saving shows
 * at once and goes back, with a toast, if the server says no. `layout` is undefined while loading.
 */
export function useHomeLayout() {
  const { t } = useI18n();
  const toast = useToast();
  const { data, error } = useQuery(HomeLayoutDocument);
  const [save] = useMutation(SaveHomeLayoutDocument, {
    update: (cache, result) =>
      cache.writeQuery({
        data: { homeLayout: result.data?.saveHomeLayout ?? null },
        query: HomeLayoutDocument,
      }),
  });

  const layout = data || error ? resolveLayout(data?.homeLayout, DEFAULT_LAYOUT) : undefined;

  const change = (cards: Layout | null) => {
    const sent = cards?.map(({ hidden, key }) => ({ hidden, key })) ?? null;
    void save({
      optimisticResponse: {
        saveHomeLayout: sent?.map(card => ({ ...card, __typename: 'HomeCardSetting' })) ?? null,
      },
      variables: { cards: sent },
    }).catch(() => toast({ message: t('home.customize.failed'), tone: 'error' }));
  };

  return { change, layout };
}

const AREAS: CardArea[] = ['finance', 'personal', 'general'];

/** The cards, each with a switch and arrows to move it, under the name of its area. */
function CardList({ layout, onChange }: { layout: Layout; onChange: (cards: Layout) => void }) {
  const { t } = useI18n();
  return (
    <ul className="flex flex-col">
      {layout.map((card, index) => {
        const { area, title } = HOME_CARDS[card.key];
        const name = t(title);
        const areaChanged = index === 0 || HOME_CARDS[layout[index - 1]!.key].area !== area;
        return (
          <Fragment key={card.key}>
            {areaChanged && AREAS.includes(area) && (
              <li className="pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase first:pt-0">
                {t(`home.area.${area}`)}
              </li>
            )}
            <li className="flex items-center gap-2 py-1.5">
              <Switch
                aria-label={name}
                checked={!card.hidden}
                id={`home-card-${card.key}`}
                onCheckedChange={checked =>
                  onChange(
                    layout.map(other =>
                      other.key === card.key ? { ...other, hidden: !checked } : other
                    )
                  )
                }
              />
              <label
                className="min-w-0 flex-1 cursor-pointer truncate text-sm"
                htmlFor={`home-card-${card.key}`}
              >
                {name}
              </label>
              <Button
                aria-label={t('home.customize.up', { card: name })}
                disabled={index === 0}
                onClick={() => onChange(moveCard(layout, index, -1))}
                size="icon"
                variant="ghost"
              >
                <ArrowUpIcon />
              </Button>
              <Button
                aria-label={t('home.customize.down', { card: name })}
                disabled={index === layout.length - 1}
                onClick={() => onChange(moveCard(layout, index, 1))}
                size="icon"
                variant="ghost"
              >
                <ArrowDownIcon />
              </Button>
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}

/** Personalizar: a dialog on a wide screen, a sheet from the bottom on a phone. */
export function CustomizeHome({
  layout,
  onChange,
  onOpenChange,
  open,
}: {
  layout: Layout;
  onChange: (cards: Layout | null) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { t } = useI18n();
  const mobile = useIsMobile();
  const list = <CardList layout={layout} onChange={onChange} />;
  const reset = (
    <Button onClick={() => onChange(null)} variant="ghost">
      {t('home.customize.reset')}
    </Button>
  );

  if (mobile)
    return (
      <BottomSheet onOpenChange={onOpenChange} open={open} title={t('home.customize')}>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <p className="text-sm text-muted-foreground">{t('home.customize.description')}</p>
          {list}
          {reset}
        </div>
      </BottomSheet>
    );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('home.customize')}</DialogTitle>
          <DialogDescription>{t('home.customize.description')}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">{list}</div>
        <DialogFooter className="sm:justify-between">
          {reset}
          <Button onClick={() => onOpenChange(false)}>{t('home.customize.done')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
