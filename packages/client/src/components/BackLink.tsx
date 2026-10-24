import { ChevronLeftIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@zapbots/ui/components/button';

/** "← Parent" link above a page title. */
export function BackLink({ children, to }: { children: ReactNode; to: string }) {
  return (
    <Button asChild className="h-auto px-0 text-muted-foreground" size="sm" variant="link">
      <Link to={to}>
        <ChevronLeftIcon />
        {children}
      </Link>
    </Button>
  );
}
