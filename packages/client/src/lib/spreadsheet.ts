import { importedCategory, isBillPayment, isInvestmentMove, isOwnTransfer } from '@zapbots/finance';

import { parseCents } from './format';

/** A spreadsheet as read: its first row as headers, then the rest. */
export interface Table {
  headers: string[];
  rows: unknown[][];
}

/**
 * Which column holds each part of a Gasto; `category` and `kind` are optional. `kind` is what the
 * bank calls the line ("Pix enviado", "Compra no débito", "Aplicação"), beside its description.
 */
export interface Columns {
  amount: number;
  category: number | null;
  date: number;
  description: number;
  kind: number | null;
}

/** A Gasto read from one line, ready for `importExpenses`. */
export interface ExpenseLine {
  amountCents: number;
  category: string | null;
  date: string;
  description: string;
  /** The line's key at its source (an OFX FITID, an Open Finance id), so importing again adds nothing. */
  externalId?: string;
}

export interface Reading {
  lines: ExpenseLine[];
  /** Lines that were money coming in (in a statement with both signs), left out. */
  credits: number;
  /** Payments of a Cartão's Fatura, left out: the Fatura is counted already. */
  billPayments: number;
  /** Money moved to or from the Titular's investments (a CDB, a caixinha), left out. */
  investments: number;
  /** Money the Titular sent to an account of their own, left out: it is spent from there. */
  ownTransfers: number;
  /** Lines without a readable date, description or amount, left out. */
  invalid: number;
}

/** Reads a .csv, .txt or .xlsx file into a Table. */
export async function readTable(file: File): Promise<Table> {
  const rows = /\.xlsx$/i.test(file.name) ? await readXlsx(file) : parseCsv(await file.text());
  return toTable(rows);
}

/**
 * The rows as a Table. Banks put a title, the account and the period above the statement, so the
 * header is the row among the first ones that names the most parts of a Gasto (the first row when
 * none names any), and what is above it is left out.
 */
export function toTable(rows: unknown[][]): Table {
  const filled = rows.filter(row => row.some(cell => cell !== null && String(cell).trim() !== ''));
  const texts = (row: unknown[]) => row.map(cell => String(cell ?? '').trim());
  let at = 0;
  let best = 0;
  filled.slice(0, 30).forEach((row, index) => {
    const columns = guessColumns(texts(row));
    const named =
      [columns.date, columns.amount, columns.description].filter(column => column >= 0).length +
      (columns.category == null ? 0 : 1);
    if (named > best) {
      best = named;
      at = index;
    }
  });
  return { headers: texts(filled[at] ?? []), rows: filled.slice(at + 1) };
}

async function readXlsx(file: File): Promise<unknown[][]> {
  const { readSheet } = await import('read-excel-file/browser');
  return (await readSheet(file)) as unknown[][];
}

/**
 * Parses CSV text: `;` or `,` between cells, whichever the first lines use most (Excel in pt-BR
 * writes `;`; a bank's title line may have neither), quotes around cells that hold them.
 */
