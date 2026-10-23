import { useMutation, useQuery } from '@apollo/client/react';
import {
  ClearCompanyRevenueDocument,
  CompanyDocument,
  SaveCompanyDocument,
  SetCompanyRevenueDocument,
  ViewerHolderDocument,
  type CompanyActivity,
  type CompanyQuery,
  type SimplesAnnex,
  type TaxRegime,
} from '@zapbots/graphql/client';
import { PencilIcon, ReceiptTextIcon, XIcon } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { EntriesTabs } from '../components/EntriesTabs';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { QueryError } from '../components/QueryError';
import { Sheet } from '../components/Sheet';
import { localToday } from '../lib/bots';
import { formatCents, formatDate, formatPercent, parseCents } from '../lib/format';

type Holder = NonNullable<CompanyQuery['holder']>;
type Company = NonNullable<Holder['company']>;
type CompanyMonth = Company['months'][number];

const REGIMES: { hint: string; label: string; value: TaxRegime }[] = [
  { hint: 'Até R$ 81 mil por ano, DAS de valor fixo.', label: 'MEI', value: 'MEI' },
  {
    hint: 'Uma guia (DAS) com tudo, pela faixa do faturamento.',
    label: 'Simples Nacional',
    value: 'SIMPLES',
  },
  {
    hint: 'Impostos sobre um lucro presumido do faturamento.',
    label: 'Lucro Presumido',
    value: 'PRESUMIDO',
  },
  { hint: 'Sobre o lucro de fato; feito com o contador.', label: 'Lucro Real', value: 'REAL' },
];

const ANNEXES: { label: string; value: SimplesAnnex }[] = [
  { label: 'Anexo I · Comércio', value: 'I' },
  { label: 'Anexo II · Indústria', value: 'II' },
  { label: 'Anexo III · Serviços (a maioria)', value: 'III' },
  { label: 'Anexo IV · Obras, limpeza, advocacia', value: 'IV' },
  { label: 'Anexo V · Tecnologia, consultoria e outros intelectuais', value: 'V' },
];

const ACTIVITIES: { label: string; value: CompanyActivity }[] = [
  { label: 'Serviços', value: 'SERVICES' },
  { label: 'Comércio', value: 'COMMERCE' },
  { label: 'Indústria', value: 'INDUSTRY' },
  { label: 'Comércio e serviços', value: 'COMMERCE_SERVICES' },
];

const regimeName = (regime: TaxRegime) => REGIMES.find(item => item.value === regime)!.label;

