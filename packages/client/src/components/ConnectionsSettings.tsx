import { useMutation, useQuery } from '@apollo/client/react';
import {
  ConnectionsDocument,
  StartWhatsappLinkDocument,
  UnlinkWhatsappDocument,
  type ConnectionKind,
  type ConnectionsQuery,
  type StartWhatsappLinkMutation,
} from '@zapbots/graphql/client';
import {
  ActivityIcon,
  BrainCircuitIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  LandmarkIcon,
  MoonIcon,
  ScaleIcon,
  TrendingUpIcon,
  ZapIcon,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import {
  AppleLogo,
  DropboxLogo,
  FitbitLogo,
  GarminLogo,
  GmailLogo,
  GoogleCalendarLogo,
  GoogleDriveLogo,
  NotionLogo,
  ObsidianLogo,
  RescueTimeLogo,
  SpotifyLogo,
  StravaLogo,
  TelegramLogo,
  TickTickLogo,
  TodoistLogo,
  WhatsAppLogo,
  AirtableLogo,
  AsanaLogo,
  BinanceLogo,
  CalendlyLogo,
  ClickUpLogo,
  CoinbaseLogo,
  DiscordLogo,
  DuolingoLogo,
  EvernoteLogo,
  GoogleDocsLogo,
  GoogleSheetsLogo,
  GoogleTasksLogo,
  HeadspaceLogo,
  ICloudLogo,
  IFoodLogo,
  KomootLogo,
  MakeLogo,
  MercadoPagoLogo,
  N8nLogo,
  NubankLogo,
  PayPalLogo,
  PelotonLogo,
  PicPayLogo,
  SamsungLogo,
  TrelloLogo,
  UberLogo,
  WiseLogo,
  ZapierLogo,
} from '@zapbots/ui/blocks/brand-logos';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Tabs, TabsList, TabsTrigger } from '@zapbots/ui/components/tabs';
import { cn } from '@zapbots/ui/lib/utils';

import { ModelsList } from '../pages/ModelsPage';
import { AiKeysEditor } from './AiKeysEditor';
import { FormError } from './FormError';
import { OpenFinanceLinker } from './OpenFinanceLinker';

type Connection = ConnectionsQuery['connections'][number];

/** The kinds the page is filtered by, in this order. */
const CATEGORIES = [
  { id: 'ai', label: 'IA' },
  { id: 'finance', label: 'Finanças' },
  { id: 'health', label: 'Saúde e Fitness' },
  { id: 'agenda', label: 'Agenda e tarefas' },
  { id: 'notes', label: 'Notas e documentos' },
  { id: 'chat', label: 'Conversa e hábitos' },
  { id: 'automation', label: 'Automação' },
] as const;

type Category = (typeof CATEGORIES)[number]['id'];

/**
 * A service's mark: the brand's own (`brand-logos`, in its colour; `null` keeps the ink, for the
 * black ones, so they still show on the dark theme) or, for a brand with no free mark, a plain icon.
 */
interface Mark {
  color?: string | null;
  icon: LucideIcon;
}

/** The Integrations that work, in this order: each one a card. */
const CARDS: {
  category: Category;
  description: string;
  id: string;
  kind: ConnectionKind;
  mark: Mark;
  name: string;
}[] = [
  {
    category: 'ai',
    description:
      'Cole a chave de um provedor e escolha o Modelo de cada Bot. As chaves são da Organização, ficam criptografadas e só administradores as trocam. Com a do OpenRouter, os Modelos gratuitos dele também aparecem.',
    id: 'ai',
    kind: 'OPENROUTER',
    mark: { icon: BrainCircuitIcon },
    name: 'Modelos de IA',
  },
  {
    category: 'chat',
    description:
      'Conte um gasto, confirme Propostas pelos botões e pergunte sobre suas finanças pelo WhatsApp. O Caishen só responde, nunca puxa conversa.',
    id: 'whatsapp',
    kind: 'WHATSAPP',
    mark: { color: '#25D366', icon: WhatsAppLogo },
    name: 'WhatsApp',
  },
  {
    category: 'finance',
    description:
      'Seus bancos pelo Open Finance, com a Pluggy. Só leitura: a autorização é dada no app do banco e pode ser retirada quando quiser. Os gastos entram no Fluxo de caixa.',
    id: 'finance',
    kind: 'OPEN_FINANCE',
    mark: { icon: LandmarkIcon },
    name: 'Open Finance',
  },
];

