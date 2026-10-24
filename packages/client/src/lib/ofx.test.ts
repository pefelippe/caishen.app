import { isBillPayment } from '@zapbots/finance';
import { describe, expect, it } from 'vitest';

import { ofxExpenses, ofxStatementTotal, parseOfx } from './ofx';

/** OFX 1.x as Itaú and Santander write it: SGML, leaf tags left open. */
const SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
CHARSET:1252

<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<CURDEF>BRL
<BANKACCTFROM><BANKID>0341<ACCTID>12345-6</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261021120000[-3:BRT]
<TRNAMT>-45.90
<FITID>A1
<MEMO>PADARIA SÃO JOÃO
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261005
<TRNAMT>5000.00
<FITID>A2
<MEMO>SALARIO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261010
<TRNAMT>-1250,00
<FITID>A3
<MEMO>PAGTO FATURA CARTAO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261011
<TRNAMT>-9.90
<MEMO>CAFE
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261011
<TRNAMT>-9.90
<MEMO>CAFE
</STMTTRN>
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

/** OFX 2.x, XML, a Cartão's statement as Nubank exports it. */
const CARD_XML = `<?xml version="1.0" encoding="UTF-8"?>
<OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS>
<CCACCTFROM><ACCTID>nubank-card</ACCTID></CCACCTFROM>
<BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261002000000</DTPOSTED><TRNAMT>-120.00</TRNAMT><FITID>c1</FITID><MEMO>Mercado</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261008000000</DTPOSTED><TRNAMT>-80.50</TRNAMT><FITID>c2</FITID><MEMO>Uber</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20261009000000</DTPOSTED><TRNAMT>20.00</TRNAMT><FITID>c3</FITID><MEMO>Estorno Uber</MEMO></STMTTRN>
<STMTTRN><TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20261010000000</DTPOSTED><TRNAMT>950.00</TRNAMT><FITID>c4</FITID><MEMO>Pagamento recebido</MEMO></STMTTRN>
</BANKTRANLIST>
</CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>`;

describe('parseOfx', () => {
  it('reads OFX 1.x with open tags, dates with a zone and both decimal marks', () => {
    const [statement] = parseOfx(SGML);
    expect(statement).toMatchObject({ account: '12345-6', kind: 'BANK' });
    expect(statement!.transactions[0]).toEqual({
      amountCents: -4590,
      date: '2026-10-21',
      description: 'PADARIA SÃO JOÃO',
      externalId: 'ofx:12345-6:A1',
    });
    expect(statement!.transactions[2]!.amountCents).toBe(-125000);
  });

  it('keys lines without FITID by themselves, apart when they repeat', () => {
    const ids = parseOfx(SGML)[0]!
      .transactions.slice(3)
      .map(line => line.externalId);
    expect(ids).toEqual(['ofx:12345-6:2026-10-11:-990:CAFE', 'ofx:12345-6:2026-10-11:-990:CAFE#2']);
    // The same file read again gives the same keys, so importing it twice adds nothing.
    expect(parseOfx(SGML)[0]!.transactions.map(line => line.externalId)).toEqual(
      parseOfx(SGML)[0]!.transactions.map(line => line.externalId)
    );
  });

  it('tells a Cartão statement from an account', () => {
    expect(parseOfx(CARD_XML).map(item => item.kind)).toEqual(['CARD']);
  });
});

describe('ofxExpenses', () => {
  it('takes the debits as Gastos and leaves out income and Fatura payments', () => {
    const reading = ofxExpenses(parseOfx(SGML));
    expect(reading.credits).toBe(1);
    expect(reading.billPayments).toBe(1);
    expect(reading.lines.map(line => [line.description, line.amountCents])).toEqual([
      ['PADARIA SÃO JOÃO', 4590],
      ['CAFE', 990],
      ['CAFE', 990],
    ]);
  });
});

describe('ofxStatementTotal', () => {
  it('sums purchases less refunds, without the previous Fatura paid', () => {
    expect(ofxStatementTotal(parseOfx(CARD_XML)[0]!)).toEqual({
      amountCents: 18050,
      lastDate: '2026-10-09',
      purchases: 2,
    });
  });

  it('reads a statement that writes purchases as positive', () => {
    const flipped = parseOfx(CARD_XML)[0]!;
    const statement = {
      ...flipped,
      transactions: flipped.transactions.map(line => ({ ...line, amountCents: -line.amountCents })),
    };
    expect(ofxStatementTotal(statement)).toMatchObject({ amountCents: 18050, purchases: 2 });
  });
});

describe('isBillPayment', () => {
  it('knows how banks write paying a Fatura', () => {
    expect(isBillPayment('Pagamento de fatura')).toBe(true);
    expect(isBillPayment('PGTO FATURA CARTAO ITAU')).toBe(true);
    expect(isBillPayment('Fatura paga Nubank')).toBe(true);
    expect(isBillPayment('Pagamento de boleto')).toBe(false);
    expect(isBillPayment('PAG*Padaria')).toBe(false);
  });
});
