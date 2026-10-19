import { useMutation, useQuery } from '@apollo/client/react';
import {
  AddIncomeSourceDocument,
  BotAlertsDocument,
  CreateCreditCardDocument,
  CreateCreditOperationDocument,
  HolderDocument,
  MarketIndicatorsDocument,
  UpsertStatementDocument,
  ViewerHolderDocument,
  type HolderQuery,
  type Modality,
} from '@zapbots/graphql/client';
import {
  addMonths,
  ImpliedRateError,
  impliedMonthlyRate,
  isFinancing,
  MODALITIES,
  MODALITY_KEYS,
  monthlyToAnnualRate,
  today,
} from '@zapbots/finance';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { AlertList } from '../components/AlertList';
import { AssessmentPanel } from '../components/AssessmentPanel';
import { ConsentBanner } from '../components/ConsentBanner';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { PayoffPlanPanel } from '../components/PayoffPlanPanel';
import { ScrPanel } from '../components/ScrPanel';
import { formatCents, formatDate, formatPercent, parseCents, parsePercent } from '../lib/format';

type Holder = NonNullable<HolderQuery['holder']>;

/** Reads a FormData field as trimmed text, `null` when blank. */
const text = (values: FormData, key: string) => String(values.get(key) ?? '').trim() || null;

/** A labelled form field; `hint` says what to type when the label alone does not. */
function Field({
  children,
  hint,
  id,
  label,
}: {
  children: ReactNode;
  hint?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const FORM_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] items-start gap-3';

/**
 * The signed-in User's Holder (docs/adr/0007), which every section of the Caishen's page reads.
 * `holder` is `null` while loading and `undefined` when it failed.
 */
function useHolder(): Holder | null | undefined {
  const { data: viewer } = useQuery(ViewerHolderDocument);
  const id = viewer?.viewerHolder.id;
  const { data, loading } = useQuery(HolderDocument, { skip: !id, variables: { id: id! } });
  if (data?.holder) return data.holder;
  return loading || !viewer ? null : undefined;
}

/** A section of the Caishen's page once the Holder is there. */
function HolderSection({
  children,
  description,
  title,
}: {
  children: (holder: Holder) => ReactNode;
  description?: (holder: Holder) => ReactNode;
  title: string;
}) {
  const holder = useHolder();
  if (holder === null) return <PageSkeleton />;
  if (!holder) return <p>Não foi possível carregar suas Finanças.</p>;
  return (
    <BotPage bot="FINANCE" description={description?.(holder)} title={title}>
      {children(holder)}
    </BotPage>
  );
}

/** Visão geral: the Alerts, the Assessment, the SCR and, with debts to compare, the payoff plan. */
export function FinanceOverviewPage() {
  const { data: market } = useQuery(MarketIndicatorsDocument);
  const { data: alerts } = useQuery(BotAlertsDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { key: 'FINANCE' },
  });
  const indicators = market?.marketIndicators;

  return (
    <HolderSection
      description={holder => (
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
      )}
      title="Visão geral"
    >
      {holder => (
        <>
          {Boolean(alerts?.bot.alerts.length) && (
            <Card className="border-ink">
              <CardHeader>
                <CardTitle>Avisos</CardTitle>
                <CardDescription>
                  O que merece atenção agora, do mais urgente ao menos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertList alerts={alerts!.bot.alerts} />
              </CardContent>
            </Card>
          )}
          <ConsentBanner holder={holder} />
          <AssessmentPanel holder={holder} />
          <ScrPanel holder={holder} />
          {holder.creditOperations.length > 1 && <PayoffPlanPanel holderId={holder.id} />}
        </>
      )}
    </HolderSection>
  );
}

/** Renda: the Holder's Income Sources. */
export function IncomePage() {
  return (
    <HolderSection
      description={holder => `Renda mensal líquida ${formatCents(holder.monthlyIncomeCents)}`}
      title="Renda"
    >
      {holder => <IncomeSection holder={holder} />}
    </HolderSection>
  );
}

