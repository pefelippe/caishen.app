import { describe, expect, it } from 'vitest';

import { foreignToBrlCents } from '../exchange';

describe('foreignToBrlCents', () => {
  it('converts at the rate and takes the 0,38% IOF off the reais', () => {
    // US$ 2.500,00 at R$ 5,40: R$ 13.500,00, less R$ 51,30 of IOF.
    expect(foreignToBrlCents(250_000, '5.40')).toBe(1_344_870);
  });

  it('takes the spread off the rate before the IOF', () => {
    // R$ 5,40 less 1% is R$ 5,346; US$ 2.500 → R$ 13.365,00, less 0,38% → R$ 13.314,21.
    expect(foreignToBrlCents(250_000, '5.40', { spread: '0.01' })).toBe(1_331_421);
  });

  it('follows another IOF when it changes', () => {
    expect(foreignToBrlCents(100_000, '5', { iof: 0 })).toBe(500_000);
  });
});
