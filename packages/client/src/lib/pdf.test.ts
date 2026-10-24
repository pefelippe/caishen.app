import { describe, expect, it } from 'vitest';

import { statementTable } from './pdf';
import { guessColumns, readExpenses } from './spreadsheet';

describe('statementTable', () => {
  it("reads an Itaú statement: a date on every line, the day's balance left out", () => {
    const table = statementTable([
      'PEDRO FELIPPE DOMINGOS FERNANDES 621.827.723-24 agência: 6378 conta: 071860-2',
      'saldo em conta Limite da Conta utilizado',
      'R$ 0,09 R$ 0,00 R$ 0,00 R$ 0,00',
      'data lançamentos valor (R$) saldo (R$)',
      '23/10/2026 SALDO DO DIA 0,09',
      '22/10/2026 PIX TRANSF PEDRO F22/10 983,00',
      '22/10/2026 FATURA PAGA CARTAO MAGAL -982,92',
      '16/10/2026 PIX QRS RECEITA FED16/10 -178,31',
      '14/10/2026 PAG BOLETO ITAU-UNIBANCO HOLDING S/A -7.426,40',
      'Aviso!',
      'Os saldos acima são baseados nas informações disponíveis até esse instante',
    ]);
    expect(table.rows).toEqual([
      ['2026-10-22', 'PIX TRANSF PEDRO F', '983,00'],
      ['2026-10-22', 'FATURA PAGA CARTAO MAGAL', '-982,92'],
      ['2026-10-16', 'PIX QRS RECEITA FED', '-178,31'],
      ['2026-10-14', 'PAG BOLETO ITAU-UNIBANCO HOLDING S/A', '-7.426,40'],
    ]);

    const reading = readExpenses(table, guessColumns(table.headers), 'Pedro Felippe Fernandes');
    expect(reading.lines.map(line => [line.description, line.amountCents])).toEqual([
      ['PIX QRS RECEITA FED', 17831],
      ['PAG BOLETO ITAU-UNIBANCO HOLDING S/A', 742640],
    ]);
    expect(reading.billPayments).toBe(1);
  });

  it('reads a Nubank statement: a date a day, the sign from its section, the receiver below', () => {
    const table = statementTable([
      '01 OUT 2024 Total de entradas + 1.500,00',
      'Transferência recebida pelo Pix 1.500,00',
      'MARIA SILVA - •••.123.456-•• - BANCO INTER',
      'Total de saídas - 458,00',
      'Transferência enviada pelo Pix 458,00',
      'JOAO SOUZA - •••.827.723-•• - NU PAGAMENTOS - IP (0260)',
      'Agência: 1 Conta: 3284791-3',
      '02 OUT 2024 Total de saídas - 32,90',
      'Compra no débito Padaria Pão Quente 32,90',
    ]);
    expect(table.rows).toEqual([
      [
        '2024-10-01',
        'Transferência recebida pelo Pix MARIA SILVA - •••.123.456-•• - BANCO INTER',
        '1.500,00',
      ],
      [
        '2024-10-01',
        'Transferência enviada pelo Pix JOAO SOUZA - •••.827.723-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 3284791-3',
        '-458,00',
      ],
      ['2024-10-02', 'Compra no débito Padaria Pão Quente', '-32,90'],
    ]);
  });

  it('reads an Inter statement: the day written out, signed sums and the balance after them', () => {
    const table = statementTable([
      '1 de Outubro de 2026 Saldo do dia: R$ 1.050,00',
      'Pix enviado: "Cp :18236120-Fulano de Tal" -R$ 50,00 R$ 1.000,00',
      'Compra no debito: "No estabelecimento MERCADO" - R$ 120,35 R$ 879,65',
    ]);
    expect(table.rows).toEqual([
      ['2026-10-01', 'Pix enviado: Cp :18236120-Fulano de Tal', '-50,00'],
      ['2026-10-01', 'Compra no debito: No estabelecimento MERCADO', '-120,35'],
    ]);
  });
});
