import { useQuery } from '@apollo/client/react';
import {
  ConnectionsDocument,
  type ConnectionKind,
  type ConnectionsQuery,
} from '@zapbots/graphql/client';
import {
  ArchiveIcon,
  CalendarIcon,
  LandmarkIcon,
  MailIcon,
  SearchIcon,
  SparklesIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { connectDrive, pickerConfigured } from '../lib/drive';
import { FormError } from './FormError';
import { PageSkeleton } from './PageSkeleton';

type Connection = ConnectionsQuery['connections'][number];

/** An Integration still to come, shown so the User sees where the team is going. */
interface Upcoming {
  description: string;
  name: string;
}

export interface IntegrationGroup {
  description: string;
  icon: LucideIcon;
  /** Anchor of the group on the page. */
  id: string;
  /** Integrations that already work, by their kind on the server. */
  kinds: ConnectionKind[];
  title: string;
  upcoming: Upcoming[];
}

export const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    description: 'De onde vêm os Modelos de linguagem que os Bots usam.',
    icon: SparklesIcon,
    id: 'provedores-de-ia',
    kinds: ['OPENROUTER'],
    title: 'Provedores de IA',
    upcoming: [
      { description: 'Os Modelos Claude com a sua própria chave.', name: 'Anthropic' },
      { description: 'Os Modelos GPT com a sua própria chave.', name: 'OpenAI' },
      { description: 'Os Modelos Gemini com a sua própria chave.', name: 'Google AI' },
    ],
  },
  {
    description: 'Os arquivos que você entrega aos Bots junto com um Trabalho.',
    icon: ArchiveIcon,
    id: 'arquivos',
    kinds: ['GOOGLE_DRIVE'],
    title: 'Armazenamento de arquivos',
    upcoming: [
      { description: 'Arquivos do OneDrive, só leitura.', name: 'OneDrive' },
      { description: 'Arquivos do Dropbox, só leitura.', name: 'Dropbox' },
      { description: 'Arquivos do Box, só leitura.', name: 'Box' },
    ],
  },
  {
    description: 'Para os Bots lerem faturas, extratos e avisos que chegam por e-mail.',
    icon: MailIcon,
    id: 'email',
    kinds: [],
    title: 'E-mail',
    upcoming: [
      { description: 'Lê os e-mails dos bancos e das contas, sem enviar nada.', name: 'Gmail' },
      { description: 'Lê os e-mails do Outlook, sem enviar nada.', name: 'Outlook' },
    ],
  },
  {
    description: 'Para os Bots acompanharem prazos e vencimentos.',
    icon: CalendarIcon,
    id: 'agenda',
    kinds: [],
    title: 'Agenda',
    upcoming: [
      { description: 'Lê seus eventos para lembrar o que vence.', name: 'Google Agenda' },
      { description: 'Lê seus eventos do Outlook.', name: 'Outlook Agenda' },
    ],
  },
  {
    description: 'Seus dados financeiros direto das instituições, com o seu consentimento.',
    icon: LandmarkIcon,
    id: 'bancos',
    kinds: [],
    title: 'Bancos',
    upcoming: [
      {
        description: 'Contas, cartões e empréstimos pelo Open Finance, só leitura.',
        name: 'Open Finance',
      },
      {
        description: 'O relatório do SCR do Bacen, lido sozinho a partir do PDF.',
        name: 'Registrato',
      },
    ],
  },
];

const COPY: Record<ConnectionKind, { description: string; name: string }> = {
  GOOGLE_DRIVE: {
    description:
      'O zapbots só enxerga os arquivos que você escolher no seletor do Google, e os Bots leem o texto dos que você entregar num Trabalho: Google Docs, PDFs com texto e arquivos de texto.',
    name: 'Google Drive',
  },
  OPENROUTER: {
    description:
      'Dá acesso a Modelos de vários fornecedores, inclusive gratuitos. A chave fica no servidor e vale para todos os Bots.',
    name: 'OpenRouter',
  },
};

/** The status of an Integration, the same way everywhere. */
function Status({ connection }: { connection?: Connection }) {
  if (!connection) return <Badge variant="outline">em breve</Badge>;
  if (connection.connected) return <Badge className="bg-success text-white">conectado</Badge>;
  if (connection.unavailableReason) return <Badge variant="outline">indisponível</Badge>;
  return <Badge variant="secondary">disponível</Badge>;
}