/**
 * Integrations still to come: shown with "Em breve" under the ones that work, with no Connection,
 * server side or link until they do. Apple Health and Health Connect only give their data to an
 * app installed on the phone, so they wait for one.
 */
const UPCOMING: {
  category: Category;
  description: string;
  mark: Mark;
  name: string;
}[] = [
  {
    category: 'finance',
    description: 'Encaminhe faturas, boletos e extratos e eles entram sozinhos.',
    mark: { color: '#EA4335', icon: GmailLogo },
    name: 'E-mail de faturas',
  },
  {
    category: 'finance',
    description: 'Ações, FIIs e Tesouro Direto pela Área do Investidor.',
    mark: { icon: TrendingUpIcon },
    name: 'B3',
  },
  {
    category: 'finance',
    description: 'Os vencimentos no seu Google Agenda, Outlook ou iPhone.',
    mark: { icon: CalendarClockIcon },
    name: 'Agenda de vencimentos',
  },
  {
    category: 'health',
    description: 'Passos, treinos, sono e batimentos do iPhone e do Apple Watch.',
    mark: { color: null, icon: AppleLogo },
    name: 'Apple Health',
  },
  {
    category: 'health',
    description: 'Os dados de saúde de um celular Android.',
    mark: { icon: ActivityIcon },
    name: 'Health Connect',
  },
  {
    category: 'health',
    description: 'Corridas, pedaladas e treinos registrados.',
    mark: { color: '#FC4C02', icon: StravaLogo },
    name: 'Strava',
  },
  {
    category: 'health',
    description: 'Atividades, sono e carga do relógio.',
    mark: { color: null, icon: GarminLogo },
    name: 'Garmin',
  },
  {
    category: 'health',
    description: 'Passos, sono e batimentos da pulseira.',
    mark: { color: '#00B0B9', icon: FitbitLogo },
    name: 'Fitbit',
  },
  {
    category: 'health',
    description: 'Sono, prontidão e temperatura do anel.',
    mark: { icon: MoonIcon },
    name: 'Oura',
  },
  {
    category: 'health',
    description: 'Recuperação, esforço e sono.',
    mark: { icon: ZapIcon },
    name: 'Whoop',
  },
  {
    category: 'health',
    description: 'Peso e composição corporal da balança.',
    mark: { icon: ScaleIcon },
    name: 'Withings',
  },
  {
    category: 'agenda',
    description: 'Seus compromissos, só para leitura.',
    mark: { color: '#4285F4', icon: GoogleCalendarLogo },
    name: 'Google Agenda',
  },
  {
    category: 'agenda',
    description: 'A agenda do trabalho, só para leitura.',
    mark: { icon: CalendarDaysIcon },
    name: 'Outlook',
  },
  {
    category: 'agenda',
    description: 'Suas tarefas e projetos.',
    mark: { color: '#E44332', icon: TodoistLogo },
    name: 'Todoist',
  },
  {
    category: 'agenda',
    description: 'Tarefas e hábitos.',
    mark: { color: '#4772FA', icon: TickTickLogo },
    name: 'TickTick',
  },
  {
    category: 'notes',
    description: 'Planilhas, PDFs e documentos que você escolher.',
    mark: { color: '#4285F4', icon: GoogleDriveLogo },
    name: 'Google Drive',
  },
  {
    category: 'notes',
    description: 'Suas páginas e bases de dados.',
    mark: { color: null, icon: NotionLogo },
    name: 'Notion',
  },
  {
    category: 'notes',
    description: 'As notas do seu vault, pelo Drive ou pelo GitHub.',
    mark: { color: '#7C3AED', icon: ObsidianLogo }, // taste-skill-ignore: Obsidian's own colour
    name: 'Obsidian',
  },
  {
    category: 'notes',
    description: 'Arquivos e extratos guardados lá.',
    mark: { color: '#0061FF', icon: DropboxLogo },
    name: 'Dropbox',
  },
  {
    category: 'chat',
    description: 'Converse com o Caishen pelo Telegram.',
    mark: { color: '#26A5E4', icon: TelegramLogo },
    name: 'Telegram',
  },
  {
    category: 'chat',
    description: 'O que você ouve ao longo do dia.',
    mark: { color: '#1ED760', icon: SpotifyLogo },
    name: 'Spotify',
  },
  {
    category: 'chat',
    description: 'Quanto tempo você passa em cada app.',
    mark: { color: null, icon: RescueTimeLogo },
    name: 'RescueTime',
  },
  {
    category: 'finance',
    description: 'Conta, cartão e caixinhas pelo Open Finance.',
    mark: { color: '#820AD1', icon: NubankLogo }, // taste-skill-ignore: the brand's own colour
    name: 'Nubank',
  },
  {
    category: 'finance',
    description: 'Saldo, Pix e cartão da conta do Mercado Pago.',
    mark: { color: '#00B1EA', icon: MercadoPagoLogo },
    name: 'Mercado Pago',
  },
  {
    category: 'finance',
    description: 'Saldo, Pix e cartão do PicPay.',
    mark: { color: '#21C25E', icon: PicPayLogo },
    name: 'PicPay',
  },
  {
    category: 'finance',
    description: 'Compras e recebimentos em outras moedas.',
    mark: { color: '#002991', icon: PayPalLogo },
    name: 'PayPal',
  },
  {
    category: 'finance',
    description: 'Contas em dólar e euro, com o câmbio de cada envio.',
    mark: { color: null, icon: WiseLogo },
    name: 'Wise',
  },
  {
    category: 'finance',
    description: 'Saldo e operações em cripto.',
    mark: { color: '#F0B90B', icon: BinanceLogo },
    name: 'Binance',
  },
  {
    category: 'finance',
    description: 'Carteira de cripto e o que ela vale em reais.',
    mark: { color: '#0052FF', icon: CoinbaseLogo },
    name: 'Coinbase',
  },
  {
    category: 'finance',
    description: 'Corridas e pedidos, com o recibo de cada um.',
    mark: { color: null, icon: UberLogo },
    name: 'Uber',
  },
  {
    category: 'finance',
    description: 'Pedidos e quanto o delivery pesa no mês.',
    mark: { color: '#EA1D2C', icon: IFoodLogo },
    name: 'iFood',
  },
  {
    category: 'health',
    description: 'Passos, sono e treinos do Galaxy Watch.',
    mark: { color: '#1428A0', icon: SamsungLogo },
    name: 'Samsung Health',
  },
  {
    category: 'health',
    description: 'Aulas e treinos da bike e da esteira.',
    mark: { color: null, icon: PelotonLogo },
    name: 'Peloton',
  },
  {
    category: 'health',
    description: 'Trilhas e pedais planejados e feitos.',
    mark: { color: '#6AA127', icon: KomootLogo },
    name: 'Komoot',
  },
  {
    category: 'health',
    description: 'Minutos de meditação e sequência de dias.',
    mark: { color: '#F47D31', icon: HeadspaceLogo },
    name: 'Headspace',
  },
  {
    category: 'agenda',
    description: 'Os compromissos do iPhone e do Mac.',
    mark: { color: '#3693F3', icon: ICloudLogo },
    name: 'Agenda do iCloud',
  },
  {
    category: 'agenda',
    description: 'As tarefas do Gmail e da Agenda.',
    mark: { color: '#2684FC', icon: GoogleTasksLogo },
    name: 'Google Tarefas',
  },
  {
    category: 'agenda',
    description: 'Quadros e cartões dos seus projetos.',
    mark: { color: '#0052CC', icon: TrelloLogo },
    name: 'Trello',
  },
  {
    category: 'agenda',
    description: 'Tarefas e prazos do trabalho.',
    mark: { color: '#F06A6A', icon: AsanaLogo },
    name: 'Asana',
  },
  {
    category: 'agenda',
    description: 'Tarefas, metas e documentos.',
    mark: { color: '#7B68EE', icon: ClickUpLogo }, // taste-skill-ignore: the brand's own colour
    name: 'ClickUp',
  },
  {
    category: 'agenda',
    description: 'As reuniões marcadas com você.',
    mark: { color: '#006BFF', icon: CalendlyLogo },
    name: 'Calendly',
  },
  {
    category: 'notes',
    description: 'A planilha de gastos que você já mantém.',
    mark: { color: '#34A853', icon: GoogleSheetsLogo },
    name: 'Google Planilhas',
  },
  {
    category: 'notes',
    description: 'Documentos que você escolher.',
    mark: { color: '#4285F4', icon: GoogleDocsLogo },
    name: 'Google Docs',
  },
  {
    category: 'notes',
    description: 'Notas, recibos e documentos digitalizados.',
    mark: { color: '#00A82D', icon: EvernoteLogo },
    name: 'Evernote',
  },
  {
    category: 'notes',
    description: 'Suas bases e tabelas.',
    mark: { color: '#18BFFF', icon: AirtableLogo },
    name: 'Airtable',
  },
  {
    category: 'chat',
    description: 'Converse com o Caishen num servidor seu.',
    mark: { color: '#5865F2', icon: DiscordLogo }, // taste-skill-ignore: the brand's own colour
    name: 'Discord',
  },
  {
    category: 'chat',
    description: 'Sequência de dias e lições feitas.',
    mark: { color: '#58CC02', icon: DuolingoLogo },
    name: 'Duolingo',
  },
  {
    category: 'automation',
    description: 'Mande ao Caishen o que acontece em outros apps.',
    mark: { color: '#FF4F00', icon: ZapierLogo },
    name: 'Zapier',
  },
  {
    category: 'automation',
    description: 'Cenários que enviam dados ao Caishen.',
    mark: { color: '#6D00CC', icon: MakeLogo }, // taste-skill-ignore: the brand's own colour
    name: 'Make',
  },
  {
    category: 'automation',
    description: 'Fluxos seus que enviam dados ao Caishen.',
    mark: { color: '#EA4B71', icon: N8nLogo },
    name: 'n8n',
  },
];

