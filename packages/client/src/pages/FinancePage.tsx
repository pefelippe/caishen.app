import { useMutation, useQuery } from '@apollo/client/react';
import {
  AddIncomeSourceDocument,
  CreateCreditCardDocument,
  CreateCreditOperationDocument,
  HolderDocument,
  MarketIndicatorsDocument,
  UpsertStatementDocument,
  ViewerHolderDocument,
  type HolderQuery,
  type Modality,
} from '@zapbots/graphql/client';
import { MODALITIES, MODALITY_KEYS, today } from '@zapbots/finance';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { BotPage } from '../components/BotPage';
import { AssessmentPanel } from '../components/AssessmentPanel';
import { ConsentBanner } from '../components/ConsentBanner';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { ScrPanel } from '../components/ScrPanel';
import { formatCents, formatDate, formatPercent, parseCents, parsePercent } from '../lib/format';

type Holder = NonNullable<HolderQuery['holder']>;

/** Reads a FormData field as trimmed text, `null` when blank. */
const text = (values: FormData, key: string) => String(values.get(key) ?? '').trim() || null;

const SUGGESTIONS = [
  'O que vence nos próximos 30 dias?',
  'Qual das minhas Operações de Crédito tem a taxa mais alta?',
  'Como está minha última Avaliação?',
];

