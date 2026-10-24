/** Lower case, without accents, so "PAGTO FATURA CARTÃO" reads as "pagto fatura cartao". */
const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

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
