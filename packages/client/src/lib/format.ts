const brl = new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' });
const percent = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'percent',
});

export const formatCents = (cents: number | null | undefined) =>
  cents == null ? '—' : brl.format(cents / 100);

const usd = new Intl.NumberFormat('pt-BR', { currency: 'USD', style: 'currency' });

/** Dollar cents as "US$ 2.500,00". */
export const formatDollars = (cents: number | null | undefined) =>
  cents == null ? '—' : usd.format(cents / 100);

export const formatPercent = (ratio: number | null | undefined) =>
  ratio == null ? '—' : percent.format(ratio);

export const formatDate = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';

/** Parses a pt-BR money string ("1.234,56" or "1234.56") into cents; `null` if empty/invalid. */
export function parseCents(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const bare = trimmed.replace(/[^\d.,-]/g, '');
  // With a comma, dots group thousands ("1.234,56"). Without one they still do when every group
  // after the first has three digits ("25.000"); otherwise the dot is a decimal point ("1234.56").
  const groupsThousands = bare.includes(',') || /^-?\d{1,3}(\.\d{3})+$/.test(bare);
  const digits = groupsThousands ? bare.replace(/\./g, '').replace(',', '.') : bare;
  // Text with no digits is no amount at all, not zero.
  if (!/\d/.test(digits)) return null;
  const value = Number(digits);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/** Parses a pt-BR percentage ("1,89") into a fraction (0.0189). */
export function parsePercent(input: string): number | null {
  const trimmed = input.replace(/[%\s]/g, '');
  const value = Number(trimmed.replace(',', '.'));
  return trimmed && Number.isFinite(value) ? value / 100 : null;
}
