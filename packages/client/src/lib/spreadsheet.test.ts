import { describe, expect, it } from 'vitest';

import { guessColumns, parseCsv, readCents, readDate, readExpenses, toTable } from './spreadsheet';

describe('parseCsv', () => {
  it('reads the separator Excel in pt-BR writes, and quoted cells', () => {
    expect(parseCsv('﻿Data;Descrição;Valor\r\n01/10/2026;"Mercado; feira";-45,90\r\n')).toEqual([
      ['Data', 'Descrição', 'Valor'],
      ['01/10/2026', 'Mercado; feira', '-45,90'],
    ]);
  });

  it('reads commas when the header uses them', () => {
    expect(parseCsv('date,description,amount\n2026-10-01,"Uber ""Black""",12.5')).toEqual([
      ['date', 'description', 'amount'],
      ['2026-10-01', 'Uber "Black"', '12.5'],
    ]);
  });
});

describe('toTable', () => {
  it("skips the title, account and period a bank writes above the statement's header", () => {
    const csv = [
      ' Extrato Conta Corrente ',
      'Conta ;12345678',
      'Período ;24/10/2024 a 24/10/2026',
      'Saldo ;2.100,99',
      '',
      'Data Lançamento;Histórico;Descrição;Valor;Saldo',
      '22/10/2026;Pix enviado ;Mercado da Esquina;-45,90;2.055,09',
    ].join('\n');
    const table = toTable(parseCsv(csv));
    expect(table.headers).toEqual(['Data Lançamento', 'Histórico', 'Descrição', 'Valor', 'Saldo']);
    expect(table.rows).toEqual([
      ['22/10/2026', 'Pix enviado ', 'Mercado da Esquina', '-45,90', '2.055,09'],
    ]);
    expect(guessColumns(table.headers)).toEqual({
      amount: 3,
      category: null,
      date: 0,
      description: 2,
      kind: 1,
    });
  });
});

describe('guessColumns', () => {
  it('finds each part by the words banks use', () => {
    expect(guessColumns(['Data Lançamento', 'Histórico', 'Categoria', 'Valor (R$)'])).toEqual({
      amount: 3,
      category: 2,
      date: 0,
      description: 1,
      kind: null,
    });
  });

  it('leaves out what is not there', () => {
    expect(guessColumns(['Coisa', 'Outra'])).toEqual({
      amount: -1,
      category: null,
      date: -1,
      description: -1,
      kind: null,
    });
  });
});

describe('readDate and readCents', () => {
  it('reads dates as people and spreadsheets write them', () => {
    expect(readDate('21/10/2026')).toBe('2026-10-21');
    expect(readDate('1/2/26')).toBe('2026-02-01');
    expect(readDate('2026-10-21T00:00:00')).toBe('2026-10-21');
    expect(readDate(new Date(Date.UTC(2026, 9, 21)))).toBe('2026-10-21');
    expect(readDate('31/02/2026')).toBeNull();
    expect(readDate('ontem')).toBeNull();
  });

  it('reads signed amounts', () => {
    expect(readCents('R$ 1.234,56')).toBe(123456);
    expect(readCents('-45,90')).toBe(-4590);
    expect(readCents('(45,90)')).toBe(-4590);
    expect(readCents('45,90 D')).toBe(-4590);
    expect(readCents(12.5)).toBe(1250);
    expect(readCents('')).toBeNull();
  });
});

describe('readExpenses', () => {
  const columns = { amount: 2, category: null, date: 0, description: 1, kind: null };

  it('keeps only money going out of a bank statement', () => {
    const reading = readExpenses(
      {
        headers: ['Data', 'Histórico', 'Valor'],
        rows: [
          ['01/10/2026', 'Salário', '5.000,00'],
          ['02/10/2026', 'Mercado', '-230,10'],
          ['03/10/2026', 'Farmácia', '-45,00'],
          ['', 'Saldo', ''],
        ],
      },
      columns
    );
    expect(reading.lines).toEqual([
      { amountCents: 23010, category: null, date: '2026-10-02', description: 'Mercado' },
      { amountCents: 4500, category: null, date: '2026-10-03', description: 'Farmácia' },
    ]);
    expect(reading.credits).toBe(1);
    expect(reading.invalid).toBe(1);
  });

  it('takes a sheet of expenses whole when every amount has one sign', () => {
    const reading = readExpenses(
      { headers: [], rows: [['01/10/2026', 'Aluguel', '2.500,00']] },
      columns
    );
    expect(reading.lines).toHaveLength(1);
    expect(reading.credits).toBe(0);
  });
});

describe('readExpenses with what the bank calls each line', () => {
  const columns = { amount: 3, category: null, date: 0, description: 2, kind: 1 };
  const table = {
    headers: [],
    rows: [
      ['22/10/2026', 'Pix enviado ', 'Mercado da Esquina', '-45,90'],
      ['22/10/2026', 'Compra no débito', 'Padaria', '-12,00'],
      ['21/10/2026', 'Aplicação', 'Cdb Porq Obj Banco Inter S A', '-500,00'],
      ['20/10/2026', 'Aplicação Poupança', '', '-100,00'],
      ['19/10/2026', 'Resgate', 'Cdb Porq Obj Banco Inter S A', '300,00'],
    ],
  };

  it('leaves out money moved to investments and files each Pix under Pix', () => {
    const reading = readExpenses(table, columns);
    expect(reading.lines).toEqual([
      { amountCents: 4590, category: 'Pix', date: '2026-10-22', description: 'Mercado da Esquina' },
      { amountCents: 1200, category: null, date: '2026-10-22', description: 'Padaria' },
    ]);
    expect(reading.investments).toBe(2);
    expect(reading.credits).toBe(1);
    expect(reading.invalid).toBe(0);
  });
});
