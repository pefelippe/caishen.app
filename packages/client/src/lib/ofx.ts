import { importedCategory, isBillPayment, isInvestmentMove, isOwnTransfer } from '@zapbots/finance';

import { readCents, type ExpenseLine } from './spreadsheet';

/** One line of an OFX statement, its amount signed as the bank wrote it. */
export interface OfxTransaction {
  amountCents: number;
  date: string;
  description: string;
  /** Unique within the file and the same on every export: `ofx:<account>:<FITID>`. */
  externalId: string;
}

/** A bank account's statement (`STMTRS`) or a Cartão's (`CCSTMTRS`). */
export interface OfxStatement {
  account: string;
  kind: 'BANK' | 'CARD';
  transactions: OfxTransaction[];
}

/**
 * Decodes an .ofx file. Brazilian banks still write OFX 1.x in Windows-1252 (`CHARSET:1252`), and
 * some say UTF-8 and are not: those are read again as Windows-1252.
 */
export async function readOfxText(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 600));
  const latin = /CHARSET:\s*(1252|ISO-?8859-?1)|encoding="(windows-1252|iso-8859-1)"/i.test(head);
  if (!latin) {
    const text = new TextDecoder('utf-8').decode(bytes);
    if (!text.includes('�')) return text;
  }
  return new TextDecoder('windows-1252').decode(bytes);
}

/** The value of a leaf tag: in OFX 1.x (SGML) it runs to the next tag or line, unclosed. */
const leaf = (block: string, tag: string) =>
  block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, 'i'))?.[1]?.trim() || null;

/** The insides of each `<tag>…</tag>`; an aggregate is closed in SGML and XML alike. */
const blocks = (text: string, tag: string) =>
  [...text.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi'))].map(match => match[1]!);

/** "20261021120000[-3:BRT]" → "2026-10-21". */
function readOfxDate(value: string | null): string | null {
  const digits = value?.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!digits) return null;
  const iso = `${digits[1]}-${digits[2]}-${digits[3]}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : null;
}

/** The statements in an OFX file, OFX 1.x (SGML) or 2.x (XML). Lines without date or amount are left out. */
export function parseOfx(text: string): OfxStatement[] {
  const statements = [
    ...blocks(text, 'STMTRS').map(body => ({ body, kind: 'BANK' as const })),
    ...blocks(text, 'CCSTMTRS').map(body => ({ body, kind: 'CARD' as const })),
  ];
  return statements.map(({ body, kind }) => {
    const account = leaf(body, 'ACCTID') ?? 'conta';
    const seen = new Map<string, number>();
    const transactions: OfxTransaction[] = [];
    for (const line of blocks(body, 'STMTTRN')) {
      const date = readOfxDate(leaf(line, 'DTPOSTED'));
      const amountCents = readCents(leaf(line, 'TRNAMT'));
      if (!date || !amountCents) continue;
      const name = leaf(line, 'NAME');
      const memo = leaf(line, 'MEMO');
      const description =
        name && memo && !memo.toLowerCase().includes(name.toLowerCase())
          ? `${name} - ${memo}`
          : (memo ?? name ?? 'Sem descrição');
      // Some banks repeat a FITID, or leave it out: then the line itself is the key, with its
      // place among identical lines, which the same export always repeats.
      const fitid = leaf(line, 'FITID');
      const key = fitid ?? `${date}:${amountCents}:${description}`;
      const count = (seen.get(key) ?? 0) + 1;
      seen.set(key, count);
      const id = count === 1 ? key : `${key}#${count}`;
      transactions.push({ amountCents, date, description, externalId: `ofx:${account}:${id}` });
    }
    return { account, kind, transactions };
  });
}

/** What a bank statement brings in: the Gastos, and what was left out of them. */
export interface OfxReading {
  /** Payments of a Cartão's Fatura, already counted as the Fatura itself. */
  billPayments: number;
  /** Money coming in (salary, transfers), left out. */
  credits: number;
  /** Money moved to the Titular's investments (a CDB, a caixinha), left out. */
  investments: number;
  lines: ExpenseLine[];
  /** Money the Titular sent to an account of their own, left out. */
  ownTransfers: number;
}

/**
 * The Gastos of bank statements: the debits, but not the payments of a Fatura nor money moved to
 * the Titular's investments or own accounts (`owner` is their name). A Pix is filed under "Pix".
 */
export function ofxExpenses(statements: OfxStatement[], owner = ''): OfxReading {
  const all = statements.filter(item => item.kind === 'BANK').flatMap(item => item.transactions);
  const debits = all.filter(line => line.amountCents < 0);
  const invested = debits.filter(line => !isInvestmentMove(line.description));
  const kept = invested.filter(line => !owner || !isOwnTransfer(line.description, owner));
  const lines = kept
    .filter(line => !isBillPayment(line.description))
    .map(line => ({
      amountCents: -line.amountCents,
      category: importedCategory(line.description),
      date: line.date,
      description: line.description,
      externalId: line.externalId,
    }));
  return {
    billPayments: kept.length - lines.length,
    credits: all.length - debits.length,
    investments: debits.length - invested.length,
    lines,
    ownTransfers: invested.length - kept.length,
  };
}

/**
 * A Cartão's Fatura from its statement: purchases less refunds, without the payment of the
 * previous Fatura, which would net it to nothing.
 */
export function ofxStatementTotal(statement: OfxStatement): {
  amountCents: number;
  lastDate: string | null;
  purchases: number;
} {
  // Most banks write purchases as debits of the card's account, negative; some write them
  // positive. Leaving out what reads as a payment, the sign most lines have is the purchases';
  // refunds and payments have the other.
  const voters = statement.transactions.filter(line => !isBillPayment(line.description, true));
  const negatives = voters.filter(line => line.amountCents < 0).length;
  const sign = negatives * 2 >= voters.length ? -1 : 1;
  const lines = statement.transactions.filter(
    line => !(Math.sign(line.amountCents) === -sign && isBillPayment(line.description, true))
  );
  const amountCents = sign * lines.reduce((total, line) => total + line.amountCents, 0);
  const dates = lines.map(line => line.date).sort();
  return {
    amountCents,
    lastDate: dates.at(-1) ?? null,
    purchases: lines.filter(line => Math.sign(line.amountCents) === sign).length,
  };
}
