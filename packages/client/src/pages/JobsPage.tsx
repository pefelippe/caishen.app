import { useMutation, useQuery } from '@apollo/client/react';
import {
  BotAlertsDocument,
  BotPanelDocument,
  CreateJobDocument,
  CreateRoutineDocument,
  DeleteRoutineDocument,
  JobsDocument,
  RoutinesDocument,
  SetRoutinePausedDocument,
  type AlertKind,
  type RoutineCadence,
} from '@zapbots/graphql/client';
import { ArrowUpRightIcon, InboxIcon, RepeatIcon, SendIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Kbd } from '@zapbots/ui/blocks/kbd';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@zapbots/ui/components/select';
import { Textarea } from '@zapbots/ui/components/textarea';
import { cn } from '@zapbots/ui/lib/utils';

import { BotPage } from '../components/BotPage';
import { DriveFiles } from '../components/DriveFiles';
import { FormError } from '../components/FormError';
import { useToast, useUndoableDelete } from '../components/Toaster';
import type { PickedFile } from '../lib/drive';
import { JOB_STATUS, ROUTINE_CADENCE } from '../lib/jobs';
import { isMac, shortcut } from '../lib/shortcuts';

type Cadence = 'ONCE' | RoutineCadence;

/** What to ask for when an Alert of each kind is up; the most urgent comes first. */
const FROM_ALERTS: Partial<Record<AlertKind, string>> = {
  ABOVE_MARKET: 'Monte um roteiro para renegociar ou portar a Operação com taxa acima do mercado.',
  DUE_SOON: 'Organize o que vence nos próximos 7 dias por ordem de prioridade.',
  HIGH_UTILIZATION: 'Como reduzir o uso do limite do Cartão sem atrasar nenhuma conta?',
  OVERDUE: 'Monte um plano para regularizar o que está em atraso, começando pelo mais urgente.',
};

const EXAMPLES = [
  'Monte um plano para eu quitar minhas dívidas, começando pela mais cara.',
  'Compare a taxa de cada Operação de Crédito com a do mercado e diga onde vale renegociar.',
  'Analise meus gastos dos últimos 3 meses e diga onde dá para cortar.',
];

/** Jobs an Organization may have in progress at once, as the server enforces. */
const MAX_WORKING_JOBS = 3;

const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const shortDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
});

/**
 * Work handed to Caishen: one panel to ask (the request, how often, and the button), suggestions
 * from the Alerts under it, the Routines, and what came back so far.
 */
