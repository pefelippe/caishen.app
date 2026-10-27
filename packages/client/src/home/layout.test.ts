import { describe, expect, it } from 'vitest';

import { moveCard, resolveLayout } from './layout';

const DEFAULTS = [
  { hidden: false, key: 'MARKET' },
  { hidden: false, key: 'OVERVIEW' },
  { hidden: false, key: 'MONTH' },
  { hidden: true, key: 'NOTES' },
];

describe('resolveLayout', () => {
  it('is the default without a saved layout', () => {
    expect(resolveLayout(null, DEFAULTS)).toEqual(DEFAULTS);
  });

  it('keeps the saved order, drops cards gone and repeated', () => {
    const saved = [
      { hidden: true, key: 'MONTH' },
      { hidden: false, key: 'GONE' },
      { hidden: false, key: 'MARKET' },
      { hidden: false, key: 'MONTH' },
      { hidden: false, key: 'OVERVIEW' },
      { hidden: false, key: 'NOTES' },
    ];
    expect(resolveLayout(saved, DEFAULTS)).toEqual([
      { hidden: true, key: 'MONTH' },
      { hidden: false, key: 'MARKET' },
      { hidden: false, key: 'OVERVIEW' },
      { hidden: false, key: 'NOTES' },
    ]);
  });

  it('puts a card new to the app after the one before it by default', () => {
    const saved = [
      { hidden: false, key: 'MONTH' },
      { hidden: false, key: 'MARKET' },
    ];
    expect(resolveLayout(saved, DEFAULTS).map(card => card.key)).toEqual([
      'MONTH',
      'NOTES',
      'MARKET',
      'OVERVIEW',
    ]);
  });

  it('puts a new first card first', () => {
    expect(resolveLayout([{ hidden: false, key: 'OVERVIEW' }], DEFAULTS)[0]!.key).toBe('MARKET');
  });
});

describe('moveCard', () => {
  it('swaps with the neighbour and stays put at the ends', () => {
    expect(moveCard(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveCard(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });
});
