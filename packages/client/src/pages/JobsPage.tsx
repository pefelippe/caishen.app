import { useMutation, useQuery } from '@apollo/client/react';
import { BotPanelDocument, CreateJobDocument, JobsDocument } from '@zapbots/graphql/client';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

import { BackLink } from '../components/BackLink';
import { BotPage } from '../components/BotPage';
import { DriveFiles } from '../components/DriveFiles';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import type { PickedFile } from '../lib/drive';
import { JOB_STATUS } from '../lib/jobs';

const EXAMPLES = [
  'Monte um plano para eu quitar minhas dívidas, começando pela mais cara.',
  'Compare a taxa de cada Operação de Crédito com a do mercado e diga onde vale renegociar.',
  'Leia a Fatura anexada e diga quanto dela é parcelado.',
];

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
  const working = data?.jobs.some(job => job.status === 'QUEUED' || job.status === 'RUNNING');
  // Polls only while something is still being worked on.
  useQuery(JobsDocument, {
    pollInterval: 2000,
    skip: !bot || !working,
    variables: { botId: bot?.id ?? '' },
  });
  const [create, { error, loading: creating }] = useMutation(CreateJobDocument, {
    refetchQueries: [JobsDocument],
  });
  const [instructions, setInstructions] = useState('');
  const [files, setFiles] = useState<PickedFile[]>([]);

  if (!bot || (loading && !data)) return <PageSkeleton />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await create({
      variables: { input: { attachments: files, botId: bot.id, instructions } },
    }).catch(() => null);
    if (result?.data) navigate(`/caishen/trabalhos/${result.data.createJob.id}`);
  };

  return (
    <BotPage
      bot="FINANCE"
      description={`Peça uma análise ou um plano. ${bot.name} trabalha sozinho e avisa aqui quando a Entrega estiver pronta.`}
      eyebrow={<BackLink to="/caishen">Finanças</BackLink>}
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
              <DriveFiles files={files} onChange={setFiles} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button disabled={creating || !instructions.trim()} type="submit">
                  Entregar a {bot.name}
                </Button>
                {EXAMPLES.slice(1).map(example => (
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
              {error && <FormError message={error.message} />}
            </form>
          ) : (
            <p className="text-muted-foreground">
              Falta a chave do OpenRouter no servidor (OPENROUTER_API_KEY) para {bot.name}{' '}
              trabalhar.
            </p>
          )}
        </CardContent>
      </Card>

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
