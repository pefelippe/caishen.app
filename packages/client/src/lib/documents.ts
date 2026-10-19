/**
 * A Deliverable's name: the first line of its text, without Markdown marks, or the Job's
 * instructions when there is no text.
 */
export function deliverableName(text: string | null | undefined, instructions: string): string {
  const first = (text ?? '')
    .split('\n')
    .map(line =>
      line
        .replace(/^\s*(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s*)/, '')
        .replace(/[*_`]/g, '')
        .trim()
    )
    .find(Boolean);
  return first || instructions;
}

/** A name safe for a downloaded file, from the document's name. */
export function fileName(name: string): string {
  const safe = name
    .slice(0, 60)
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${safe || 'entrega'}.md`;
}

/** Saves a Deliverable's Markdown as a file. */
export function downloadMarkdown(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.download = fileName(name);
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
