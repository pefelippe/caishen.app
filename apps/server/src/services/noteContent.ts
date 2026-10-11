import * as Y from 'yjs';

/** The fragment Tiptap's Collaboration extension reads (its default `field`). */
const FIELD = 'default';

/**
 * Encodes plain text as the Yjs state the collaborative editor expects: one `paragraph` element
 * per line, the same shape y-prosemirror writes for unformatted paragraphs.
 */
export function textToNoteContent(text: string): Uint8Array {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment(FIELD);
  const paragraphs = text.split(/\r?\n/).map(line => {
    const paragraph = new Y.XmlElement('paragraph');
    if (line) paragraph.insert(0, [new Y.XmlText(line)]);
    return paragraph;
  });
  fragment.insert(0, paragraphs);
  return Y.encodeStateAsUpdate(doc);
}

function textOf(node: Y.XmlElement | Y.XmlFragment | Y.XmlText): string {
  if (node instanceof Y.XmlText) {
    return (node.toDelta() as { insert?: unknown }[])
      .map(part => (typeof part.insert === 'string' ? part.insert : ''))
      .join('');
  }
  const children = node.toArray();
  // An element holding text is inline content (a paragraph); anything else stacks blocks.
  const inline = children.some(child => child instanceof Y.XmlText);
  return children
    .map(child => (child instanceof Y.XmlHook ? '' : textOf(child)))
    .join(inline ? '' : '\n');
}

/** The plain text of a Note's Yjs state; empty when the Note was never edited. */
export function noteContentToText(content: Uint8Array | null): string {
  if (!content?.length) return '';
  const doc = new Y.Doc();
  Y.applyUpdate(doc, content);
  return textOf(doc.getXmlFragment(FIELD))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