/** Obrigações: every Credit Operation and card, and a form for a new one of any type. */
export function ObligationsPage() {
  return (
    <HolderSection title="Obrigações">
      {holder => <ObligationsSection holder={holder} />}
    </HolderSection>
  );
}

function IncomeSection({ holder }: { holder: Holder }) {
  const [addIncome, { error }] = useMutation(AddIncomeSourceDocument, {
    refetchQueries: [HolderDocument],
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const monthlyNetCents = parseCents(String(values.get('amount')));
    if (monthlyNetCents == null) return;
    try {
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
    } catch {
      // Shown by `error` under the form; the typed values stay.
    }
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
        <form className={FORM_GRID} onSubmit={submit}>
          <Field id="income-description" label="Descrição">
            <Input
              id="income-description"
              name="description"
              placeholder="Salário, pró-labore…"
              required
            />
          </Field>
          <Field id="income-amount" label="Valor líquido mensal (R$)">
            <Input
              id="income-amount"
              inputMode="decimal"
              name="amount"
              placeholder="5.000,00"
              required
            />
          </Field>
          <Field hint="Vazio: hoje." id="income-starts" label="Desde">
            <Input id="income-starts" name="startsOn" type="date" />
          </Field>
          <Button className="mt-5.5" type="submit">
            Adicionar renda
          </Button>
        </form>
        {error && <FormError message={error.message} />}
      </CardContent>
    </Card>
  );
}

/** What a new Credit Operation of each type asks for. */
const OPERATION_TYPES = {
  FINANCING: {
    collateral: true,
    defaultModality: 'VEHICLE_FINANCING',
    label: 'Financiamento',
    modalities: MODALITY_KEYS.filter(isFinancing),
    namePlaceholder: 'Financiamento do carro',
    principalLabel: 'Valor financiado (R$)',
    submit: 'Adicionar financiamento',
  },
  LOAN: {
    collateral: false,
    defaultModality: 'PERSONAL_LOAN',
    label: 'Empréstimo',
    modalities: MODALITY_KEYS.filter(key => !isFinancing(key)),
    namePlaceholder: 'Empréstimo pessoal',
    principalLabel: 'Valor emprestado (R$)',
    submit: 'Adicionar empréstimo',
  },
} satisfies Record<
  string,
  {
    collateral: boolean;
    defaultModality: Modality;
    label: string;
    modalities: Modality[];
    namePlaceholder: string;
    principalLabel: string;
    submit: string;
  }
>;

type OperationType = keyof typeof OPERATION_TYPES;
type ObligationType = OperationType | 'CARD';

const OBLIGATION_TYPES: { label: string; value: ObligationType }[] = [
  { label: OPERATION_TYPES.LOAN.label, value: 'LOAN' },
  { label: OPERATION_TYPES.FINANCING.label, value: 'FINANCING' },
  { label: 'Cartão de crédito', value: 'CARD' },
];

function ObligationsSection({ holder }: { holder: Holder }) {
  const [type, setType] = useState<ObligationType>('LOAN');

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Nova Obrigação</CardTitle>
          <CardDescription>
            Parcelas vencidas contam como pagas em dia; registre Atrasos na página da operação.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className={FORM_GRID}>
            <Field id="obligation-type" label="Tipo">
              <Select onValueChange={value => setType(value as ObligationType)} value={type}>
                <SelectTrigger className="w-full" id="obligation-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBLIGATION_TYPES.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {type === 'CARD' ? (
            <CardForm holder={holder} />
          ) : (
            <OperationForm holder={holder} key={type} type={type} />
          )}
        </CardContent>
      </Card>
      {holder.creditOperations.length > 0 && <OperationsTable holder={holder} />}
      {holder.creditCards.length > 0 && <CardsList holder={holder} />}
    </>
  );
}

function OperationsTable({ holder }: { holder: Holder }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operações de Crédito</CardTitle>
      </CardHeader>
      <CardContent>
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
                    to={`/caishen/operations/${operation.id}`}
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
      </CardContent>
    </Card>
  );
}

/**
 * The rate the installment implies, worked out while the form is filled in, the same way the
 * server does when no rate is typed. `null` until principal, term and installment make sense.
 */
