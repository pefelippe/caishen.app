import * as React from "react";

export interface CoinProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * The Caishen mark — a square-holed Chinese wealth coin. Inherits color from
 * `currentColor`, so set it with `text-gold` / `text-navy` / etc.
 */
export function Coin({ size = 28, className, ...props }: CoinProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.45" />
      <rect x="39" y="39" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="6" />
    </svg>
  );
}