export function parseCsv(text: string): string[][] {
  const body = text.replace(/^﻿/, '');
  const head = body.split(/\r?\n/, 20).join('\n');
  const separator = (head.match(/;/g)?.length ?? 0) >= (head.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < body.length; index++) {
    const char = body[index]!;
    if (quoted) {
      if (char === '"' && body[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === separator) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && body[index + 1] === '\n') index++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Header words that name each part, as banks and budget sheets write them. */
const NAMES: Record<keyof Columns, string[]> = {
  amount: ['valor', 'amount', 'value', 'quantia', 'total', 'preco', 'debito', 'montante'],
  category: ['categoria', 'category', 'tipo', 'grupo', 'classificacao'],
  date: ['data', 'date', 'dia', 'vencimento', 'lancamento em'],
  description: [
    'descricao',
    'description',
    'historico',
    'estabelecimento',
    'lancamento',
    'titulo',
    'nome',
    'item',
    'detalhe',
  ],
  kind: ['historico', 'tipo de transacao', 'tipo de lancamento', 'natureza', 'lancamento'],
};

/**
 * Guesses each part's column from the headers; a part not found is `-1` (`null` for category).
 * Names earlier in `NAMES` win, so beside "Histórico" the description is "Descrição".
 */
export function guessColumns(headers: string[]): Columns {
  const taken = new Set<number>();
  const find = (part: keyof Columns) => {
    for (const name of NAMES[part]) {
      const index = headers.findIndex(
        (header, at) => !taken.has(at) && normalize(header).startsWith(name)
      );
      if (index >= 0) {
        taken.add(index);
        return index;
      }
    }
    return -1;
  };
  // The most specific first, so "Data lançamento" is a date and not a description; the kind
  // last, so a sheet with only "Histórico" takes it as the description.
  const date = find('date');
  const amount = find('amount');
  const category = find('category');
  const description = find('description');
  const kind = find('kind');
  return {
    amount,
    category: category >= 0 ? category : null,
    date,
    description,
    kind: kind >= 0 ? kind : null,
  };
}

/** "2026-10-21" from a Date cell, "21/10/2026", "21/10/26", "2026-10-21" or "21-10-2026". */
export function readDate(cell: unknown): string | null {
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    return cell.toISOString().slice(0, 10);
  }
  const text = String(cell ?? '').trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return valid(`${iso[1]}-${iso[2]}-${iso[3]}`);
  const local = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (!local) return null;
  const year = local[3]!.length === 2 ? `20${local[3]}` : local[3]!;
  return valid(`${year}-${local[2]!.padStart(2, '0')}-${local[1]!.padStart(2, '0')}`);
}

const valid = (iso: string) => {
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : null;
};

/** Signed cents from a number cell or a money text; "(45,90)" is negative, as accountants write. */
export function readCents(cell: unknown): number | null {
  if (typeof cell === 'number') return Number.isFinite(cell) ? Math.round(cell * 100) : null;
  const text = String(cell ?? '').trim();
  const negative = /^\(.*\)$/.test(text) || /^-|-$|\dD$/i.test(text.replace(/\s/g, ''));
  const cents = parseCents(text.replace(/[()]/g, '').replace(/-$/, ''));
  if (cents == null) return null;
  return negative ? -Math.abs(cents) : cents;
}

/**
 * The Gastos in a Table. In a bank statement, with money in and out, only the negative lines are
 * Gastos and the positive ones (salary, transfers in) are left out, and so are the payments of a
 * Fatura; a sheet of expenses only, all of one sign, is taken whole. Money moved to the Titular's
 * own investments, or to an account of their own (`owner` is their name), is never a Gasto. A line
 * without a description takes its kind's; a Pix with no category is filed under "Pix".
 */
export function readExpenses(table: Table, columns: Columns, owner = ''): Reading {
  const cell = (row: unknown[], column: number | null) =>
    column == null || column < 0 ? '' : String(row[column] ?? '').trim();
  const parsed = table.rows.map(row => {
    const kind = cell(row, columns.kind);
    const description = cell(row, columns.description) || kind;
    // What the bank says the line is, and to whom: "Aplicação" + "Cdb Porq…", "Pix enviado" + a name.
    const said = `${kind} ${description}`;
    return {
      amount: readCents(row[columns.amount]),
      category: cell(row, columns.category) || importedCategory(said),
      date: readDate(row[columns.date]),
      description,
      said,
    };
  });
  const usable = parsed.filter(line => line.date && line.description && line.amount);
  const statement = usable.some(line => line.amount! < 0) && usable.some(line => line.amount! > 0);
  const spent = usable.filter(line => !statement || line.amount! < 0);
  const invested = spent.filter(line => !isInvestmentMove(line.said));
  const kept = invested.filter(line => !owner || !isOwnTransfer(line.description, owner));
  const lines = kept
    .filter(line => !statement || !isBillPayment(line.said))
    .map(line => ({
      amountCents: Math.abs(line.amount!),
      category: line.category,
      date: line.date!,
      description: line.description,
    }));
  return {
    billPayments: kept.length - lines.length,
    credits: statement ? usable.filter(line => line.amount! > 0).length : 0,
    invalid: parsed.length - usable.length,
    investments: spent.length - invested.length,
    lines,
    ownTransfers: invested.length - kept.length,
  };
}
