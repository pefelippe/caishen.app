/**
 * Caishen design tokens — the single source of truth.
 *
 * These values are mirrored as CSS variables in `tokens.css` and as named
 * Tailwind utilities in `tailwind-preset.js`. Prefer the Tailwind classes
 * (e.g. `bg-navy`, `text-jade`, `rounded-card`) in components; import this
 * object only when you need a raw value in JS/TS.
 *
 * Rule: NEVER use purple / violet / indigo. The navy below reads as blue.
 */

export const color = {
  cream: '#FFFBF7', // app background — do not change
  ink: '#1C1917', // primary text
  navy: '#0B3D91', // brand primary (reads blue, not purple)
  jade: '#0E7C66', // accent / positive
  gold: '#C79A3A', // coin motif, used sparingly
  surface: '#FFFFFF', // cards on cream
  muted: '#F3EFE7', // warm muted panels
  subtle: '#78716C', // secondary text (stone-500)
  border: 'rgba(28, 25, 23, 0.10)', // hairline on cream
  danger: '#DC2626',
  success: '#0E7C66',
} as const;

export const font = {
  display: 'var(--font-display)', // Space Grotesk
  sans: 'var(--font-sans)', // Inter
  mono: 'var(--font-mono)', // JetBrains Mono
} as const;

/** Type scale — size / line-height pairs. */
export const fontSize = {
  xs: ['0.75rem', '1rem'],
  sm: ['0.875rem', '1.25rem'],
  base: ['1rem', '1.5rem'],
  lg: ['1.125rem', '1.6'],
  xl: ['1.25rem', '1.4'],
  '2xl': ['1.5rem', '1.3'],
  '3xl': ['1.875rem', '1.2'],
  '4xl': ['2.25rem', '1.1'],
  '5xl': ['3rem', '1'],
  '6xl': ['3.75rem', '0.98'],
} as const;

/** Radius scale. `card` and `pill` are the two we reach for most. */
export const radius = {
  sm: '0.5rem',
  md: '0.75rem',
  card: '1rem',
  xl: '1.5rem',
  '2xl': '1.75rem',
  pill: '9999px',
} as const;

/** Spacing rhythm. `gutter` = page side padding, `section` = vertical block. */
export const spacing = {
  gutter: '1.25rem', // px-5
  section: '6rem', // py-24 block rhythm
  card: '2rem', // p-8 default card padding
} as const;

export const shadow = {
  card: '0 1px 2px rgba(28, 25, 23, 0.06)',
  lg: '0 12px 32px -8px rgba(28, 25, 23, 0.14)',
  xl: '0 24px 60px -12px rgba(11, 61, 145, 0.20)',
} as const;

export const tokens = { color, font, fontSize, radius, spacing, shadow } as const;
export type Tokens = typeof tokens;