function impliedRatePreview(
  system: 'PRICE' | 'SAC',
  principal: string,
  term: string,
  installment: string
): { annual: number; monthly: number } | { error: string } | null {
  const principalCents = parseCents(principal);
  const installmentCents = parseCents(installment);
  const termMonths = Number(term);
  if (!principalCents || !installmentCents || !Number.isInteger(termMonths) || termMonths <= 0) {
    return null;
  }
  try {
    const monthly = impliedMonthlyRate(system, principalCents, installmentCents, termMonths);
    return { annual: monthlyToAnnualRate(monthly).toNumber(), monthly: monthly.toNumber() };
  } catch (error) {
    if (error instanceof ImpliedRateError) return { error: error.message };
    throw error;
  }
}

function OperationForm({ holder, type }: { holder: Holder; type: OperationType }) {
  const config = OPERATION_TYPES[type];
  const [createOperation, { error }] = useMutation(CreateCreditOperationDocument, {
    refetchQueries: [HolderDocument],
  });
  const [system, setSystem] = useState<'PRICE' | 'SAC'>('PRICE');
  const [typed, setTyped] = useState({ installment: '', principal: '', rate: '', term: '' });
  const preview = typed.rate.trim()
    ? null
    : impliedRatePreview(system, typed.principal, typed.term, typed.installment);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    // An Operation already under way: the first due date is the next one, minus what was paid.
    const paid = Number(values.get('paid') || 0);
    try {
      await createOperation({
        variables: {
          input: {
            collateralDescription: text(values, 'collateral'),
            firstDueDate: addMonths(text(values, 'nextDueDate')!, -paid),
            holderId: holder.id,
            installmentCents: parseCents(String(values.get('installment'))),
            lender: text(values, 'lender'),
            modality: values.get('modality') as Modality,
            monthlyRate: parsePercent(String(values.get('rate'))),
            name: text(values, 'name')!,
            principalCents: parseCents(String(values.get('principal')))!,
            system,
            termMonths: Number(values.get('term')),
          },
        },
      });
      form.reset();
      setTyped({ installment: '', principal: '', rate: '', term: '' });
    } catch {
      // Shown by `error` under the form; the typed values stay.
    }
  };

  return (
    <>
      <form
        className={FORM_GRID}
        onInput={event => {
          const values = new FormData(event.currentTarget);
          setTyped({
            installment: String(values.get('installment') ?? ''),
            principal: String(values.get('principal') ?? ''),
            rate: String(values.get('rate') ?? ''),
            term: String(values.get('term') ?? ''),
          });
        }}
        onSubmit={submit}
      >
        <Field id="op-name" label="Nome">
          <Input id="op-name" name="name" placeholder={config.namePlaceholder} required />
        </Field>
        <Field id="op-lender" label="Instituição">
          <Input id="op-lender" name="lender" placeholder="Banco, financeira…" />
        </Field>
        <Field id="op-modality" label="Modalidade">
          <Select defaultValue={config.defaultModality} name="modality">
            <SelectTrigger className="w-full" id="op-modality">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.modalities.map(key => (
                <SelectItem key={key} value={key}>
                  {MODALITIES[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="op-system" label="Sistema de amortização">
          <Select onValueChange={value => setSystem(value as 'PRICE' | 'SAC')} value={system}>
            <SelectTrigger className="w-full" id="op-system">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRICE">Price (parcela fixa)</SelectItem>
              <SelectItem value="SAC">SAC (amortização fixa)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field hint="O valor do contrato." id="op-principal" label={config.principalLabel}>
          <Input
            id="op-principal"
            inputMode="decimal"
            name="principal"
            placeholder="25.000,00"
            required
          />
        </Field>
        <Field id="op-term" label="Prazo (meses)">
          <Input id="op-term" min={1} name="term" placeholder="48" required type="number" />
        </Field>
        <Field hint="0 se ainda não pagou nenhuma." id="op-paid" label="Parcelas já pagas">
          <Input defaultValue={0} id="op-paid" min={0} name="paid" required type="number" />
        </Field>
        <Field id="op-next-due" label="Próximo vencimento">
          <Input id="op-next-due" name="nextDueDate" required type="date" />
        </Field>
        <Field
          hint={system === 'SAC' ? 'No SAC, a primeira parcela do contrato.' : undefined}
          id="op-installment"
          label="Parcela (R$)"
        >
          <Input id="op-installment" inputMode="decimal" name="installment" placeholder="850,00" />
        </Field>
        <Field hint="Só se souber a do contrato." id="op-rate" label="Taxa (% a.m.)">
          <Input
            id="op-rate"
            inputMode="decimal"
            name="rate"
            placeholder={preview && 'monthly' in preview ? formatPercent(preview.monthly) : '1,99'}
          />
        </Field>
        {config.collateral && (
          <Field id="op-collateral" label="Bem financiado">
            <Input id="op-collateral" name="collateral" placeholder="Opcional" />
          </Field>
        )}
        <Button className="mt-5.5" type="submit">
          {config.submit}
        </Button>
      </form>
      {preview && (
        <p className={'error' in preview ? 'text-destructive' : 'text-muted-foreground'}>
          {'error' in preview ? (
            preview.error
          ) : (
            <>
              Taxa calculada da parcela:{' '}
              <span className="font-medium text-foreground tabular-nums">
                {formatPercent(preview.monthly)} a.m.
              </span>{' '}
              ({formatPercent(preview.annual)} a.a.)
            </>
          )}
        </p>
      )}
      {error && <FormError message={error.message} />}
    </>
  );
}

function CardForm({ holder }: { holder: Holder }) {
  const [createCard, { error }] = useMutation(CreateCreditCardDocument, {
    refetchQueries: [HolderDocument],
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
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
    } catch {
      // Shown by `error` under the form; the typed values stay.
    }
  };

  return (
    <>
      <form className={FORM_GRID} onSubmit={submit}>
        <Field id="card-name" label="Nome do cartão">
          <Input id="card-name" name="name" placeholder="Nubank" required />
        </Field>
        <Field id="card-issuer" label="Emissor">
          <Input id="card-issuer" name="issuer" placeholder="Opcional" />
        </Field>
        <Field id="card-limit" label="Limite (R$)">
          <Input id="card-limit" inputMode="decimal" name="limit" placeholder="8.000,00" required />
        </Field>
        <Field id="card-closing" label="Dia de fechamento">
          <Input id="card-closing" max={31} min={1} name="closingDay" required type="number" />
        </Field>
        <Field id="card-due" label="Dia de vencimento">
          <Input id="card-due" max={31} min={1} name="dueDay" required type="number" />
        </Field>
        <Button className="mt-5.5" type="submit">
          Adicionar cartão
        </Button>
      </form>
      {error && <FormError message={error.message} />}
    </>
  );
}

function CardsList({ holder }: { holder: Holder }) {
  const [upsertStatement, { error }] = useMutation(UpsertStatementDocument, {
    refetchQueries: [HolderDocument],
  });

  const submitStatement = (creditCardId: string) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amountCents = parseCents(String(values.get('amount')));
    if (amountCents == null) return;
    try {
      await upsertStatement({
        variables: {
          input: { amountCents, creditCardId, referenceMonth: String(values.get('month')) },
        },
      });
      form.reset();
    } catch {
      // Shown by `error` under the Cards; the typed values stay.
    }
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
              <form className={FORM_GRID} onSubmit={submitStatement(card.id)}>
                <Field id={`month-${card.id}`} label="Mês de vencimento">
                  <Input id={`month-${card.id}`} name="month" required type="month" />
                </Field>
                <Field id={`amount-${card.id}`} label="Valor da Fatura (R$)">
                  <Input
                    id={`amount-${card.id}`}
                    inputMode="decimal"
                    name="amount"
                    placeholder="1.250,00"
                    required
                  />
                </Field>
                <Button className="mt-5.5" type="submit" variant="outline">
                  Salvar Fatura
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
        {error && <FormError message={error.message} />}
      </CardContent>
    </Card>
  );
}
