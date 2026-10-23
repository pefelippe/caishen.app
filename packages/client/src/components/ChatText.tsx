import type { ReactNode } from 'react';

/** **bold** inside a line, as React nodes; nothing else is read as markup. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong className="font-semibold" key={index}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;
const HEADING = /^\s*#{1,4}\s+/;

/**
 * A Bot's reply with the little Markdown Models write anyway (bold, lists, headings), drawn as
 * text: no HTML from the Model ever reaches the page.
 */
export function ChatText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split('\n');
  for (let index = 0; index < lines.length;) {
    const line = lines[index]!;
    if (!line.trim()) {
      index++;
      continue;
    }
    if (BULLET.test(line) || NUMBERED.test(line)) {
      const numbered = NUMBERED.test(line);
      const pattern = numbered ? NUMBERED : BULLET;
      const items: string[] = [];
      while (index < lines.length && pattern.test(lines[index]!)) {
        items.push(lines[index]!.replace(pattern, ''));
        index++;
      }
      const List = numbered ? 'ol' : 'ul';
      blocks.push(
        <List className={numbered ? 'list-decimal pl-5' : 'list-disc pl-5'} key={blocks.length}>
          {items.map((item, at) => (
            <li key={at}>{inline(item)}</li>
          ))}
        </List>
      );
      continue;
    }
    if (HEADING.test(line)) {
      blocks.push(
        <p className="font-semibold" key={blocks.length}>
          {inline(line.replace(HEADING, ''))}
        </p>
      );
      index++;
      continue;
    }
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index]!.trim() &&
      !BULLET.test(lines[index]!) &&
      !NUMBERED.test(lines[index]!) &&
      !HEADING.test(lines[index]!)
    ) {
      paragraph.push(lines[index]!);
      index++;
    }
    blocks.push(
      <p key={blocks.length}>
        {paragraph.map((part, at) => (
          <span key={at}>
            {at > 0 && <br />}
            {inline(part)}
          </span>
        ))}
      </p>
    );
  }
  return <div className="flex min-w-0 flex-col gap-2 leading-relaxed">{blocks}</div>;
}