/** "11.222.333/0001-81". */
const cnpjName = (cnpj: string) =>
  cnpj.length === 14
    ? `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
    : cnpj;

/** "09/2026". */
const competenceName = (month: string) => `${month.slice(5)}/${month.slice(0, 4)}`;

/** Cents as people type them back: 162100 → "1.621,00". */
const typed = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

/** The current month, `YYYY-MM`, the newest competência the page lists. */
const thisMonth = () => localToday().slice(0, 7);

/**
 * Impostos: the taxes of the Titular's company, for whoever registered a CNPJ. Its regime, the
 * pró-labore, each competência's revenue (as declared, or as its Fonte de Renda brought it in) and
 * the guides that come of it, which also show in Lançamentos in the month they fall due.
 */
export function TaxesPage() {
  const viewer = useQuery(ViewerHolderDocument);
  const holderId = viewer.data?.viewerHolder.id;
  const { data, error, loading, refetch } = useQuery(CompanyDocument, {
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network',
    skip: !holderId,
    variables: { holderId: holderId!, upTo: thisMonth() },
  });
  const [editing, setEditing] = useState(false);
  const [revenueOf, setRevenueOf] = useState<string | null>(null);
  const holder = data?.holder;
  const failure = viewer.error ?? (!holder ? error : undefined);

  if (failure) {
    return (
      <QueryError
        error={failure}
        onRetry={() => (viewer.error ? viewer.refetch() : refetch())}
        title="Não foi possível carregar os impostos"
      />
    );
  }
  if (!holder || (loading && !data)) return <PageSkeleton />;
  const company = holder.company;

  if (!company) {
    return (
      <BotPage
        bot="FINANCE"
        description="Para quem tem CNPJ: o Caishen calcula o DAS, o INSS e o IRRF do pró-labore e põe as guias nas Saídas do mês em que vencem."
        eyebrow={<EntriesTabs />}
        title="Impostos"
      >
        <Sheet
          id="company"
          intro="Comece pelo CNPJ e pelo regime. Dá para mudar tudo depois."
          title="Cadastre sua empresa"
        >
          <CompanyForm holder={holder} />
        </Sheet>
      </BotPage>
    );
  }

  const today = localToday();
  const upcoming = company.months
    .flatMap(month => month.guides)
    .filter(guide => guide.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <BotPage
      actions={
        <>
          <Button onClick={() => setEditing(true)} variant="outline">
            <PencilIcon />
            Editar empresa
          </Button>
          {company.regime !== 'MEI' && company.regime !== 'REAL' && (
            <Button onClick={() => setRevenueOf(lastCompetence())}>
              <ReceiptTextIcon />
              Informar faturamento
            </Button>
          )}
        </>
      }
      bot="FINANCE"
      description={`${company.name ?? 'Sua empresa'} · CNPJ ${cnpjName(company.cnpj)} · ${regimeName(company.regime)}${company.annex ? `, Anexo ${company.annex}${company.fatorR ? ' (Fator R)' : ''}` : ''}${company.exports ? ' · exportação' : ''}`}
      eyebrow={<EntriesTabs />}
      title="Impostos"
    >
      {company.regime === 'REAL' && (
        <Alert>
          <AlertTitle>No Lucro Real, o cálculo é com o contador</AlertTitle>
          <AlertDescription>
            O Caishen não calcula o Lucro Real. Registre as guias em Saídas fixas, em Impostos, para
            que entrem nos meses certos.
          </AlertDescription>
        </Alert>
      )}
      {company.months.some(month => month.overLimit) && (
        <Alert variant="destructive">
          <AlertTitle>O faturamento passou do limite do Simples</AlertTitle>
          <AlertDescription>
            Com mais de R$ 4,8 milhões em 12 meses, a empresa sai do Simples Nacional. Fale com o
            seu contador.
          </AlertDescription>
        </Alert>
      )}

      <Upcoming guides={upcoming} />
      {company.regime !== 'MEI' && <ProLaborePanel company={company} />}
      {company.regime !== 'REAL' && <Competences company={company} onEdit={setRevenueOf} />}

      {editing && (
        <Dialog onOpenChange={open => !open && setEditing(false)} open>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar empresa</DialogTitle>
              <DialogDescription>
                Mudar o regime ou o Anexo refaz o cálculo de todos os meses.
              </DialogDescription>
            </DialogHeader>
            <CompanyForm company={company} holder={holder} onDone={() => setEditing(false)} />
          </DialogContent>
        </Dialog>
      )}
      {revenueOf && (
        <RevenueDialog company={company} month={revenueOf} onClose={() => setRevenueOf(null)} />
      )}
    </BotPage>
  );
}

/** The competência usually being declared: last month's. */
function lastCompetence() {
  const [year, month] = thisMonth().split('-').map(Number) as [number, number];
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
}

/** The guides still to pay, the nearest first, each with what it is made of. */
function Upcoming({ guides }: { guides: Company['months'][number]['guides'] }) {
  const total = guides.reduce((sum, guide) => sum + guide.amountCents, 0);
  return (
    <Sheet
      id="upcoming"
      intro="O que a empresa ainda vai pagar. Já está nas Saídas de Lançamentos, no dia em que vence."
      title="Guias a pagar"
      total={guides.length > 0 ? formatCents(total) : undefined}
    >
      {guides.length ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {guides.map(guide => (
            <li
              className="flex flex-col gap-1 rounded-xl bg-secondary/60 px-4 py-3.5"
              key={`${guide.name}-${guide.dueDate}`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium">{guide.name}</span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatCents(guide.amountCents)}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                Vence em {formatDate(guide.dueDate)} · {guide.detail}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          Nenhuma guia a pagar. Informe o faturamento do último mês para ver o DAS.
        </p>
      )}
    </Sheet>
  );
}

/** The monthly pró-labore as a payslip: gross, what is kept for INSS and IRRF, and what is left. */
function ProLaborePanel({ company }: { company: Company }) {
  const pay = company.proLabore;
  if (!pay.grossCents) {
    return (
      <Sheet
        id="pro-labore"
        intro="Sem pró-labore cadastrado. Em Editar empresa, informe o valor bruto mensal."
        title="Pró-labore"
      >
        <p className="text-muted-foreground">
          Quem trabalha na empresa e não é MEI deve ter pró-labore: ele paga o seu INSS.
        </p>
      </Sheet>
    );
  }
  const rows = [
    { label: 'Bruto', value: pay.grossCents },
    { label: 'INSS (11%)', minus: true, value: pay.inssCents },
    { label: 'IRRF', minus: true, value: pay.irrfCents },
  ];
  return (
    <Sheet
      id="pro-labore"
      intro="O que a empresa paga a você todo mês e o que fica retido. O INSS e o IRRF vão no DARF."
      title="Pró-labore"
      total={formatCents(pay.netCents)}
    >
      <div className="grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-4">
        {[...rows, { label: 'Líquido', value: pay.netCents }].map(row => (
          <div className="flex flex-col gap-1 bg-card p-4" key={row.label}>
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <strong className="text-2xl font-semibold tracking-tight tabular-nums">
              {'minus' in row && row.value > 0
                ? `− ${formatCents(row.value)}`
                : formatCents(row.value)}
            </strong>
          </div>
        ))}
      </div>
      {pay.employerInssCents > 0 && (
        <p className="text-sm">
          A empresa paga ainda {formatCents(pay.employerInssCents)} de INSS patronal (20%), que no
          seu regime fica fora do DAS.
        </p>
      )}
    </Sheet>
  );
}

const ORIGINS: Record<CompanyMonth['revenueOrigin'], ReactNode> = {
  DECLARED: <Badge variant="secondary">declarado</Badge>,
  INCOME_SOURCE: <Badge variant="outline">da Fonte de Renda</Badge>,
  NONE: null,
};

/** Each competência: its revenue, RBT12, bracket and rate, and the guides due the month after. */
function Competences({ company, onEdit }: { company: Company; onEdit: (month: string) => void }) {
  const [clear] = useMutation(ClearCompanyRevenueDocument, { refetchQueries: 'active' });
  const simples = company.regime === 'SIMPLES';
  return (
    <Sheet
      id="competences"
      intro="O faturamento de cada mês e as guias que ele gera, que vencem no mês seguinte."
      title="Mês a mês"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Competência</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            {simples && <TableHead className="text-right">RBT12</TableHead>}
            {simples && <TableHead>Faixa e alíquota</TableHead>}
            <TableHead className="text-right">Guias</TableHead>
            <TableHead>Vence</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {company.months.map(month => {
            const guides = month.guides.reduce((sum, guide) => sum + guide.amountCents, 0);
            return (
              <TableRow key={month.month}>
                <TableCell className="tabular-nums">{competenceName(month.month)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="flex items-center justify-end gap-2">
                    {ORIGINS[month.revenueOrigin]}
                    {month.revenueOrigin === 'NONE' ? '—' : formatCents(month.revenueCents)}
                  </span>
                </TableCell>
                {simples && (
                  <TableCell
                    className="text-right tabular-nums"
                    title={month.rbt12Typed ? 'Informado' : 'Calculado pelos meses anteriores'}
                  >
                    {month.revenueOrigin === 'NONE' && !month.rbt12Typed ? (
                      '—'
                    ) : (
                      <>
                        {formatCents(month.rbt12Cents)}
                        {!month.rbt12Typed && <span className="text-muted-foreground"> *</span>}
                      </>
                    )}
                  </TableCell>
                )}
                {simples && (
                  <TableCell className="tabular-nums">
                    {month.bracket && month.revenueOrigin !== 'NONE'
                      ? `Anexo ${month.annex}, ${month.bracket}ª · ${formatPercent(month.effectiveRate)}`
                      : '—'}
                  </TableCell>
                )}
                <TableCell className="text-right font-medium tabular-nums">
                  {guides ? formatCents(guides) : '—'}
                </TableCell>
                <TableCell className="tabular-nums">
                  {month.guides[0] ? formatDate(month.guides[0].dueDate) : '—'}
                </TableCell>
                <TableCell>
                  <span className="flex justify-end gap-1">
                    <Button
                      aria-label={`Informar faturamento de ${competenceName(month.month)}`}
                      onClick={() => onEdit(month.month)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <PencilIcon />
                    </Button>
                    {month.revenueOrigin === 'DECLARED' && (
                      <Button
                        aria-label={`Apagar o faturamento declarado de ${competenceName(month.month)}`}
                        onClick={() =>
                          void clear({ variables: { companyId: company.id, month: month.month } })
                        }
                        size="icon-sm"
                        variant="ghost"
                      >
                        <XIcon />
                      </Button>
                    )}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {simples && (
        <p className="text-sm text-muted-foreground">
          * RBT12 calculado: a soma dos 12 meses anteriores (ou a média vezes 12, no primeiro ano).
          Se o PGDAS-D mostrar outro, informe-o junto do faturamento.
        </p>
      )}
    </Sheet>
  );
}

/** What was declared for one competência, and its RBT12 when the PGDAS-D shows another. */
function RevenueDialog({
  company,
  month: initial,
  onClose,
}: {
  company: Company;
  month: string;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(initial);
  // What is known of the competência picked now, so switching it shows its own numbers.
  const known = company.months.find(item => item.month === month);
  const [save, { error, loading }] = useMutation(SetCompanyRevenueDocument, {
    refetchQueries: 'active',
  });
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const amountCents = parseCents(String(values.get('amount')));
    const rbt12 = String(values.get('rbt12') ?? '').trim();
    const rbt12Cents = rbt12 ? parseCents(rbt12) : null;
    if (amountCents == null || (rbt12 && rbt12Cents == null)) {
      setProblem('Confira os valores: use números como 23.489,10.');
      return;
    }
    setProblem(null);
    try {
      await save({
        variables: { input: { amountCents, companyId: company.id, month, rbt12Cents } },
      });
      onClose();
    } catch {
      // Shown by `error` in the dialog.
    }
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Faturamento de {competenceName(month)}</DialogTitle>
          <DialogDescription>
            O que a empresa declarou no mês. As guias vencem no dia 20 do mês seguinte.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" id="revenue" onSubmit={submit}>
          <Field id="revenue-month" label="Competência">
            <Input
              id="revenue-month"
              max={thisMonth()}
              onChange={event => event.target.value && setMonth(event.target.value)}
              type="month"
              value={month}
            />
          </Field>
          <Field id="revenue-amount" label="Faturamento (R$)">
            <Input
              defaultValue={
                known && known.revenueOrigin !== 'NONE' ? typed(known.revenueCents) : ''
              }
              id="revenue-amount"
              inputMode="decimal"
              key={`amount-${month}`}
              name="amount"
              placeholder="23.489,10"
              required
            />
          </Field>
          {company.regime === 'SIMPLES' && (
            <Field
              hint="Está no PGDAS-D, como RBT12. Em branco, o Caishen soma os 12 meses anteriores."
              id="revenue-rbt12"
              label="Receita dos 12 meses anteriores (opcional)"
            >
              <Input
                defaultValue={known?.rbt12Typed ? typed(known.rbt12Cents) : ''}
                id="revenue-rbt12"
                inputMode="decimal"
                key={`rbt12-${month}`}
                name="rbt12"
                placeholder="150.000,00"
              />
            </Field>
          )}
        </form>
        {(problem || error) && <FormError message={problem ?? error!.message} />}
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            Cancelar
          </Button>
          <Button disabled={loading} form="revenue" type="submit">
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

/** The company: CNPJ, regime and what its taxes depend on. New or, with `company`, changed. */
function CompanyForm({
  company,
  holder,
  onDone,
}: {
  company?: Company;
  holder: Holder;
  onDone?: () => void;
}) {
  const [save, { error, loading }] = useMutation(SaveCompanyDocument, { refetchQueries: 'active' });
  const [regime, setRegime] = useState<TaxRegime>(company?.regime ?? 'SIMPLES');
  const [annex, setAnnex] = useState<SimplesAnnex>(company?.annex ?? 'III');
  const [activity, setActivity] = useState<CompanyActivity>(company?.activity ?? 'SERVICES');
  const [fatorR, setFatorR] = useState(company?.fatorR ?? false);
  const [exports, setExports] = useState(company?.exports ?? false);
  const [source, setSource] = useState(company?.revenueSourceId ?? 'none');
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const proLabore = String(values.get('proLabore') ?? '').trim();
    const proLaboreCents = proLabore ? parseCents(proLabore) : 0;
    if (proLaboreCents == null) {
      setProblem('Confira o pró-labore: use números como 1.621,00.');
      return;
    }
    setProblem(null);
    try {
      await save({
        variables: {
          input: {
            activity,
            annex: regime === 'SIMPLES' ? annex : null,
            cnpj: String(values.get('cnpj')),
            exports,
            fatorR: regime === 'SIMPLES' && fatorR,
            holderId: holder.id,
            issRate: regime === 'PRESUMIDO' ? String(values.get('iss') ?? '') : null,
            name: String(values.get('name') ?? '').trim() || null,
            proLaboreCents: regime === 'MEI' ? 0 : proLaboreCents,
            regime,
            revenueSourceId: source === 'none' ? null : source,
            startsOn: String(values.get('startsOn')),
          },
        },
      });
      onDone?.();
    } catch {
      // Shown by `error` under the form.
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] items-start gap-3">
        <Field id="company-cnpj" label="CNPJ">
          <Input
            autoComplete="off"
            defaultValue={company ? cnpjName(company.cnpj) : ''}
            id="company-cnpj"
            name="cnpj"
            placeholder="00.000.000/0001-00"
            required
          />
        </Field>
        <Field id="company-name" label="Nome (opcional)">
          <Input defaultValue={company?.name ?? ''} id="company-name" name="name" />
        </Field>
        <Field
          hint={REGIMES.find(item => item.value === regime)!.hint}
          id="company-regime"
          label="Regime tributário"
        >
          <Select onValueChange={value => setRegime(value as TaxRegime)} value={regime}>
            <SelectTrigger className="w-full" id="company-regime">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGIMES.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {regime === 'SIMPLES' ? (
          <Field hint="Está no seu PGDAS-D ou com o contador." id="company-annex" label="Anexo">
            <Select onValueChange={value => setAnnex(value as SimplesAnnex)} value={annex}>
              <SelectTrigger className="w-full" id="company-annex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANNEXES.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : (
          <Field id="company-activity" label="Atividade">
            <Select onValueChange={value => setActivity(value as CompanyActivity)} value={activity}>
              <SelectTrigger className="w-full" id="company-activity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITIES.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {regime !== 'MEI' && (
          <Field
            hint="O valor bruto, antes do INSS e do IRRF."
            id="company-pro-labore"
            label="Pró-labore mensal (R$)"
          >
            <Input
              defaultValue={company?.proLaboreCents ? typed(company.proLaboreCents) : ''}
              id="company-pro-labore"
              inputMode="decimal"
              name="proLabore"
              placeholder="1.621,00"
            />
          </Field>
        )}
        {regime === 'PRESUMIDO' && (
          <Field hint="De 2% a 5%, conforme a cidade." id="company-iss" label="ISS (%)">
            <Input
              defaultValue={
                company?.issRate != null ? String(company.issRate * 100).replace('.', ',') : ''
              }
              id="company-iss"
              inputMode="decimal"
              name="iss"
              placeholder="5"
            />
          </Field>
        )}
        <Field
          hint="Para o Caishen ler o faturamento de cada mês dela, quando você não informar."
          id="company-source"
          label="O faturamento chega como"
        >
          <Select onValueChange={setSource} value={source}>
            <SelectTrigger className="w-full" id="company-source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Só o que eu informar</SelectItem>
              {holder.incomeSources.map(item => (
                <SelectItem key={item.id} value={item.id}>
                  {item.description}
                  {item.currency === 'USD' ? ' (em dólar)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="company-starts" label="Calcular a partir de">
          <Input
            defaultValue={company?.startsOn ?? `${localToday().slice(0, 4)}-01-01`}
            id="company-starts"
            name="startsOn"
            required
            type="date"
          />
        </Field>
      </div>
      <div className="flex flex-col gap-3">
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={exports} onCheckedChange={on => setExports(on === true)} />
          O faturamento vem do exterior (exportação): sem PIS, Cofins, ISS e ICMS
        </Label>
        {regime === 'SIMPLES' && (
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={fatorR} onCheckedChange={on => setFatorR(on === true)} />
            Sujeita ao Fator R: Anexo III com folha de 28% ou mais do faturamento, senão Anexo V
          </Label>
        )}
      </div>
      {(problem || error) && <FormError message={problem ?? error!.message} />}
      <div className="flex gap-2">
        <Button disabled={loading} type="submit">
          {loading ? 'Salvando…' : company ? 'Salvar' : 'Cadastrar empresa'}
        </Button>
        {onDone && (
          <Button onClick={onDone} type="button" variant="ghost">
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
