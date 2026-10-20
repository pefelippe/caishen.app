import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  ArrowLeftIcon,
  BotIcon,
  BriefcaseIcon,
  BuildingIcon,
  CheckIcon,
  CoinsIcon,
  CreditCardIcon,
  DownloadIcon,
  FileTextIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  MessageCircleIcon,
  MessageCirclePlusIcon,
  PaperclipIcon,
  PlugIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { downloadMarkdown } from '../lib/documents';
import { formatCents, formatDate } from '../lib/format';
import { useDesktop } from '../lib/media';
import { BotGlyph } from './BotGlyph';
import { DocumentToolbar } from './DocumentToolbar';
import { Metric, Metrics } from './Metric';
import { ScoreBadge } from './ScoreBadge';

/*
 * The app as a visitor can try it on the landing page: the rail, the top bar with the chat
 * panel, the chat page, the Caishen's tabs and each screen, filled with sample figures. Nothing
 * here talks to the server; every action that would save something leads to /sign-in.
 */

type Screen =
  | 'chat'
  | 'dashboard'
  | 'document'
  | 'documents'
  | 'finance'
  | 'integrations'
  | 'job'
  | 'jobs'
  | 'models'
  | 'organization'
  | 'plan';

const RAIL: { icon: LucideIcon; label: string; screens: Screen[]; to: Screen }[] = [
  { icon: LayoutDashboardIcon, label: 'Dashboard', screens: ['dashboard'], to: 'dashboard' },
  { icon: MessageCircleIcon, label: 'Chat', screens: ['chat'], to: 'chat' },
  { icon: FileTextIcon, label: 'Documentos', screens: ['documents', 'document'], to: 'documents' },
  { icon: CoinsIcon, label: 'Caishen', screens: ['finance', 'jobs', 'job'], to: 'finance' },
  { icon: PlugIcon, label: 'Integrações', screens: ['integrations'], to: 'integrations' },
  { icon: BotIcon, label: 'Modelos', screens: ['models'], to: 'models' },
  { icon: CreditCardIcon, label: 'Plano', screens: ['plan'], to: 'plan' },
  { icon: BuildingIcon, label: 'Organização', screens: ['organization'], to: 'organization' },
];

const PANEL_WIDTH = 340;
const EASE = [0.22, 1, 0.36, 1] as const;

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const JOBS = [
  {
    createdAt: daysAgo(2),
    deliverable: [
      'Ordem para quitar as dívidas',
      '1. Empréstimo pessoal: é a taxa mais alta das suas Operações de Crédito, então cada real amortizado nele rende mais.',
      '2. Financiamento do carro: a taxa é menor e há garantia; siga com as Parcelas normais.',
      '3. Cartão: pague a Fatura inteira todo mês para não entrar no rotativo.',
      'Próximo passo',
      'Use o aluguel da kitnet para uma Amortização Extraordinária mensal no empréstimo pessoal e ponha a Parcela em débito automático para não atrasar de novo.',
    ],
    id: 'plan',
    instructions: 'Monte um plano para eu quitar minhas dívidas, começando pela mais cara.',
    routine: false,
  },
  {
    createdAt: daysAgo(9),
    deliverable: [
      'Resumo do mês',
      'Venceram as Parcelas do carro e do empréstimo pessoal e a Fatura do Itaú; nenhuma em atraso.',
      'Nos próximos 30 dias vêm a Fatura do Itaú e as próximas Parcelas.',
      'O Score ficou na faixa de risco médio. O que mais pesa é a Utilização de Limite dos Cartões.',
    ],
    id: 'month',
    instructions: 'Resuma meu mês: o que venceu, o que vem por aí e como está meu Score.',
    routine: true,
  },
];