/** A service's mark on its tile: the brand's colour when it has one, the muted ink when not. */
function MarkTile({ className, mark }: { className?: string; mark: Mark }) {
  const Icon = mark.icon;
  const brand = mark.color !== undefined;
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-muted',
        brand ? 'text-foreground' : 'text-muted-foreground',
        className
      )}
      style={mark.color ? { color: mark.color } : undefined}
    >
      <Icon className="size-1/2" strokeWidth={brand ? undefined : 1.75} />
    </span>
  );
}

/** The status of an Integration, the same way everywhere: a dot of its colour and a word. */
function Status({ connection }: { connection: Connection | undefined }) {
  const [label, dot] = connection?.connected
    ? ['Conectado', 'bg-success']
    : !connection?.available || connection.unavailableReason
      ? ['Indisponível', 'bg-warning']
      : ['Disponível', 'bg-muted-foreground/50'];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span aria-hidden className={cn('size-2 rounded-full', dot)} />
      {label}
    </span>
  );
}

/**
 * Integrações: the tools the Caishen works with, filtered by kind. First those that work, one wide
 * card each: who it is on the left (its mark, name, status and what it does), what to do with it
 * on the right (the Models of the Bots, WhatsApp, Open Finance through Pluggy). Then those to come,
 * one card per kind listing them.
 */
