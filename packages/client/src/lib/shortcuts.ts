/** Whether this is a Mac, where shortcuts take ⌘ in place of Ctrl. */
export const isMac =
  typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);

/** A ⌘/Ctrl shortcut as this device writes it: `⌘K` on a Mac, `Ctrl K` elsewhere. */
export function shortcut(key: string): string {
  return isMac ? `⌘${key}` : `Ctrl ${key}`;
}

/** Whether `event` is ⌘ (Ctrl elsewhere) with `key`, and nothing else held. */
export function isShortcut(event: KeyboardEvent, key: string): boolean {
  return (
    event.key.toLowerCase() === key.toLowerCase() &&
    (isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey) &&
    !event.altKey &&
    !event.shiftKey
  );
}

/**
 * Whether the User is typing in a field, where the app's shortcuts stay out of the way (⌘B is bold
 * in a document, not the menu).
 */
export function isTyping(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement &&
      !['button', 'checkbox', 'radio', 'range', 'reset', 'submit'].includes(target.type))
  );
}