const OPERATIONS = [
  {
    balance: 937_956,
    installment: 72_392,
    lender: 'Nubank',
    modality: 'Crédito pessoal',
    name: 'Empréstimo pessoal',
    paid: '7/24',
    rate: '3,20%',
    stage: 1,
  },
  {
    balance: 4_340_869,
    installment: 185_637,
    lender: 'Banco Itaú',
    modality: 'Financiamento de veículo',
    name: 'Financiamento do carro',
    paid: '14/48',
    rate: '1,59%',
    stage: 1,
  },
  {
    balance: 25_977_778,
    installment: 290_796,
    lender: 'Caixa',
    modality: 'Financiamento imobiliário',
    name: 'Financiamento do apartamento',
    paid: '26/360',
    rate: '0,82%',
    stage: 1,
  },
];

const CARDS = [
  {
    closing: 3,
    due: 10,
    limit: 1_200_000,
    name: 'Nubank Ultravioleta',
    statements: [
      ['Fatura atual', 317_840],
      ['Fatura anterior', 284_512],
    ] as const,
  },
  {
    closing: 20,
    due: 27,
    limit: 800_000,
    name: 'Itaú Platinum',
    statements: [['Fatura atual', 142_990]] as const,
  },
];

const ALERTS = [
  { message: 'Empréstimo pessoal tem R$ 723,92 em atraso.', overdue: true },
  { message: 'A Fatura do Nubank Ultravioleta, de R$ 3.178,40, vence no dia 10.', overdue: false },
];

const CONVERSATIONS = [
  {
    id: 'first',
    messages: [
      { mine: true, text: 'Tenho R$ 500 sobrando por mês. Qual dívida eu ataco primeiro?' },
      {
        mine: false,
        text: 'O empréstimo pessoal do Nubank. A taxa dele, 3,20% a.m., é a mais alta das suas Operações de Crédito, então cada real a mais rende mais ali. O financiamento do carro, a 1,59% a.m., segue com as Parcelas normais.',
      },
      { mine: true, text: 'E a parcela que está atrasada?' },
      {
        mine: false,
        text: 'Pague primeiro os R$ 723,92 em atraso, antes de amortizar. Atraso pesa mais no seu Score do que o saldo devedor.',
      },
    ],
    title: 'Qual dívida eu quito primeiro?',
  },
  {
    id: 'card',
    messages: [
      { mine: true, text: 'A Fatura do Nubank deste mês está alta?' },
      {
        mine: false,
        text: 'É a maior dos últimos meses: R$ 3.178,40, contra R$ 2.845,12 no mês passado. Usa cerca de 26% do limite de R$ 12.000,00 e vence no dia 10.',
      },
    ],
    title: 'Fatura do Nubank',
  },
];

/** A Deliverable's text as the document page shows it: its title and sections as headings. */
const markdownOf = (job: (typeof JOBS)[number]) =>
  job.deliverable
    .map((line, index) =>
      index === 0 ? `# ${line}` : line === 'Próximo passo' ? `## ${line}` : line
    )
    .join('\n\n');

