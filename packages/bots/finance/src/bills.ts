/** Lower case, without accents, so "PAGTO FATURA CARTÃO" reads as "pagto fatura cartao". */
const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Money moved to or from the Titular's own investments ("Aplicação", "Resgate", a CDB, the Inter's
 * Porquinho, a caixinha, the poupança): it changes where the money is, not what was spent, so
 * imports leave it out. Not "invest": "Aymoré Crédito, Financiamento e Investimento" is a lender.
 */
export function isInvestmentMove(text: string): boolean {
  return /\b(aplicacao|aplic|resgate|cdb|rdb|lci|lca|porq|porquinho|caixinhas?|cofrinho|poupanca|tesouro direto)\b/.test(
    plain(text)
  );
}

/** Words of a name that tell people apart: not "de", "da", "dos"… */
const nameWords = (name: string) =>
  plain(name)
    .split(/[^a-z]+/)
    .filter(word => word.length > 2 && !['das', 'dos', 'del'].includes(word));

/**
 * Money the Titular sent to an account of their own ("Pix enviado · Pedro Felippe Fernandes", or to
 * their company with the same name): it moves money, it is not spent, and counting it would count
 * twice what is then spent from the other account. Read by the Titular's first and last names.
 */
export function isOwnTransfer(text: string, ownerName: string): boolean {
  const owner = nameWords(ownerName);
  if (owner.length < 2) return false;
  const words = new Set(nameWords(text));
  if (words.has(owner[0]!) && words.has(owner.at(-1)!)) return true;
  // Banks cut names short ("PIX TRANSF PEDRO F22/10"): the first name, then the first letters of
  // another of the Titular's names, cut where the line ends or a digit begins.
  const cut = plain(text).match(new RegExp(`\\b${owner[0]}\\s+([a-z]{1,3})(?![a-z])`));
  return !!cut && owner.slice(1).some(word => word.startsWith(cut[1]!));
}

/**
 * A key for an imported line with no id of its own (a spreadsheet's): its date, amount and
 * description, and which of the identical lines in the same file it is (`nth`, from 0), so the
 * same file, or an export that overlaps it, adds each line once while two equal coffees on the
 * same day stay two.
 */
export function lineFingerprint(
  line: { amountCents: number; date: string; description: string },
  nth: number
): string {
  const description = plain(line.description).replace(/\s+/g, ' ').trim();
  return `sheet:${line.date}:${line.amountCents}:${description}#${nth}`;
}

/**
 * The category an imported line gets when its source gave none: a Pix is "Pix", whoever got it.
 */
export function importedCategory(text: string): string | null {
  return /\bpix\b/.test(plain(text)) ? 'Pix' : null;
}

/**
 * A line that pays a Cartão's Fatura ("Pagamento de fatura", "PGTO FATURA CARTAO"). In a bank
 * statement it would count the Fatura twice, so imports leave it out; on the card's own statement
 * (`onCard`), any payment received is one.
 */
export function isBillPayment(description: string, onCard = false): boolean {
  const text = plain(description);
  if (onCard) return /\b(pagamento|pagto|pgto|pag)\b/.test(text);
  return (
    /\b(pagamento|pagto|pgto|pag)\b.*\b(fatura|cartao)\b/.test(text) ||
    /\bfatura\b.*\b(pagamento|pagto|pgto|pag|paga)\b/.test(text)
  );
}
