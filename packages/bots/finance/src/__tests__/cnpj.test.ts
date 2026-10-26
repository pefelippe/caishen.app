import { describe, expect, it } from 'vitest';

import { cnpjDigits, formatCnpj, isValidCnpj } from '../cnpj';

describe('CNPJ', () => {
  it('accepts real CNPJs, typed with or without punctuation', () => {
    expect(isValidCnpj('00.000.000/0001-91')).toBe(true);
    expect(isValidCnpj('11222333000181')).toBe(true);
  });

  it('refuses wrong check digits, wrong lengths and repeated digits', () => {
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false);
    expect(isValidCnpj('1122233300018')).toBe(false);
    expect(isValidCnpj('11111111111111')).toBe(false);
  });

  it('keeps only the digits and writes them with the usual marks', () => {
    expect(cnpjDigits('11.222.333/0001-81')).toBe('11222333000181');
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatCnpj('123')).toBe('123');
  });
});