/** The interactive copy of the app, opening on the Dashboard. */
export function LandingPreview() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [jobId, setJobId] = useState(JOBS[0]!.id);
  const [chat, setChat] = useState(false);
  // Each blank Conversation asked for remounts the chat on one.
  const [blank, setBlank] = useState(0);
  const openJob = (id: string) => {
    setJobId(id);
    setScreen('job');
  };
  const openDocument = (id: string) => {
    setJobId(id);
    setScreen('document');
  };
  const startChat = () => {
    setBlank(count => count + 1);
    if (screen !== 'chat') setChat(true);
  };

  const isCaishen = screen === 'finance' || screen === 'jobs' || screen === 'job';
  const title = RAIL.find(entry => entry.screens.includes(screen))!.label;

  return (
    <div className="preview" data-ui>
      <div className="flex h-full min-h-0">
        <nav
          aria-label="Telas do app"
          className="relative flex w-[72px] shrink-0 flex-col items-center gap-1 overflow-y-auto bg-rail pt-4 pb-20 sm:w-24"
        >
          <span className="mb-5 flex flex-col items-center gap-1 text-paper">
            <BotGlyph bot="FINANCE" className="bg-paper text-rail" size={32} />
            <span className="text-[11px] font-semibold tracking-tight">Caishen</span>
          </span>
          {RAIL.map(entry => {
            const active = entry.screens.includes(screen);
            return (
              <Button
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative h-auto w-16 shrink-0 flex-col gap-1 rounded-lg px-1 py-2.5 text-[11px] font-medium text-rail-foreground hover:bg-white/10 hover:text-paper sm:w-[88px] has-[>svg]:px-0.5',
                  active && 'bg-white/15 text-paper'
                )}
                key={entry.to}
                onClick={() => {
                  setScreen(entry.to);
                  if (entry.to === 'chat') setChat(false);
                }}
                type="button"
                variant="ghost"
              >
                {active && (
                  <span aria-hidden className="absolute -left-1 h-6 w-1 rounded-r bg-paper" />
                )}
                <entry.icon className="!size-5" />
                <span className="max-w-full truncate leading-none">{entry.label}</span>
              </Button>
            );
          })}
          <span className="absolute bottom-4 grid size-10 shrink-0 place-items-center rounded-full bg-paper text-xs font-semibold text-rail">
            AS
          </span>
        </nav>

        <div className="relative flex min-w-0 flex-1 flex-col bg-background">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-card px-5">
            <span className="truncate font-medium">{title}</span>
            {screen !== 'chat' && (
              <Button
                aria-expanded={chat}
                onClick={() => setChat(current => !current)}
                size="sm"
                type="button"
                variant={chat ? 'secondary' : 'outline'}
              >
                <MessageCircleIcon />
                Caishen
              </Button>
            )}
          </header>
          <div className="relative flex min-h-0 flex-1">
            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
              {isCaishen && <CaishenHeader onScreen={setScreen} screen={screen} />}
              {screen === 'document' ? (
                <DocumentScreen
                  id={jobId}
                  key={`document-${jobId}`}
                  onBack={() => setScreen('documents')}
                />
              ) : screen === 'chat' ? (
                <div className="page-enter mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
                  <ChatThread blank={blank > 0} key={`page-${blank}`} onNew={startChat} />
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div
                    className="page-enter w-full px-5 pt-8 pb-16 md:px-10"
                    key={screen === 'job' ? `job-${jobId}` : screen}
                  >
                    {screen === 'dashboard' && (
                      <DashboardScreen onChat={startChat} onJob={openJob} onScreen={setScreen} />
                    )}
                    {screen === 'documents' && <DocumentsScreen onOpen={openDocument} />}
                    {screen === 'integrations' && <IntegrationsScreen />}
                    {screen === 'finance' && <FinanceScreen />}
                    {screen === 'jobs' && <JobsScreen onJob={openJob} />}
                    {screen === 'job' && (
                      <JobScreen
                        id={jobId}
                        onBack={() => setScreen('jobs')}
                        onDocument={() => openDocument(jobId)}
                      />
                    )}
                    {screen === 'models' && <ModelsScreen />}
                    {screen === 'plan' && <PlanScreen />}
                    {screen === 'organization' && <OrganizationScreen />}
                  </div>
                </div>
              )}
            </div>
            <ChatPanel
              blank={blank}
              onClose={() => setChat(false)}
              onNew={startChat}
              open={chat && screen !== 'chat'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The Caishen's header, as BotLayout draws it: who he is and his tabs. */
function CaishenHeader({
  onScreen,
  screen,
}: {
  onScreen: (screen: Screen) => void;
  screen: Screen;
}) {
  const tabs: [Screen, string][] = [
    ['finance', 'Finanças'],
    ['jobs', 'Workflows'],
  ];
  return (
    <header
      className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b bg-card px-4 pt-3 md:px-6"
      data-bot="FINANCE"
    >
      <div className="flex items-center gap-3 pb-3">
        <BotGlyph bot="FINANCE" size={36} />
        <div className="leading-tight">
          <div className="font-serif text-lg">Caishen</div>
          <div className="text-xs text-muted-foreground">Finanças</div>
        </div>
      </div>
      <nav aria-label="Abas do Caishen" className="flex gap-1 self-end">
        {tabs.map(([to, label]) => {
          const active = screen === to || (to === 'jobs' && screen === 'job');
          return (
            <Button
              aria-current={active ? 'page' : undefined}
              className={cn(
                'h-10 rounded-none border-b-2 border-transparent px-3 text-muted-foreground hover:bg-transparent hover:text-foreground',
                active && 'border-ink text-foreground'
              )}
              key={to}
              onClick={() => onScreen(to)}
              type="button"
              variant="ghost"
            >
              {label}
            </Button>
          );
        })}
      </nav>
    </header>
  );
}

function PageTitle({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <h1>{children}</h1>
      {note && <p className="text-muted-foreground">{note}</p>}
    </header>
  );
}

function Panel({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3 border-t pt-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function AlertItems() {
  return (
    <ul className="flex max-w-prose flex-col divide-y">
      {ALERTS.map(alert => (
        <li className="flex items-baseline gap-2 py-1.5" key={alert.message}>
          <span
            aria-hidden
            className={cn(
              'size-1.5 shrink-0 translate-y-[-1px] rounded-full',
              alert.overdue ? 'bg-destructive' : 'bg-ink'
            )}
          />
          <span>{alert.message}</span>
        </li>
      ))}
    </ul>
  );
}

function JobRows({ onJob }: { onJob: (id: string) => void }) {
  return (
    <ul className="flex flex-col divide-y">
      {JOBS.map(job => (
        <li className="flex items-center gap-3 py-2" key={job.id}>
          <BotGlyph bot="FINANCE" size={24} />
          <Button
            className="h-auto min-w-0 flex-1 justify-start truncate p-0 font-normal underline-offset-4 hover:bg-transparent hover:underline"
            onClick={() => onJob(job.id)}
            type="button"
            variant="ghost"
          >
            <span className="truncate">{job.instructions}</span>
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDate(job.createdAt)}
          </span>
          <Badge variant="secondary">pronto</Badge>
        </li>
      ))}
    </ul>
  );
}

function DashboardScreen({
  onChat,
  onJob,
  onScreen,
}: {
  onChat: () => void;
  onJob: (id: string) => void;
  onScreen: (screen: Screen) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              weekday: 'long',
            })}
          </span>
          <h1>Olá, Ana</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onScreen('jobs')} type="button" variant="outline">
            <BriefcaseIcon />
            Novo Workflow
          </Button>
          <Button onClick={onChat} type="button">
            <MessageCirclePlusIcon />
            Nova conversa
          </Button>
        </div>
      </header>
      <Metrics>
        <Metric
          label="Score"
          note={formatDate(new Date().toISOString())}
          value={<ScoreBadge band="MEDIUM" score={580} />}
        />
        <Metric
          label="Saldo devedor"
          note="3 Operações de Crédito"
          value={formatCents(31_256_603)}
        />
        <Metric label="A vencer em 30 dias" value={formatCents(887_483)} />
        <Metric label="Renda mensal" value={formatCents(970_000)} />
        <Metric label="Workflows no mês" note="1 de Rotina" value={2} />
      </Metrics>
      <div className="grid gap-10 lg:grid-cols-2">
        <Panel title="Avisos">
          <div data-bot="FINANCE">
            <AlertItems />
          </div>
        </Panel>
        <Panel title="Últimos Workflows">
          <JobRows onJob={onJob} />
        </Panel>
      </div>
    </div>
  );
}

