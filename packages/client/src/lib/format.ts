const brl = new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' });
const percent = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'percent',
});

export const formatCents = (cents: number | null | undefined) =>
  cents == null ? '—' : brl.format(cents / 100);

export const formatPercent = (ratio: number | null | undefined) =>
  ratio == null ? '—' : percent.format(ratio);

export const formatDate = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';

/** Parses a pt-BR money string ("1.234,56" or "1234.56") into cents; `null` if empty/invalid. */
export function parseCents(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed;
  const value = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/** Parses a pt-BR percentage ("1,89") into a fraction (0.0189). */
export function parsePercent(input: string): number | null {
  const value = Number(input.trim().replace(',', '.'));
  return input.trim() && Number.isFinite(value) ? value / 100 : null;
}
