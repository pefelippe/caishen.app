/**
 * The CNPJ of the Titular's company (docs/adr/0024): its digits, its check digits and how it is
 * written. Looking it up at the Receita is the server's (`services/cnpj.ts`).
 */

/** Only the digits of what was typed: "12.345.678/0001-95" → "12345678000195". */
export const cnpjDigits = (input: string): string => input.replace(/\D/g, '');

function checkDigit(digits: string): number {
  // Weights 5..2 then 9..2 for the 12 first digits, 6..2 then 9..2 for the 13.
  let sum = 0;
  let weight = digits.length - 7;
  for (const digit of digits) {
    sum += Number(digit) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/** Whether `input` is a CNPJ: 14 digits, not all the same, with both check digits right. */
export function isValidCnpj(input: string): boolean {
  const digits = cnpjDigits(input);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  return (
    checkDigit(digits.slice(0, 12)) === Number(digits[12]) &&
    checkDigit(digits.slice(0, 13)) === Number(digits[13])
  );
}

/** "12345678000195" → "12.345.678/0001-95"; anything else as it came. */
export function formatCnpj(input: string): string {
  const digits = cnpjDigits(input);
  if (digits.length !== 14) return input;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}