export function ConnectionsSettings() {
  const { hash } = useLocation();
  const { data, loading } = useQuery(ConnectionsDocument, { fetchPolicy: 'cache-and-network' });
  const [category, setCategory] = useState<Category | 'all'>('all');
  const ready = Boolean(data);
  // Opened on one card (an old link, the chat): bring it into view once it is there.
  useEffect(() => {
    if (ready && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, ready]);

  if (loading && !data) return <PageSkeleton />;

  const shows = (item: { category: Category }) => category === 'all' || item.category === category;
  const cards = CARDS.filter(shows);
  const upcoming = CATEGORIES.map(group => ({
    ...group,
    items: UPCOMING.filter(item => item.category === group.id),
  })).filter(group => group.items.length > 0 && shows({ category: group.id }));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1>Integrações</h1>
        <p className="max-w-prose text-muted-foreground">
          As ferramentas em que o Caishen entra por você. Ele só lê: nada é alterado lá fora.
        </p>
      </header>

      <Tabs onValueChange={value => setCategory(value as Category | 'all')} value={category}>
        <TabsList className="h-auto max-w-full flex-wrap justify-start gap-1 bg-transparent p-0">
          {[{ id: 'all', label: 'Todas' }, ...CATEGORIES].map(item => (
            <TabsTrigger
              className="h-9 flex-none rounded-full border-0 bg-muted px-4 text-sm font-medium text-foreground shadow-none! data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              key={item.id}
              value={item.id}
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {cards.length > 0 && (
        <section aria-labelledby="ready-title" className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight" id="ready-title">
            Disponíveis
          </h2>
          {cards.map(card => {
            const connection = data?.connections.find(item => item.kind === card.kind);
            return (
              <Card
                aria-labelledby={`${card.id}-title`}
                className="grid min-w-0 scroll-mt-6 gap-6 md:p-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12"
                id={card.id}
                key={card.id}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <MarkTile className="size-12" mark={card.mark} />
                    <div className="flex flex-col gap-0.5">
                      <h3 className="text-lg font-semibold tracking-tight" id={`${card.id}-title`}>
                        {card.name}
                      </h3>
                      <Status connection={connection} />
                    </div>
                  </div>
                  <p className="max-w-prose text-muted-foreground">{card.description}</p>
                </div>
                <div className="flex min-w-0 flex-col gap-3">
                  {card.kind === 'OPENROUTER' ? (
                    <div className="flex flex-col gap-6">
                      <AiKeysEditor />
                      <ModelsList search="" />
                    </div>
                  ) : (
                    connection && <Details connection={connection} />
                  )}
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-title" className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight" id="upcoming-title">
            Em breve
          </h2>
          {upcoming.map(group => (
            <Card className="flex flex-col gap-4 md:p-8" key={group.id}>
              <h3 className="text-base font-semibold">{group.label}</h3>
              <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map(item => (
                  <li className="flex items-center gap-3.5" key={item.name}>
                    <MarkTile className="size-11" mark={item.mark} />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{item.name}</span>
                        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-primary">
                          Em breve
                        </span>
                      </div>
                      <p className="text-sm leading-snug text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

function Details({ connection }: { connection: Connection }): ReactNode {
  return (
    <>
      {connection.kind === 'WHATSAPP' && connection.available && (
        <WhatsappLinker connected={connection.connected} />
      )}
      {connection.kind === 'OPEN_FINANCE' && connection.available && <OpenFinanceLinker />}
      {connection.detail && <p className="text-sm">{connection.detail}</p>}
      {connection.unavailableReason && (
        <p className="rounded-xl bg-secondary/60 px-4 py-3.5 text-muted-foreground">
          {connection.unavailableReason}
        </p>
      )}
    </>
  );
}

type LinkCode = StartWhatsappLinkMutation['startWhatsappLink'];

/**
 * Linking WhatsApp: a one-time code the User sends from their phone, through a `wa.me` link that
 * writes it (docs/adr/0019); once linked, the way out.
 */
function WhatsappLinker({ connected }: { connected: boolean }) {
  const [code, setCode] = useState<LinkCode | null>(null);
  const [start, starting] = useMutation(StartWhatsappLinkDocument);
  const [unlink, unlinking] = useMutation(UnlinkWhatsappDocument, {
    refetchQueries: [ConnectionsDocument],
  });
  // Once the message with the code arrives, the server links the number: look for it now and then.
  useQuery(ConnectionsDocument, { pollInterval: code && !connected ? 4000 : 0, skip: !code });

  if (connected) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={unlinking.loading}
          onClick={() => void unlink().then(() => setCode(null))}
          size="sm"
          variant="outline"
        >
          Desconectar
        </Button>
        <span className="text-sm text-muted-foreground">
          Ou mande SAIR para o Caishen no WhatsApp.
        </span>
        {unlinking.error && <FormError error={unlinking.error} />}
      </div>
    );
  }

  const expires = code
    ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(code.expiresAt)
      )
    : null;
  return (
    <div className="flex flex-col gap-3">
      {code ? (
        <div className="flex flex-col gap-3 rounded-xl bg-secondary/60 p-4">
          <p>
            Mande este código para o Caishen no WhatsApp até as {expires}:{' '}
            <strong className="text-lg tracking-widest tabular-nums">{code.code}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={code.url} rel="noreferrer" target="_blank">
                Abrir o WhatsApp
              </a>
            </Button>
            <Button
              disabled={starting.loading}
              onClick={() =>
                void start().then(result => setCode(result.data?.startWhatsappLink ?? null))
              }
              size="sm"
              variant="ghost"
            >
              Gerar outro código
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            No computador, abra o link no celular ou digite o código numa conversa com o número do
            Caishen. Esta tela muda sozinha quando ele receber.
          </p>
        </div>
      ) : (
        <Button
          className="self-start"
          disabled={starting.loading}
          onClick={() =>
            void start().then(result => setCode(result.data?.startWhatsappLink ?? null))
          }
          size="sm"
        >
          Conectar
        </Button>
      )}
      {starting.error && <FormError error={starting.error} />}
    </div>
  );
}
