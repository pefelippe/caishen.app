import type { LucideIcon } from 'lucide-react';
import { forwardRef, type SVGProps } from 'react';

import { cn } from '@/lib/utils';

/** The three blocks of the Caishen's "C"; `index.html` and `public/logo.svg` repeat them. */
export const LOGO_PATH =
  'M2 0L9.09 3.7V26.3L2 30V0ZM10.9 0H20.6L27.67 3.7V7.1H10.9V0ZM10.9 22.9H27.67V26.3L20.6 30H10.9V22.9Z';

/**
 * The mark shaped like a lucide icon, so it fits wherever a Bot's icon goes (its tile, its avatar
 * in the chat, the menu): sized by `className` or `style`, in the current text color.
 */
export const CaishenMark = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  ({ className, strokeWidth: _, ...props }, ref) => (
    <svg
      aria-hidden
      className={cn('size-6 shrink-0', className)}
      fill="none"
      ref={ref}
      viewBox="0 0 30 30"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path clipRule="evenodd" d={LOGO_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
) as unknown as LucideIcon;

/** The Caishen's mark, in the current text color. */
export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      aria-label="Caishen"
      className={cn('shrink-0', className)}
      fill="none"
      height={size}
      role="img"
      viewBox="0 0 30 30"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path clipRule="evenodd" d={LOGO_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/** While the app loads: the mark with a bar running under it. Same look as `index.html`. */
export function Splash() {
  return (
    <div className="grid min-h-svh place-items-center bg-background" role="status">
      <div className="flex flex-col items-center gap-5 text-header dark:text-foreground">
        <Logo size={56} />
        <span className="splash-track">
          <span className="splash-bar" />
        </span>
        <span className="sr-only">Carregando</span>
      </div>
    </div>
  );
}
