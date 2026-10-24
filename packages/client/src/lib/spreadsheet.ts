import { isBillPayment } from '@zapbots/finance';

import { parseCents } from './format';

/** A spreadsheet as read: its first row as headers, then the rest. */
export interface Table {
  headers: string[];
  rows: unknown[][];
}

/** Which column holds each part of a Gasto; `category` is optional. */
export interface Columns {
  amount: number;
  category: number | null;
  date: number;
  description: number;
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
  /** Lines without a readable date, description or amount, left out. */
  invalid: number;
}

/** Reads a .csv, .txt or .xlsx file into a Table. */
export async function readTable(file: File): Promise<Table> {
  const rows = /\.xlsx$/i.test(file.name) ? await readXlsx(file) : parseCsv(await file.text());
  const filled = rows.filter(row => row.some(cell => cell !== null && String(cell).trim() !== ''));
  const [headers = [], ...rest] = filled;
  return { headers: headers.map(cell => String(cell ?? '').trim()), rows: rest };
}

async function readXlsx(file: File): Promise<unknown[][]> {
  const { readSheet } = await import('read-excel-file/browser');
  return (await readSheet(file)) as unknown[][];
}

/**
 * Parses CSV text: `;` or `,` between cells, whichever the first line uses most (Excel in pt-BR
 * writes `;`), quotes around cells that hold them.
 */
export function parseCsv(text: string): string[][] {
  const body = text.replace(/^﻿/, '');
  const firstLine = body.split(/\r?\n/, 1)[0] ?? '';
  const separator =
    (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
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
};

/** Guesses each part's column from the headers; a part not found is `-1` (`null` for category). */
export function guessColumns(headers: string[]): Columns {
  const taken = new Set<number>();
  const find = (part: keyof Columns) => {
    const index = headers.findIndex(
      (header, at) => !taken.has(at) && NAMES[part].some(name => normalize(header).startsWith(name))
    );
    if (index >= 0) taken.add(index);
    return index;
  };
  // The most specific first, so "Data lançamento" is a date and not a description.
  const date = find('date');
  const amount = find('amount');
  const category = find('category');
  const description = find('description');
  return { amount, category: category >= 0 ? category : null, date, description };
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
 * Fatura; a sheet of expenses only, all
 * of one sign, is taken whole.
 */
export function readExpenses(table: Table, columns: Columns): Reading {
  const parsed = table.rows.map(row => ({
    amount: readCents(row[columns.amount]),
    category: columns.category == null ? null : String(row[columns.category] ?? '').trim() || null,
    date: readDate(row[columns.date]),
    description: String(row[columns.description] ?? '').trim(),
  }));
  const usable = parsed.filter(line => line.date && line.description && line.amount);
  const statement = usable.some(line => line.amount! < 0) && usable.some(line => line.amount! > 0);
  const spent = usable.filter(line => !statement || line.amount! < 0);
  const lines = spent
    .filter(line => !statement || !isBillPayment(line.description))
    .map(line => ({
      amountCents: Math.abs(line.amount!),
      category: line.category,
      date: line.date!,
      description: line.description,
    }));
  return {
    billPayments: spent.length - lines.length,
    credits: statement ? usable.filter(line => line.amount! > 0).length : 0,
    invalid: parsed.length - usable.length,
    lines,
  };
}
