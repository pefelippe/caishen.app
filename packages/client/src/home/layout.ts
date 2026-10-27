/** One card as the Página inicial lays it out: which, and whether the User hid it. */
export interface CardSetting<Key extends string = string> {
  hidden: boolean;
  key: Key;
}

/**
 * The cards in the order to show them: the User's saved order, without cards the app no longer
 * has, and with cards added since then in their default place (after the card that comes before
 * them by default). Without a saved layout, the default.
 */
export function resolveLayout<Key extends string>(
  saved: readonly CardSetting[] | null | undefined,
  defaults: readonly CardSetting<Key>[]
): CardSetting<Key>[] {
  if (!saved) return defaults.map(card => ({ ...card }));
  const known = new Map(defaults.map(card => [card.key as string, card]));
  const layout: CardSetting<Key>[] = [];
  for (const card of saved) {
    const match = known.get(card.key);
    if (!match || layout.some(placed => placed.key === match.key)) continue;
    layout.push({ hidden: card.hidden, key: match.key });
  }
  defaults.forEach((card, index) => {
    if (layout.some(placed => placed.key === card.key)) return;
    const before = defaults[index - 1]?.key;
    const at = before === undefined ? 0 : layout.findIndex(placed => placed.key === before) + 1;
    layout.splice(at, 0, { ...card });
  });
  return layout;
}

/** The layout with the card at `index` moved one place up (-1) or down (+1). */
export function moveCard<T>(layout: readonly T[], index: number, by: -1 | 1): T[] {
  const to = index + by;
  if (to < 0 || to >= layout.length) return [...layout];
  const moved = [...layout];
  [moved[index], moved[to]] = [moved[to]!, moved[index]!];
  return moved;
}