/** The square with the Integration's initial, standing in for a logo. */
function Mark({ live, name }: { live: boolean; name: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-lg border font-serif text-lg',
        live ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
      )}
    >
      {name[0]}
    </span>
  );
}

const matches = (search: string, ...texts: string[]) =>
  !search || texts.some(text => text.toLocaleLowerCase('pt-BR').includes(search));

/** Integrations with services outside zapbots, by kind of service, with a search on top. */
export function ConnectionsSettings() {
  const { data, loading } = useQuery(ConnectionsDocument, { fetchPolicy: 'cache-and-network' });
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState('');

  if (loading && !data) return <PageSkeleton />;
  const search = term.trim().toLocaleLowerCase('pt-BR');

  const connect = async () => {
    setError(null);
    // On success the browser is already on its way to Google.
    setError(await connectDrive());
  };

  return (
    <section className="flex flex-col gap-8" id="integracoes">
      <header className="flex flex-col gap-4">
        <div>
          <h2>Integrações</h2>
          <p className="mt-1 max-w-prose text-muted-foreground">
            As ferramentas em que os Bots entram por você. Eles só leem: nada é alterado lá fora.
          </p>
        </div>
        <div className="relative max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Pesquisar integrações"
            className="bg-card pl-9"
            onChange={event => setTerm(event.target.value)}
            placeholder="Pesquisar integrações"
            value={term}
          />
        </div>
      </header>

      {INTEGRATION_GROUPS.map(group => {
        const live = group.kinds
          .map(kind => data?.connections.find(item => item.kind === kind))
          .filter((item): item is Connection => Boolean(item))
          .filter(item => matches(search, COPY[item.kind].name, COPY[item.kind].description));
        const upcoming = group.upcoming.filter(item =>
          matches(search, item.name, item.description)
        );
        if (!live.length && !upcoming.length) return null;
        const Icon = group.icon;
        return (
          <section className="flex scroll-mt-6 flex-col gap-3" id={group.id} key={group.id}>
            <div>
              <h3 className="flex items-center gap-2 font-serif text-2xl">
                <Icon className="size-5" />
                {group.title}
              </h3>
              <p className="text-muted-foreground">{group.description}</p>
            </div>
            {live.length > 0 && (
              <ul className="flex flex-col gap-3">
                {live.map(connection => (
                  <li
                    className="flex flex-wrap items-start gap-4 rounded-lg border bg-card p-4"
                    key={connection.kind}
                  >
                    <Mark live name={COPY[connection.kind].name} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{COPY[connection.kind].name}</span>
                        <Status connection={connection} />
                      </div>
                      <p className="max-w-prose text-muted-foreground">
                        {COPY[connection.kind].description}
                      </p>
                      <Details connection={connection} />
                    </div>
                    <Action connection={connection} onConnect={() => void connect()} />
                  </li>
                ))}
              </ul>
            )}
            {upcoming.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.map(item => (
                  <li className="flex items-start gap-3 rounded-lg border p-4" key={item.name}>
                    <Mark live={false} name={item.name} />
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="flex items-center gap-2 font-medium">
                        {item.name}
                        <Status />
                      </span>
                      <p className="text-muted-foreground">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {error && <FormError message={error} />}
    </section>
  );
}

function Details({ connection }: { connection: Connection }): ReactNode {
  const drive = connection.kind === 'GOOGLE_DRIVE';
  return (
    <>
      {connection.detail && <p className="text-xs">{connection.detail}</p>}
      {connection.unavailableReason && (
        <p className="text-xs text-warning">{connection.unavailableReason}</p>
      )}
      {drive && connection.connected && !pickerConfigured() && (
        <p className="text-xs text-warning">
          Para abrir o seletor de arquivos faltam VITE_GOOGLE_API_KEY e VITE_GOOGLE_APP_ID no .env.
        </p>
      )}
      {drive && connection.connected && (
        <p className="text-xs text-muted-foreground">
          Para desconectar, remova o acesso do zapbots em myaccount.google.com/permissions.
        </p>
      )}
    </>
  );
}

function Action({ connection, onConnect }: { connection: Connection; onConnect: () => void }) {
  if (connection.kind === 'OPENROUTER') {
    return (
      <Button asChild size="sm" variant="outline">
        <a href="#modelos">Escolher Modelos</a>
      </Button>
    );
  }
  if (connection.kind === 'GOOGLE_DRIVE' && !connection.connected) {
    return (
      <Button disabled={Boolean(connection.unavailableReason)} onClick={onConnect} size="sm">
        Conectar
      </Button>
    );
  }
  return null;
}
