import { useMutation, useQuery } from '@apollo/client/react';
import {
  AddIncomeSourceDocument,
  CreateCreditCardDocument,
  CreateCreditOperationDocument,
  HolderDocument,
  UpsertStatementDocument,
  type HolderQuery,
  type Modality,
} from '@mny/graphql/client';
import { MODALITIES, MODALITY_KEYS, today } from '@mny/finance';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AssessmentPanel } from '../components/AssessmentPanel';
import { ConsentBanner } from '../components/ConsentBanner';
import { formatCents, formatDate, formatPercent, parseCents, parsePercent } from '../lib/format';

type Holder = NonNullable<HolderQuery['holder']>;

/** Reads a FormData field as trimmed text, `null` when blank. */
const text = (values: FormData, key: string) => String(values.get(key) ?? '').trim() || null;

export function HolderPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useQuery(HolderDocument, { variables: { id: id! } });

  if (loading) return <p className="muted">Carregando…</p>;
  const holder = data?.holder;
  if (!holder) return <p>Titular não encontrado.</p>;

  return (
    <div className="stack">
      <div>
        <Link className="muted small" to="/">
          ← Titulares
        </Link>
        <h1>{holder.name}</h1>
        <p className="muted">
          {holder.document ? `CPF ${holder.document} · ` : ''}Renda mensal líquida{' '}
          {formatCents(holder.monthlyIncomeCents)}
        </p>
      </div>
      <ConsentBanner holder={holder} />
      <AssessmentPanel holder={holder} />
      <IncomeSection holder={holder} />
      <OperationsSection holder={holder} />
      <CardsSection holder={holder} />
    </div>
  );
}