function JobScreen({
  id,
  onBack,
  onDocument,
}: {
  id: string;
  onBack: () => void;
  onDocument: () => void;
}) {
  const job = JOBS.find(item => item.id === id)!;
  const [title, ...lines] = job.deliverable;
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Button
        className="w-fit px-0 text-muted-foreground hover:bg-transparent"
        onClick={onBack}
        size="sm"
        type="button"
        variant="ghost"
      >
        <ArrowLeftIcon />
        Workflows
      </Button>
      <div className="flex flex-wrap items-center gap-3">
        <h1>Workflow para Caishen</h1>
        <Badge variant="secondary">pronto</Badge>
        {job.routine && <Badge variant="outline">Rotina</Badge>}
      </div>
      <Panel title="Pedido">
        <p>{job.instructions}</p>
      </Panel>
      <Panel
        action={
          <Button onClick={onDocument} size="sm" type="button" variant="outline">
            <FileTextIcon />
            Abrir documento
          </Button>
        }
        title="Entrega"
      >
        <div className="flex flex-col gap-2 leading-relaxed">
          <p className="font-semibold">{title}</p>
          {lines.map(line =>
            line === 'Próximo passo' ? (
              <p className="pt-2 font-semibold" key={line}>
                {line}
              </p>
            ) : (
              <p key={line}>{line}</p>
            )
          )}
        </div>
      </Panel>
    </div>
  );
}

