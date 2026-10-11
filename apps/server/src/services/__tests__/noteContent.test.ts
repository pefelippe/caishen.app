import { describe, expect, it } from 'vitest';

import { noteContentToText, textToNoteContent } from '../noteContent';

describe('note content', () => {
  it('round-trips plain paragraphs', () => {
    const text = 'Primeira linha\nSegunda linha';
    expect(noteContentToText(textToNoteContent(text))).toBe(text);
  });

  it('keeps a blank line between paragraphs', () => {
    expect(noteContentToText(textToNoteContent('Um\n\nDois'))).toBe('Um\n\nDois');
  });

  it('reads a Note that was never edited as empty', () => {
    expect(noteContentToText(null)).toBe('');
  });
});
