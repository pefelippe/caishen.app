import { describe, expect, it } from 'vitest';

import { importedCategory, isInvestmentMove, isOwnTransfer, lineFingerprint } from '../bills';

describe('isInvestmentMove', () => {
  it("reads money going to or coming from the Titular's own investments", () => {
    expect(isInvestmentMove('Aplicação Cdb Porq Obj Banco Inter S A')).toBe(true);
    expect(isInvestmentMove('Cdb Porquinho Banco Inter Sa')).toBe(true);
    expect(isInvestmentMove('Aplicação Poupança')).toBe(true);
    expect(isInvestmentMove('Resgate Cdb Pos Di Liq. Banco Inter Sa')).toBe(true);
    expect(isInvestmentMove('Guardado na caixinha')).toBe(true);
  });

  it('leaves out spending, a lender named after investments included', () => {
    expect(isInvestmentMove('Pagamento efetuado AYMORE CREDITO, FINANCIAMENTO E INVESTIM')).toBe(
      false
    );
    expect(isInvestmentMove('Compra no débito Padaria')).toBe(false);
    expect(isInvestmentMove('Pix enviado Maria')).toBe(false);
  });
});

describe('importedCategory', () => {
  it('files any Pix as Pix', () => {
    expect(importedCategory('Pix enviado Maria')).toBe('Pix');
    expect(importedCategory('PIX QRS PADARIA')).toBe('Pix');
    expect(importedCategory('Compra no débito')).toBeNull();
    expect(importedCategory('Pixel Store')).toBeNull();
  });
});

describe('isOwnTransfer', () => {
  it("reads money sent to the Titular's own accounts by their first and last names", () => {
    const owner = 'Pedro Felippe Domingos Fernandes';
    expect(isOwnTransfer('Pix enviado Pedro Felippe Domingos Fernandes', owner)).toBe(true);
    expect(isOwnTransfer('PEDRO F D FERNANDES CONSULT', owner)).toBe(true);
    expect(isOwnTransfer('Pix enviado Maria Evane Da Cunha Falcao', owner)).toBe(false);
    expect(isOwnTransfer('Pedro Alvares Cabral', owner)).toBe(false);
  });

  it('reads a name the bank cut short', () => {
    const owner = 'Pedro Felippe Domingos Fernandes';
    expect(isOwnTransfer('PIX TRANSF PEDRO F22/10', owner)).toBe(true);
    expect(isOwnTransfer('PIX TRANSF Pedro Fe', owner)).toBe(true);
    expect(isOwnTransfer('PIX TRANSF Pedro A14/10', owner)).toBe(false);
    expect(isOwnTransfer('PIX TRANSF Pedro Fonseca', owner)).toBe(false);
  });

  it('needs at least two names to tell', () => {
    expect(isOwnTransfer('Pix enviado Pedro', 'Pedro')).toBe(false);
  });
});

describe('lineFingerprint', () => {
  it('is the same for the same line, and tells equal lines in one file apart', () => {
    const line = { amountCents: 450, date: '2026-10-22', description: 'Café  da Esquina' };
    expect(lineFingerprint(line, 0)).toBe(
      lineFingerprint({ ...line, description: 'CAFE DA ESQUINA' }, 0)
    );
    expect(lineFingerprint(line, 0)).not.toBe(lineFingerprint(line, 1));
  });
});