/** Finanças of the signed-in User, who is the Holder (docs/adr/0007). */
export function FinancePage() {
  const { data: viewer } = useQuery(ViewerHolderDocument);
  const id = viewer?.viewerHolder.id;
  const { data, loading } = useQuery(HolderDocument, { skip: !id, variables: { id: id! } });
  const { data: market } = useQuery(MarketIndicatorsDocument);

  const holder = data?.holder;
  if (!holder) {
    return loading || !viewer ? <PageSkeleton /> : <p>Não foi possível carregar suas Finanças.</p>;
  }
  const indicators = market?.marketIndicators;

  return (
    <BotPage
      actions={
        <Button asChild variant="outline">
          <Link to="/caishen/trabalhos">Trabalhos</Link>
        </Button>
      }
      bot="FINANCE"
      description={
        <>
          Renda mensal líquida{' '}
          <span className="text-foreground tabular-nums">
            {formatCents(holder.monthlyIncomeCents)}
          </span>
          {indicators && (
            <span title="Fonte: Bacen (SGS)">
              {' '}
              · Selic {indicators.selic ?? '—'}% · CDI {indicators.cdi ?? '—'}% · IPCA{' '}
              {indicators.ipca ?? '—'}%
            </span>
          )}
        </>
      }
      suggestions={SUGGESTIONS}
      eyebrow={
        <span className="text-xs font-medium tracking-[0.14em] text-ink uppercase">Caishen</span>
      }
      title="Finanças"
    >
      <ConsentBanner holder={holder} />
      <AssessmentPanel holder={holder} />
      <ScrPanel holder={holder} />
      <IncomeSection holder={holder} />
      <OperationsSection holder={holder} />
      <CardsSection holder={holder} />
    </BotPage>
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
    <Card>
      <CardHeader>
        <CardTitle>Fontes de Renda</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {holder.incomeSources.length > 0 && (
          <Table>
            <TableBody>
              {holder.incomeSources.map(source => (
                <TableRow key={source.id}>
                  <TableCell>{source.description}</TableCell>
                  <TableCell className="text-muted-foreground">
                    desde {formatDate(source.startsOn)}
                    {source.endsOn ? ` até ${formatDate(source.endsOn)}` : ''}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(source.monthlyNetCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
          <Input className="w-56" name="description" placeholder="Salário, pró-labore…" required />
          <Input className="w-56" name="amount" placeholder="Valor líquido mensal (R$)" required />
          <Input className="w-auto" name="startsOn" title="Início" type="date" />
          <Button type="submit">Adicionar</Button>
        </form>
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Operações de Crédito</CardTitle>
        <CardDescription>
          Empréstimos e financiamentos. Parcelas vencidas contam como pagas em dia; registre Atrasos
          na página da operação.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {holder.creditOperations.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operação</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead className="text-right">Taxa a.m.</TableHead>
                <TableHead className="text-right">Parcela</TableHead>
                <TableHead className="text-right">Pagas</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead className="text-right">Saldo devedor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holder.creditOperations.map(operation => (
                <TableRow key={operation.id}>
                  <TableCell>
                    <Link
                      className="font-medium text-ink underline-offset-4 hover:underline"
                      to={`/caishen/operacoes/${operation.id}`}
                    >
                      {operation.name}
                    </Link>
                    {operation.lender && (
                      <span className="text-muted-foreground"> · {operation.lender}</span>
                    )}
                  </TableCell>
                  <TableCell>{operation.modalityLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(operation.monthlyRate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(operation.installmentCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {operation.paidInstallments}/{operation.termMonths}
                  </TableCell>
                  <TableCell
                    className={operation.stage > 1 ? 'text-destructive' : 'text-muted-foreground'}
                  >
                    {operation.stage}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(operation.outstandingBalanceCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <form
          className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2"
          onSubmit={submit}
        >
          <Input name="name" placeholder="Nome (ex.: Financiamento do carro)" required />
          <Input name="lender" placeholder="Instituição" />
          <Select defaultValue="PERSONAL_LOAN" name="modality">
            <SelectTrigger aria-label="Modalidade" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODALITY_KEYS.map(key => (
                <SelectItem key={key} value={key}>
                  {MODALITIES[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select defaultValue="PRICE" name="system">
            <SelectTrigger aria-label="Sistema de amortização" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRICE">Price (parcela fixa)</SelectItem>
              <SelectItem value="SAC">SAC (amortização fixa)</SelectItem>
            </SelectContent>
          </Select>
          <Input name="principal" placeholder="Valor financiado (R$)" required />
          <Input min={1} name="term" placeholder="Prazo (meses)" required type="number" />
          <Input name="firstDueDate" required title="1ª parcela" type="date" />
          <Input name="rate" placeholder="Taxa % a.m. (ou informe a parcela)" />
          <Input name="installment" placeholder="Parcela (R$) (ou informe a taxa)" />
          <Input name="collateral" placeholder="Bem financiado (opcional)" />
          <Button type="submit">Adicionar operação</Button>
        </form>
        {error && <FormError message={error.message} />}
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Cartões</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {holder.creditCards.map(card => (
          <Card className="gap-3 py-4 shadow-none" key={card.id}>
            <CardHeader className="px-4">
              <CardTitle className="text-base">
                {card.name}
                {card.issuer && (
                  <span className="font-normal text-muted-foreground"> · {card.issuer}</span>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Limite {formatCents(card.limitCents)} · fecha dia {card.closingDay} · vence dia{' '}
                {card.dueDay}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-4">
              {card.statements.length > 0 && (
                <Table>
                  <TableBody>
                    {card.statements.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>Fatura {item.referenceMonth}</TableCell>
                        <TableCell className="text-muted-foreground">
                          vence {formatDate(item.dueDate)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCents(item.amountCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={submitStatement(card.id)}
              >
                <Input
                  className="w-auto"
                  name="month"
                  required
                  title="Mês de vencimento"
                  type="month"
                />
                <Input className="w-48" name="amount" placeholder="Valor da Fatura (R$)" required />
                <Button type="submit" variant="outline">
                  Salvar Fatura
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
        <form className="flex flex-wrap items-center gap-2" onSubmit={submitCard}>
          <Input className="w-48" name="name" placeholder="Nome do cartão" required />
          <Input className="w-40" name="issuer" placeholder="Emissor" />
          <Input className="w-36" name="limit" placeholder="Limite (R$)" required />
          <Input
            className="w-28"
            max={31}
            min={1}
            name="closingDay"
            placeholder="Fecha dia"
            required
            type="number"
          />
          <Input
            className="w-28"
            max={31}
            min={1}
            name="dueDay"
            placeholder="Vence dia"
            required
            type="number"
          />
          <Button type="submit">Adicionar cartão</Button>
        </form>
      </CardContent>
    </Card>
  );
}