/** Documentos as a table: the Deliverables and the file handed over, with a filter and a search. */
function DocumentsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [kind, setKind] = useState<'all' | 'attachment' | 'deliverable'>('all');
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const all = [
    ...JOBS.map(job => ({
      createdAt: job.createdAt,
      id: job.id,
      kind: 'deliverable' as const,
      name: job.deliverable[0]!,
    })),
    {
      createdAt: daysAgo(3),
      id: 'extrato',
      kind: 'attachment' as const,
      name: 'extrato-outubro.pdf',
    },
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const search = term.trim().toLocaleLowerCase();
  const rows = all.filter(
    row =>
      (kind === 'all' || row.kind === kind) &&
      (!search || row.name.toLocaleLowerCase().includes(search))
  );
  const picked = rows.filter(row => selected.has(row.id) && row.kind === 'deliverable');

  return (
    <div className="flex flex-col gap-5">
      <PageTitle note="O que o Caishen entregou e os arquivos que ele recebeu, num lugar só.">
        Documentos
      </PageTitle>
      <div className="flex flex-wrap items-center gap-2">
        <Select onValueChange={value => setKind(value as typeof kind)} value={kind}>
          <SelectTrigger aria-label="Tipo" className="w-40 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="deliverable">Entrega</SelectItem>
            <SelectItem value="attachment">Anexo</SelectItem>
          </SelectContent>
        </Select>
        {picked.length > 0 && (
          <Button
            onClick={() =>
              picked.forEach(row => {
                const job = JOBS.find(item => item.id === row.id)!;
                downloadMarkdown(row.name, markdownOf(job));
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <DownloadIcon />
            Baixar {picked.length} Entregas
          </Button>
        )}
        <div className="relative ml-auto w-full max-w-60">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Pesquisar documentos"
            className="bg-card pl-9"
            onChange={event => setTerm(event.target.value)}
            placeholder="Pesquisar documentos"
            value={term}
          />
        </div>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Nome</TableHead>
              <TableHead className="w-28">Tipo</TableHead>
              <TableHead className="w-28 text-right">Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow
                className={cn(row.kind === 'deliverable' && 'cursor-pointer')}
                data-state={selected.has(row.id) ? 'selected' : undefined}
                key={row.id}
                onClick={() => row.kind === 'deliverable' && onOpen(row.id)}
              >
                <TableCell onClick={event => event.stopPropagation()}>
                  <Checkbox
                    aria-label={`Selecionar ${row.name}`}
                    checked={selected.has(row.id)}
                    onCheckedChange={checked =>
                      setSelected(current => {
                        const next = new Set(current);
                        if (checked === true) next.add(row.id);
                        else next.delete(row.id);
                        return next;
                      })
                    }
                  />
                </TableCell>
                <TableCell className="max-w-0">
                  <span className="flex items-center gap-2">
                    {row.kind === 'deliverable' ? (
                      <FileTextIcon className="size-4 shrink-0 text-ink" />
                    ) : (
                      <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate font-medium">{row.name}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={row.kind === 'deliverable' ? 'secondary' : 'outline'}>
                    {row.kind === 'deliverable' ? 'Entrega' : 'Anexo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {formatDate(row.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** A Deliverable open as a document, to edit here; saving it takes signing in. */
function DocumentScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const job = JOBS.find(item => item.id === id)!;
  const editor = useEditor({
    content: markdownOf(job),
    contentType: 'markdown',
    editorProps: { attributes: { 'aria-label': job.deliverable[0]! } },
    extensions: [StarterKit, Markdown],
    immediatelyRender: true,
  });

  return (
    <div className="page-enter flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-card px-5 py-3">
        <Button
          aria-label="Documentos"
          onClick={onBack}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <ArrowLeftIcon />
        </Button>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-medium">{job.deliverable[0]}</div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {formatDate(job.createdAt)}
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/sign-in">Entre para salvar</Link>
        </Button>
      </header>
      <DocumentToolbar editor={editor} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted px-4 py-6">
        <EditorContent
          className="doc-page mx-auto min-h-full w-full max-w-[720px] rounded-sm bg-card px-8 py-10 shadow-sm md:px-14"
          editor={editor}
        />
      </div>
    </div>
  );
}

function ModelsScreen() {
  const [model, setModel] = useState('deepseek/deepseek-chat-v3:free');
  return (
    <div className="flex flex-col gap-8">
      <PageTitle note="O modelo de linguagem que o Caishen usa, pelo OpenRouter.">
        Modelos
      </PageTitle>
      <ul className="flex flex-col divide-y border-t">
        <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4" data-bot="FINANCE">
          <span className="flex w-36 items-center gap-2 font-medium">
            <BotGlyph bot="FINANCE" size={28} />
            Caishen
          </span>
          <Select onValueChange={setModel} value={model}>
            <SelectTrigger aria-label="Caishen" className="w-full max-w-sm bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deepseek/deepseek-chat-v3:free">DeepSeek V3 (gratuito)</SelectItem>
              <SelectItem value="meta-llama/llama-3.3-70b-instruct:free">
                Llama 3.3 70B (gratuito)
              </SelectItem>
              <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
            </SelectContent>
          </Select>
          {model.endsWith(':free') && <Badge variant="secondary">gratuito</Badge>}
        </li>
      </ul>
    </div>
  );
}

function Meter({ label, limit, used }: { label: string; limit: number; used: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {used} / {limit}
        </span>
      </div>
      <Progress value={(used / limit) * 100} />
    </div>
  );
}

function PlanScreen() {
  return (
    <div className="flex flex-col gap-8">
      <PageTitle note="O Plano da Organização, seus Limites do mês e o que ela já usou.">
        Plano
      </PageTitle>
      <section className="flex flex-col gap-5 rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Plano atual</div>
            <div className="mt-1 text-2xl font-semibold">Gratuito</div>
          </div>
          <Button asChild>
            <Link to="/sign-in">
              <CreditCardIcon />
              Assinar o Pro
            </Link>
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Meter label="Workflows" limit={30} used={2} />
          <Meter label="Mensagens enviadas" limit={300} used={6} />
        </div>
      </section>
      <ul className="grid gap-4 md:grid-cols-2">
        {[
          { jobs: 30, messages: 300, name: 'Gratuito', price: 'Grátis' },
          { jobs: 500, messages: 5000, name: 'Pro', price: `${formatCents(4900)} / mês` },
        ].map(plan => (
          <li className="flex flex-col gap-3 rounded-lg border bg-card p-5" key={plan.name}>
            <span className="text-lg font-semibold">{plan.name}</span>
            <span className="text-xl font-semibold tabular-nums">{plan.price}</span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <CheckIcon className="size-4 text-foreground" />
              {plan.jobs} Workflows e {plan.messages.toLocaleString('pt-BR')} Mensagens por mês
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrganizationScreen() {
  return (
    <div className="flex flex-col gap-8">
      <PageTitle note="O espaço onde ficam seus dados. Por enquanto ele é pessoal.">
        Organização
      </PageTitle>
      <div className="flex max-w-md flex-col gap-1.5">
        <span className="text-sm font-medium">Nome</span>
        <Input aria-label="Nome da Organização" defaultValue="Ana Souza" />
      </div>
      <Panel title="Usuários">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Ana Souza</TableCell>
              <TableCell className="text-muted-foreground">ana@exemplo.com</TableCell>
              <TableCell>
                <Badge variant="secondary">Dono</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}

/** The chat panel docked on the right, like in the app, opening with a fade as it grows. */
function ChatPanel({
  blank,
  onClose,
  onNew,
  open,
}: {
  blank: number;
  onClose: () => void;
  onNew: () => void;
  open: boolean;
}) {
  const desktop = useDesktop();
  const still = useReducedMotion();
  const shown = desktop ? { opacity: 1, width: PANEL_WIDTH } : { opacity: 1, y: 0 };
  const hidden = still
    ? { opacity: 0 }
    : desktop
      ? { opacity: 0, width: 0 }
      : { opacity: 0, y: 16 };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          animate={shown}
          aria-label="Conversa com o Caishen"
          className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-background md:static md:shrink-0 md:border-l"
          exit={hidden}
          initial={hidden}
          transition={{ duration: still ? 0.15 : 0.32, ease: EASE }}
        >
          <div className="flex h-full min-h-0 w-full flex-col md:w-[340px]">
            <ChatThread blank={blank > 0} key={blank} onClose={onClose} onNew={onNew} />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/**
 * A Conversation with the Caishen, in the panel or on the chat page: the latest one, the earlier
 * ones and a blank one with questions to start from. Writing takes signing in.
 */
function ChatThread({
  blank,
  onClose,
  onNew,
}: {
  blank: boolean;
  onClose?: () => void;
  onNew: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(blank ? null : CONVERSATIONS[0]!.id);
  const open = CONVERSATIONS.find(conversation => conversation.id === openId);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 p-4" data-bot="FINANCE">
      <header className="flex items-center gap-2 border-b pb-3">
        <BotGlyph bot="FINANCE" size={32} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-serif">Caishen</div>
          <div className="truncate text-xs text-muted-foreground">
            {open?.title ?? 'Nova conversa'}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label="Conversas anteriores" size="icon-sm" type="button" variant="ghost">
              <HistoryIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Conversas anteriores</DropdownMenuLabel>
            {CONVERSATIONS.map(conversation => (
              <DropdownMenuItem key={conversation.id} onSelect={() => setOpenId(conversation.id)}>
                <span className="truncate">{conversation.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          aria-label="Nova conversa"
          onClick={onNew}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <PlusIcon />
        </Button>
        {onClose && (
          <Button
            aria-label="Fechar conversa"
            onClick={onClose}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <XIcon />
          </Button>
        )}
      </header>
      {open ? (
        <ol className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {open.messages.map(message => (
            <li
              className={cn(
                'max-w-[90%] rounded-lg px-3 py-2 leading-relaxed',
                message.mine ? 'self-end bg-ink text-paper' : 'self-start border bg-card'
              )}
              key={message.text}
            >
              {message.text}
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
          <p className="pb-1 text-muted-foreground">
            Pergunte algo; ele responde com os seus números.
          </p>
          {CONVERSATIONS.map(conversation => (
            <Button
              className="h-auto justify-start px-3 py-2 text-left font-normal whitespace-normal"
              key={conversation.id}
              onClick={() => setOpenId(conversation.id)}
              type="button"
              variant="outline"
            >
              {conversation.messages[0]!.text}
            </Button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Textarea
          aria-label="Mensagem"
          className="min-h-16 resize-none bg-card"
          placeholder="Escreva para Caishen…"
          readOnly
        />
        <Button asChild size="sm">
          <Link to="/sign-in">Entre para conversar</Link>
        </Button>
      </div>
    </div>
  );
}

function FinanceScreen() {
  return (
    <div className="flex flex-col gap-8">
      <PageTitle
        note={
          <>
            Renda mensal líquida{' '}
            <span className="text-foreground tabular-nums">{formatCents(970_000)}</span>
          </>
        }
      >
        Finanças
      </PageTitle>
      <Panel title="Avisos">
        <p className="text-muted-foreground">
          O que merece atenção agora, do mais urgente ao menos.
        </p>
        <AlertItems />
      </Panel>
      <Panel title="Avaliação">
        <div className="flex flex-wrap items-center gap-4">
          <ScoreBadge band="MEDIUM" large score={580} />
          <p className="max-w-prose text-xs text-muted-foreground">
            Score de 0 a 1000 nas faixas do SPC, calculado pelo Caishen a partir dos dados
            cadastrados. Não é o score de nenhum birô.
            <br />
            Pontualidade 350/500 · Capacidade 30/300 · Utilização 200/200
          </p>
        </div>
      </Panel>
      <Card>
        <CardHeader>
          <CardTitle>Operações de Crédito</CardTitle>
          <CardDescription>Empréstimos e financiamentos.</CardDescription>
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
                <TableHead className="text-right">Saldo devedor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {OPERATIONS.map(operation => (
                <TableRow key={operation.name}>
                  <TableCell>
                    <span className="font-medium">{operation.name}</span>
                    <span className="text-muted-foreground"> · {operation.lender}</span>
                  </TableCell>
                  <TableCell>{operation.modality}</TableCell>
                  <TableCell className="text-right tabular-nums">{operation.rate}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(operation.installment)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{operation.paid}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(operation.balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cartões</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {CARDS.map(card => (
            <Card className="gap-3 py-4 shadow-none" key={card.name}>
              <CardHeader className="px-4">
                <CardTitle className="text-base">{card.name}</CardTitle>
                <CardDescription className="text-xs">
                  Limite {formatCents(card.limit)} · fecha dia {card.closing} · vence dia {card.due}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4">
                <Table>
                  <TableBody>
                    {card.statements.map(([label, cents]) => (
                      <TableRow key={label}>
                        <TableCell>{label}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCents(cents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function JobsScreen({ onJob }: { onJob: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-8">
      <PageTitle note="Um pedido que o Caishen faz sozinho, em segundo plano.">Workflows</PageTitle>
      <Card>
        <CardHeader>
          <CardTitle>Novo Workflow</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <Textarea
            aria-label="O que o Caishen deve fazer"
            className="min-h-24 bg-card"
            placeholder="Ex.: monte um plano para eu sair do empréstimo pessoal até o fim do ano que vem."
          />
          <Button asChild>
            <Link to="/sign-in">Criar Workflow</Link>
          </Button>
        </CardContent>
      </Card>
      <Panel title="Workflows">
        <JobRows onJob={onJob} />
      </Panel>
      <Panel title="Rotinas">
        <ul className="flex flex-col divide-y">
          <li className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 truncate">{JOBS[1]!.instructions}</span>
            <Badge variant="outline">todo mês</Badge>
          </li>
        </ul>
      </Panel>
    </div>
  );
}

function IntegrationsScreen() {
  const [drive, setDrive] = useState(false);
  const rows = [
    {
      connected: true,
      group: 'IA',
      name: 'OpenRouter',
      text: 'Os Modelos que respondem pelo Caishen, inclusive gratuitos.',
    },
    {
      connected: drive,
      group: 'Arquivos',
      name: 'Google Drive',
      onConnect: () => setDrive(true),
      text: 'O Caishen lê só os arquivos que você escolher.',
    },
  ];
  return (
    <div className="flex flex-col gap-8">
      <PageTitle note="O Caishen só lê: nada é escrito fora do app.">Integrações</PageTitle>
      {rows.map(row => (
        <Panel key={row.name} title={row.group}>
          <Card className="shadow-none">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-base">{row.name}</CardTitle>
                <CardDescription>{row.text}</CardDescription>
              </div>
              {row.connected ? (
                <Badge variant="secondary">Conectado</Badge>
              ) : (
                <Button onClick={row.onConnect} size="sm" type="button" variant="outline">
                  Conectar
                </Button>
              )}
            </CardHeader>
          </Card>
        </Panel>
      ))}
    </div>
  );
}
