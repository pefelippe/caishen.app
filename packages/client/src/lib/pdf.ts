import type { Table } from './spreadsheet';

/** Why a PDF could not be read, in the User's words. */
export class PdfError extends Error {}

/**
 * A bank statement in PDF read into the Table a spreadsheet becomes (Data, Descrição, Valor), so it
 * goes through the same columns and rules. Only PDFs with text: a scan or a photo has none.
 */
export async function readPdfTable(file: File): Promise<Table> {
  const lines = await readPdfLines(file);
  const table = statementTable(lines);
  if (!lines.length) throw new PdfError('Esse PDF não tem texto (é uma imagem ou um escaneado).');
  if (!table.rows.length) throw new PdfError('Não achamos lançamentos com data e valor nesse PDF.');
  return table;
}

/** The PDF's text, line by line in reading order: pieces on the same height make one line. */
async function readPdfLines(file: File): Promise<string[]> {
  const { getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer())).catch(
    (error: unknown) => {
      if (error instanceof Error && error.name === 'PasswordException') {
        throw new PdfError('Esse PDF tem senha. Baixe o extrato de novo sem senha e importe.');
      }
      throw error;
    }
  );
  const lines: string[] = [];
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    const { items } = await page.getTextContent();
    const rows: { pieces: { text: string; x: number }[]; y: number }[] = [];
    for (const item of items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const [x, y] = [item.transform[4] as number, item.transform[5] as number];
      let row = rows.find(each => Math.abs(each.y - y) <= 2);
      if (!row) rows.push((row = { pieces: [], y }));
      row.pieces.push({ text: item.str.trim(), x });
    }
    rows.sort((a, b) => b.y - a.y);
    for (const row of rows) {
      lines.push(
        row.pieces
          .sort((a, b) => a.x - b.x)
          .map(piece => piece.text)
          .join(' ')
      );
    }
  }
  return lines;
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-10-22" from a date opening a line ("22/10/2026", "01 OUT 2024", "1 de Outubro de 2026"). */
function leadingDate(line: string): { iso: string; rest: string } | null {
  const plain = line
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  const iso = (day: string, month: number, year: string) => {
    const full = year.length === 2 ? `20${year}` : year;
    return `${full}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`;
  };
  const numeric = plain.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?!\d)/);
  if (numeric) {
    return {
      iso: iso(numeric[1]!, Number(numeric[2]), numeric[3]!),
      rest: line.slice(numeric[0].length),
    };
  }
  const named = plain.match(/^(\d{1,2})\s+(?:de\s+)?([a-z]{3})[a-z]*\.?\s+(?:de\s+)?(\d{4})\b/);
  const month = named ? MONTHS.indexOf(named[2]!) + 1 : 0;
  if (named && month)
    return { iso: iso(named[1]!, month, named[3]!), rest: line.slice(named[0].length) };
  return null;
}

/** A sum of money in a line: "-982,92", "- R$ 50,00", "R$ -50,00", "1.234,56 D", "+ 1.000,00". */
const MONEY =
  /(?<![\d.,])([-+−]\s?)?(?:R\$\s?)?([-+−]\s?)?(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?:\s?([DC])(?![a-z]))?(?![\d,])/gi;

/** Lines that are not a movement: the day's balance, a section's total, the statement's headings. */
const NOT_A_LINE = /\b(saldo|total|subtotal|limite)\b/i;

/**
 * The movements in a statement's lines. A line opening with a date starts that date's lines (some
 * banks write it only once a day); the first sum in a line is its amount, a second one the balance
 * after it. A sum with no sign of its own takes its section's ("Total de saídas" makes the lines
 * under it go out). Where a movement does not open with its date, a line with no sum below it goes
 * on its description, as Nubank breaks a Pix into its kind and its receiver.
 */
export function statementTable(lines: string[]): Table {
  const rows: string[][] = [];
  let date: string | null = null;
  let sign = 0;
  let last: string[] | null = null;
  let carried = 0;
  // Whether the last movement opened with its own date, as every one of Itaú's does.
  let dated = false;
  for (const line of lines) {
    const opened = leadingDate(line.trim());
    if (opened) date = opened.iso;
    const rest = (opened?.rest ?? line).trim();
    if (/total de sa[ií]das|sa[ií]das?\b.*total/i.test(rest)) sign = -1;
    else if (/total de entradas|entradas?\b.*total/i.test(rest)) sign = 1;
    const sums = [...rest.matchAll(MONEY)];
    if (NOT_A_LINE.test(rest) || !date) {
      last = null;
      continue;
    }
    if (!sums.length) {
      // The next line of the one above: who got the Pix, the account it went to.
      if (last && !dated && carried < 2 && rest.length <= 120 && !opened) {
        last[1] = `${last[1]} ${rest}`.trim();
        carried += 1;
      } else last = null;
      continue;
    }
    const sum = sums[0]!;
    const marks = `${sum[1] ?? ''}${sum[2] ?? ''}${sum[5] ?? ''}`.replace(/\s/g, '');
    const negative = /[-−d]/i.test(marks) || (!marks && sign < 0);
    const description = rest
      .slice(0, sum.index)
      .trim()
      .replace(/R\$$/, '')
      .trim()
      // Itaú glues the day the Pix was made to the receiver: "PEDRO F22/10".
      .replace(/(\d{2}\/\d{2})$/, '')
      .replace(/["“”]/g, '')
      .trim();
    const amount = `${negative ? '-' : ''}${sum[3]},${sum[4]}`;
    last = [date, description, amount];
    carried = 0;
    dated = !!opened;
    rows.push(last);
  }
  return {
    headers: ['Data', 'Descrição', 'Valor'],
    rows: rows.filter(row => row[1]),
  };
}
