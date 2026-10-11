import type { BuddyArea } from '@mny/graphql/client';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { AREAS } from '../lib/areas';
import { BuddyGlyph } from './BuddyGlyph';
import { BuddyPanel } from './BuddyPanel';

interface Props {
  actions?: ReactNode;
  area: BuddyArea;
  children: ReactNode;
  description?: ReactNode;
  /** Shown above the title, e.g. a BackLink. */
  eyebrow?: ReactNode;
  suggestions?: string[];
  title: ReactNode;
}

/**
 * The frame of every Area screen: the content on the left and the Area's Buddy on the right. On
 * narrower screens the Buddy moves into a sheet opened from the header.
 */
export function AreaPage({
  actions,
  area,
  children,
  description,
  eyebrow,
  suggestions,
  title,
}: Props) {
  return (
    <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_21rem]" data-area={area}>
      <div className="flex min-w-0 flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            {eyebrow}
            <h1>{title}</h1>
            {description && <p className="mt-1 max-w-prose text-muted-foreground">{description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            <Sheet>
              <SheetTrigger asChild>
                <Button className="xl:hidden" variant="outline">
                  <BuddyGlyph area={area} size={18} />
                  Buddy
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full gap-0 p-5 sm:max-w-md">
                <SheetTitle className="sr-only">Buddy de {AREAS[area].label}</SheetTitle>
                <BuddyPanel area={area} className="h-full" suggestions={suggestions} />
              </SheetContent>
            </Sheet>
          </div>
        </header>
        {children}
      </div>
      <aside className="hidden xl:block">
        <BuddyPanel
          area={area}
          className="sticky top-8 h-[calc(100svh-4rem)]"
          suggestions={suggestions}
        />
      </aside>
    </div>
  );
}