export function JobsPage() {
  const navigate = useNavigate();
  const { data: panel } = useQuery(BotPanelDocument, { variables: { key: 'FINANCE' } });
  const bot = panel?.bot;
  const { data, loading } = useQuery(JobsDocument, {
    skip: !bot,
    variables: { botId: bot?.id ?? '' },
  });
  const inProgress =
    data?.jobs.filter(job => job.status === 'QUEUED' || job.status === 'RUNNING').length ?? 0;
  const working = inProgress > 0;
  // The server refuses more than this at once (`requireRoom`); say so before the click.
  const full = inProgress >= MAX_WORKING_JOBS;
  // Polls only while something is still being worked on.
  useQuery(JobsDocument, {
    pollInterval: 2000,
    skip: !bot || !working,
    variables: { botId: bot?.id ?? '' },
  });
  const { data: routines } = useQuery(RoutinesDocument, {
    skip: !bot,
    variables: { botId: bot?.id ?? '' },
  });
  const [create, { error, loading: creating }] = useMutation(CreateJobDocument, {
    refetchQueries: [JobsDocument],
  });
  const [createRoutine, { error: routineError, loading: scheduling }] = useMutation(
    CreateRoutineDocument,
    { refetchQueries: [JobsDocument, RoutinesDocument] }
  );
  const [setPaused] = useMutation(SetRoutinePausedDocument);
  const toast = useToast();
  // A stopped Rotina leaves the list at once; its toast can bring it back for a moment.
  const { hidden, remove: removeLater } = useUndoableDelete();
  const routineList = routines?.routines.filter(routine => !hidden.has(routine.id)) ?? [];
  const [deleteRoutine] = useMutation(DeleteRoutineDocument, {
    refetchQueries: [RoutinesDocument],
  });
  const { data: alerts } = useQuery(BotAlertsDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { key: 'FINANCE' },
  });
  const examples = [
    ...new Set([
      ...(alerts?.bot.alerts ?? []).flatMap(alert => FROM_ALERTS[alert.kind] ?? []),
      ...EXAMPLES,
    ]),
  ].slice(0, 3);
  const [instructions, setInstructions] = useState('');
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [cadence, setCadence] = useState<Cadence>('ONCE');

  if (!bot || (loading && !data)) return <PageSkeleton />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (cadence !== 'ONCE') {
      const scheduled = await createRoutine({
        variables: { input: { botId: bot.id, cadence, instructions } },
      }).catch(() => null);
      if (scheduled?.data) {
        setInstructions('');
        setCadence('ONCE');
      }
      return;
    }
    const result = await create({
      variables: { input: { attachments: files, botId: bot.id, instructions } },
    }).catch(() => null);
    if (result?.data) navigate(`/workflows/${result.data.createJob.id}`);
  };

  return (
    <BotPage
      bot="FINANCE"
      description={`Peça uma análise ou um plano. ${bot.name} trabalha sozinho e avisa aqui quando a Entrega estiver pronta.`}
      title="Workflows"
    >
      <Card className="md:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">O que {bot.name} deve fazer?</h2>
          <p className="max-w-prose text-muted-foreground">
            Ele lê suas Finanças e os arquivos que você entregar. Não altera nada nem movimenta
            dinheiro.
          </p>
        </div>
        {panel.aiStatus.configured ? (
          <>
            <form
              className="flex flex-col gap-3 rounded-xl bg-secondary/60 p-3 focus-within:bg-secondary"
              onSubmit={submit}
            >
              <Textarea
                aria-label="O que precisa ser feito"
                className="min-h-32 resize-none bg-card text-base"
                onChange={event => setInstructions(event.target.value)}
                onKeyDown={event => {
                  // ⌘/Ctrl + Enter hands it over, as in the chat.
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={EXAMPLES[0]}
                value={instructions}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Select onValueChange={value => setCadence(value as Cadence)} value={cadence}>
                  <SelectTrigger aria-label="Frequência" className="w-40 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONCE">Uma vez</SelectItem>
                    <SelectItem value="WEEKLY">Toda semana</SelectItem>
                    <SelectItem value="MONTHLY">Todo mês</SelectItem>
                  </SelectContent>
                </Select>
                {cadence === 'ONCE' && <DriveFiles files={files} onChange={setFiles} />}
                <Button
                  aria-keyshortcuts={isMac ? 'Meta+Enter' : 'Control+Enter'}
                  className="ml-auto"
                  disabled={creating || scheduling || full || !instructions.trim()}
                  type="submit"
                >
                  <SendIcon />
                  Entregar a {bot.name}
                  <Kbd className="hidden border-white/25 bg-white/15 text-primary-foreground md:inline-flex">
                    {shortcut('↵')}
                  </Kbd>
                </Button>
              </div>
            </form>
            {cadence !== 'ONCE' && (
              <p className="text-sm text-muted-foreground">
                A primeira Entrega sai agora; depois {bot.name} refaz o Workflow{' '}
                {ROUTINE_CADENCE[cadence]} com os dados do dia.
              </p>
            )}
            {full && (
              <p className="text-sm text-muted-foreground">
                {bot.name} já está com {MAX_WORKING_JOBS} Workflows em andamento. Espere um terminar
                para pedir outro.
              </p>
            )}
            {(error ?? routineError) && <FormError error={error ?? routineError} />}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Ou comece por um destes:</span>
              <ul className="grid gap-2 md:grid-cols-3">
                {examples.map(example => (
                  <li key={example}>
                    <Button
                      className="h-full w-full items-start justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3 text-left font-normal whitespace-normal hover:bg-secondary"
                      onClick={() => setInstructions(example)}
                      type="button"
                      variant="ghost"
                    >
                      {example}
                      <ArrowUpRightIcon className="mt-0.5 shrink-0 text-ink" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="rounded-xl bg-secondary/60 px-4 py-3.5 text-muted-foreground">
            {bot.name} ainda não tem um Modelo de IA ligado neste servidor, então não pode
            trabalhar. Veja em{' '}
            <Link className="text-ink underline-offset-4 hover:underline" to="/integrations#ai">
              Integrações
            </Link>
            .
          </p>
        )}
      </Card>

      {routineList.length > 0 && (
        <Card className="md:p-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">Rotinas</h2>
            <p className="text-muted-foreground">Workflows que {bot.name} refaz sozinho.</p>
          </div>
          <ul className="flex flex-col gap-2">
            {routineList.map(routine => (
              <li
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-secondary/60 px-4 py-3"
                key={routine.id}
              >
                <RepeatIcon className="size-4 shrink-0 text-ink" />
                <span className="min-w-0 flex-1 truncate">{routine.instructions}</span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {routine.paused ? (
                    'Pausada'
                  ) : (
                    <>
                      {ROUTINE_CADENCE[routine.cadence]}, próxima em{' '}
                      <span className="tabular-nums">
                        {day.format(new Date(routine.nextRunAt))}
                      </span>
                    </>
                  )}
                </span>
                <span className="flex gap-1">
                  <Button
                    onClick={() =>
                      // Shown paused (or running) at once; back as it was if the server says no.
                      void setPaused({
                        optimisticResponse: {
                          setRoutinePaused: { ...routine, paused: !routine.paused },
                        },
                        variables: { id: routine.id, paused: !routine.paused },
                      }).catch(() =>
                        toast({ message: 'Não foi possível mudar a Rotina.', tone: 'error' })
                      )
                    }
                    size="sm"
                    variant="ghost"
                  >
                    {routine.paused ? 'Retomar' : 'Pausar'}
                  </Button>
                  <Button
                    onClick={() =>
                      removeLater({
                        commit: () => deleteRoutine({ variables: { id: routine.id } }),
                        ids: [routine.id],
                        message: 'Rotina parada.',
                      })
                    }
                    size="sm"
                    variant="ghost"
                  >
                    Parar
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="md:p-8">
        <h2 className="text-lg font-semibold tracking-tight">Entregues e em andamento</h2>
        {data?.jobs.length ? (
          <ul className="flex flex-col gap-2">
            {data.jobs.map(job => (
              <li key={job.id}>
                <Link
                  className="flex items-center gap-4 rounded-xl bg-secondary/60 px-4 py-3 transition-colors hover:bg-secondary"
                  to={`/workflows/${job.id}`}
                >
                  <span className="min-w-0 flex-1 truncate">{job.instructions}</span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                    <span
                      aria-hidden
                      className={cn('size-2 rounded-full', JOB_STATUS[job.status].dot)}
                    />
                    <span className="first-letter:uppercase">{JOB_STATUS[job.status].label}</span>
                  </span>
                  <span className="hidden w-24 shrink-0 text-right text-sm text-muted-foreground tabular-nums sm:block">
                    {shortDate.format(new Date(job.createdAt))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-4 rounded-xl bg-secondary/60 px-5 py-6">
            <InboxIcon className="size-6 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nada por aqui ainda. Cada pedido que você entregar aparece nesta lista, com o
              andamento e, quando ficar pronta, a Entrega.
            </p>
          </div>
        )}
      </Card>
    </BotPage>
  );
}
