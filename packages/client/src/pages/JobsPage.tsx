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
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { BotPage } from '../components/BotPage';
import { DriveFiles } from '../components/DriveFiles';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import type { PickedFile } from '../lib/drive';
import { JOB_STATUS, ROUTINE_CADENCE } from '../lib/jobs';

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
  'Leia a Fatura anexada e diga quanto dela é parcelado.',
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

/** Work handed to Caishen: a form to hand over more, and what came back so far. */
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
    if (result?.data) navigate(`/caishen/trabalhos/${result.data.createJob.id}`);
  };

  return (
    <BotPage
      bot="FINANCE"
      description={`Peça uma análise ou um plano. ${bot.name} trabalha sozinho e avisa aqui quando a Entrega estiver pronta.`}
      title="Trabalhos"
    >
      <Card>
        <CardHeader>
          <CardTitle>Novo Trabalho</CardTitle>
          <CardDescription>
            {bot.name} lê suas Finanças e os arquivos que você entregar. Ele não altera nada nem
            movimenta dinheiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {panel.aiStatus.configured ? (
            <form className="flex flex-col gap-3" onSubmit={submit}>
              <Textarea
                aria-label="O que precisa ser feito"
                className="min-h-24 bg-card"
                onChange={event => setInstructions(event.target.value)}
                placeholder={EXAMPLES[0]}
                value={instructions}
              />
              {cadence === 'ONCE' ? (
                <DriveFiles files={files} onChange={setFiles} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  A primeira Entrega sai agora; depois {bot.name} refaz o Trabalho{' '}
                  {ROUTINE_CADENCE[cadence]} com os dados do dia. Rotinas não levam arquivos.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
                <Button
                  disabled={creating || scheduling || full || !instructions.trim()}
                  type="submit"
                >
                  Entregar a {bot.name}
                </Button>
                {examples.map(example => (
                  <Button
                    className="h-auto px-0 text-left text-xs whitespace-normal text-ink"
                    key={example}
                    onClick={() => setInstructions(example)}
                    type="button"
                    variant="link"
                  >
                    {example}
                  </Button>
                ))}
              </div>
              {full && (
                <p className="text-xs text-muted-foreground">
                  {bot.name} já está com {MAX_WORKING_JOBS} Trabalhos em andamento. Espere um
                  terminar para pedir outro.
                </p>
              )}
              {(error ?? routineError) && <FormError message={(error ?? routineError)!.message} />}
            </form>
          ) : (
            <p className="text-muted-foreground">
              Falta a chave do OpenRouter no servidor (OPENROUTER_API_KEY) para {bot.name}{' '}
              trabalhar.
            </p>
          )}
        </CardContent>
      </Card>

      {Boolean(routines?.routines.length) && (
        <Card>
          <CardHeader>
            <CardTitle>Rotinas</CardTitle>
            <CardDescription>Trabalhos que {bot.name} refaz sozinho.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y">
              {routines!.routines.map(routine => (
                <li className="flex items-baseline gap-3 py-2" key={routine.id}>
                  <span className="min-w-0 flex-1 truncate">{routine.instructions}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {routine.paused ? (
                      'pausada'
                    ) : (
                      <>
                        {ROUTINE_CADENCE[routine.cadence]}, próxima em{' '}
                        <span className="tabular-nums">
                          {day.format(new Date(routine.nextRunAt))}
                        </span>
                      </>
                    )}
                  </span>
                  <Button
                    onClick={() =>
                      void setPaused({ variables: { id: routine.id, paused: !routine.paused } })
                    }
                    size="sm"
                    variant="ghost"
                  >
                    {routine.paused ? 'Retomar' : 'Pausar'}
                  </Button>
                  <Button
                    onClick={() => void deleteRoutine({ variables: { id: routine.id } })}
                    size="sm"
                    variant="ghost"
                  >
                    Parar
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Entregues e em andamento</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.jobs.length ? (
            <ul className="flex flex-col divide-y">
              {data.jobs.map(job => (
                <li className="flex items-baseline gap-3 py-2" key={job.id}>
                  <Link
                    className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                    to={`/caishen/trabalhos/${job.id}`}
                  >
                    {job.instructions}
                  </Link>
                  <Badge variant={JOB_STATUS[job.status].variant}>
                    {JOB_STATUS[job.status].label}
                  </Badge>
                  <span className="w-24 shrink-0 text-right text-muted-foreground tabular-nums">
                    {shortDate.format(new Date(job.createdAt))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Nenhum Trabalho ainda.</p>
          )}
        </CardContent>
      </Card>
    </BotPage>
  );
}