function IncomeSection({ holder }: { holder: Holder }) {
  const [addIncome] = useMutation(AddIncomeSourceDocument, { refetchQueries: [HolderDocument] });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const monthlyNetCents = parseCents(String(values.get('amount')));
    if (monthlyNetCents == null) return;
    await addIncome({
      variables: {
        input: {
          description: text(values, 'description')!,
          holderId: holder.id,
          monthlyNetCents,
          startsOn: text(values, 'startsOn') ?? today(),
        },
      },
    });
    form.reset();
  };

  return (
    <section className="card stack">
      <h2>Fontes de Renda</h2>
      {holder.incomeSources.length > 0 && (
        <table>
          <tbody>
            {holder.incomeSources.map(source => (
              <tr key={source.id}>
                <td>{source.description}</td>
                <td className="muted">
                  desde {formatDate(source.startsOn)}
                  {source.endsOn ? ` até ${formatDate(source.endsOn)}` : ''}
                </td>
                <td className="num">{formatCents(source.monthlyNetCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form className="row" onSubmit={submit}>
        <input name="description" placeholder="Salário, pró-labore…" required />
        <input name="amount" placeholder="Valor líquido mensal (R$)" required />
        <input name="startsOn" title="Início" type="date" />
        <button type="submit">Adicionar</button>
      </form>
    </section>
  );
}

function OperationsSection({ holder }: { holder: Holder }) {
  const [createOperation, { error }] = useMutation(CreateCreditOperationDocument, {
    refetchQueries: [HolderDocument],
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await createOperation({
      variables: {
        input: {
          collateralDescription: text(values, 'collateral'),
          firstDueDate: text(values, 'firstDueDate')!,
          holderId: holder.id,
          installmentCents: parseCents(String(values.get('installment'))),
          lender: text(values, 'lender'),
          modality: values.get('modality') as Modality,
          monthlyRate: parsePercent(String(values.get('rate'))),
          name: text(values, 'name')!,
          principalCents: parseCents(String(values.get('principal')))!,
          system: values.get('system') as 'PRICE' | 'SAC',
          termMonths: Number(values.get('term')),
        },
      },
    }).catch(() => undefined);
    form.reset();
  };

  return (
    <section className="card stack">
      <h2>Operações de Crédito</h2>
      <p className="muted small">
        Empréstimos e financiamentos. Parcelas vencidas contam como pagas em dia; registre Atrasos
        na página da operação.
      </p>
      {holder.creditOperations.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Operação</th>
              <th>Modalidade</th>
              <th className="num">Taxa a.m.</th>
              <th className="num">Parcela</th>
              <th className="num">Pagas</th>
              <th>Estágio</th>
              <th className="num">Saldo devedor</th>
            </tr>
          </thead>
          <tbody>
            {holder.creditOperations.map(operation => (
              <tr key={operation.id}>
                <td>
                  <Link to={`/operacoes/${operation.id}`}>{operation.name}</Link>
                  {operation.lender && <span className="muted"> · {operation.lender}</span>}
                </td>
                <td>{operation.modalityLabel}</td>
                <td className="num">{formatPercent(operation.monthlyRate)}</td>
                <td className="num">{formatCents(operation.installmentCents)}</td>
                <td className="num">
                  {operation.paidInstallments}/{operation.termMonths}
                </td>
                <td className={operation.stage > 1 ? 'error' : 'muted'}>{operation.stage}</td>
                <td className="num">{formatCents(operation.outstandingBalanceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form className="grid-form" onSubmit={submit}>
        <input name="name" placeholder="Nome (ex.: Financiamento do carro)" required />
        <input name="lender" placeholder="Instituição" />
        <select defaultValue="PERSONAL_LOAN" name="modality">
          {MODALITY_KEYS.map(key => (
            <option key={key} value={key}>
              {MODALITIES[key].label}
            </option>
          ))}
        </select>
        <select defaultValue="PRICE" name="system">
          <option value="PRICE">Price (parcela fixa)</option>
          <option value="SAC">SAC (amortização fixa)</option>
        </select>
        <input name="principal" placeholder="Valor financiado (R$)" required />
        <input min={1} name="term" placeholder="Prazo (meses)" required type="number" />
        <input name="firstDueDate" required title="1ª parcela" type="date" />
        <input name="rate" placeholder="Taxa % a.m. (ou informe a parcela)" />
        <input name="installment" placeholder="Parcela (R$) (ou informe a taxa)" />
        <input name="collateral" placeholder="Bem financiado (opcional)" />
        <button type="submit">Adicionar operação</button>
      </form>
      {error && <p className="error">{error.message}</p>}
    </section>
  );
}

function CardsSection({ holder }: { holder: Holder }) {
  const [createCard] = useMutation(CreateCreditCardDocument, { refetchQueries: [HolderDocument] });
  const [upsertStatement] = useMutation(UpsertStatementDocument, {
    refetchQueries: [HolderDocument],
  });

  const submitCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await createCard({
      variables: {
        input: {
          closingDay: Number(values.get('closingDay')),
          dueDay: Number(values.get('dueDay')),
          holderId: holder.id,
          issuer: text(values, 'issuer'),
          limitCents: parseCents(String(values.get('limit')))!,
          name: text(values, 'name')!,
        },
      },
    });
    form.reset();
  };

  const submitStatement = (creditCardId: string) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amountCents = parseCents(String(values.get('amount')));
    if (amountCents == null) return;
    await upsertStatement({
      variables: {
        input: { amountCents, creditCardId, referenceMonth: String(values.get('month')) },
      },
    });
    form.reset();
  };

  return (
    <section className="card stack">
      <h2>Cartões</h2>
      {holder.creditCards.map(card => (
        <div className="subcard stack" key={card.id}>
          <div className="row between">
            <strong>
              {card.name}
              {card.issuer && <span className="muted"> · {card.issuer}</span>}
            </strong>
            <span className="muted small">
              Limite {formatCents(card.limitCents)} · fecha dia {card.closingDay} · vence dia{' '}
              {card.dueDay}
            </span>
          </div>
          {card.statements.length > 0 && (
            <table>
              <tbody>
                {card.statements.map(item => (
                  <tr key={item.id}>
                    <td>Fatura {item.referenceMonth}</td>
                    <td className="muted">vence {formatDate(item.dueDate)}</td>
                    <td className="num">{formatCents(item.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form className="row" onSubmit={submitStatement(card.id)}>
            <input name="month" required title="Mês de vencimento" type="month" />
            <input name="amount" placeholder="Valor da Fatura (R$)" required />
            <button className="secondary" type="submit">
              Salvar Fatura
            </button>
          </form>
        </div>
      ))}
      <form className="row" onSubmit={submitCard}>
        <input name="name" placeholder="Nome do cartão" required />
        <input name="issuer" placeholder="Emissor" />
        <input name="limit" placeholder="Limite (R$)" required />
        <input max={31} min={1} name="closingDay" placeholder="Fecha dia" required type="number" />
        <input max={31} min={1} name="dueDay" placeholder="Vence dia" required type="number" />
        <button type="submit">Adicionar cartão</button>
      </form>
    </section>
  );
}
