import { useMutation, useQuery } from '@apollo/client/react';
import {
  CancelJobDocument,
  DeleteJobDocument,
  JobDocument,
  JobsDocument,
  RetryJobDocument,
} from '@zapbots/graphql/client';
import { PaperclipIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { BackLink } from '../components/BackLink';
import { BotPage } from '../components/BotPage';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { formatDate } from '../lib/format';
import { JOB_STATUS, ROUTINE_CADENCE } from '../lib/jobs';

/** The first words of a request, to quote it in a suggestion. */
const short = (text: string) => (text.length > 60 ? `${text.slice(0, 60).trimEnd()}…` : text);

/** Saves the Deliverable as a text file, with what was asked and when, to keep or share. */
function download(job: { createdAt: string; deliverable?: string | null; instructions: string }) {
  const day = job.createdAt.slice(0, 10);
  const text = [`Pedido (${formatDate(day)}): ${job.instructions}`, '', job.deliverable ?? ''].join(
    String.fromCharCode(10)
  );
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `entrega-${day}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

const longDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** One Job: what was asked and, once done, the Deliverable. */
export function JobPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useQuery(JobDocument, { variables: { id: id! } });
  const [copied, setCopied] = useState(false);
  const job = data?.job;
  const working = job?.status === 'QUEUED' || job?.status === 'RUNNING';
  // Polls only while the Bot is still on it.
  useQuery(JobDocument, { pollInterval: 1500, skip: !working, variables: { id: id! } });
  const [remove] = useMutation(DeleteJobDocument, { refetchQueries: [JobsDocument] });
  const [cancel, { loading: cancelling }] = useMutation(CancelJobDocument, {
    refetchQueries: [JobsDocument],
  });
  const [retry, { error: retryError, loading: retrying }] = useMutation(RetryJobDocument, {
    refetchQueries: [JobsDocument],
  });

  if (loading && !data) return <PageSkeleton />;
  if (!job) return <p>Trabalho não encontrado.</p>;

  const onRetry = async () => {
    const result = await retry({ variables: { id: job.id } }).catch(() => null);
    if (result?.data) navigate(`/caishen/trabalhos/${result.data.retryJob.id}`);
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(true);
  };

  const onDelete = async () => {
    await remove({ variables: { id: job.id } });
    navigate('/caishen/trabalhos');
  };

  return (
    <BotPage
      actions={
        working ? (
          <Button
            disabled={cancelling}
            onClick={() => void cancel({ variables: { id: job.id } })}
            variant="ghost"
          >
            Cancelar
          </Button>
        ) : (
          <Button onClick={() => void onDelete()} variant="ghost">
            Excluir
          </Button>
        )
      }
      bot={job.bot.key}
      description={
        <>
          <Badge className="mr-2" variant={JOB_STATUS[job.status].variant}>
            {JOB_STATUS[job.status].label}
          </Badge>
          {job.routine ? `Rotina ${ROUTINE_CADENCE[job.routine.cadence]}, entregue` : 'Pedido'} em{' '}
          {longDate.format(new Date(job.createdAt))}
          {job.finishedAt && `, concluído em ${longDate.format(new Date(job.finishedAt))}`}
          {job.model && ` com ${job.model}`}
        </>
      }
      eyebrow={<BackLink to="/caishen/trabalhos">Trabalhos</BackLink>}
      suggestions={
        job.status === 'DONE'
          ? [
              `Explique com mais detalhe a Entrega "${short(job.instructions)}".`,
              'Qual é o primeiro passo que devo dar agora?',
              'Algum número dessa Entrega mudou desde que ela foi feita?',
            ]
          : undefined
      }
      title={`Trabalho para ${job.bot.name}`}
    >
      <Card>
        <CardHeader>
          <CardTitle>Pedido</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="whitespace-pre-wrap">{job.instructions}</p>
          {job.attachments.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {job.attachments.map(attachment => (
                <a
                  className="flex items-center gap-1 text-ink underline-offset-4 hover:underline"
                  href={attachment.url}
                  key={attachment.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <PaperclipIcon className="size-3" />
                  {attachment.name}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-ink">
        <CardHeader>
          <CardTitle>Entrega</CardTitle>
          {job.status === 'DONE' && job.deliverable && (
            <CardAction>
              <Button onClick={() => void copy(job.deliverable!)} size="sm" variant="ghost">
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              <Button onClick={() => download(job)} size="sm" variant="ghost">
                Baixar
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {job.status === 'DONE' && (
            <p className="max-w-prose leading-relaxed whitespace-pre-wrap">{job.deliverable}</p>
          )}
          {job.status === 'FAILED' && (
            <div className="flex flex-col items-start gap-3">
              <p className="text-destructive">{job.error}</p>
              <Button disabled={retrying} onClick={() => void onRetry()} variant="outline">
                Pedir de novo
              </Button>
              {retryError && <FormError message={retryError.message} />}
            </div>
          )}
          {working && (
            <div className="flex flex-col gap-3">
              {job.deliverable && (
                <p className="max-w-prose leading-relaxed whitespace-pre-wrap">
                  {job.deliverable}…
                </p>
              )}
              <p className="text-muted-foreground">
                {job.deliverable
                  ? `${job.bot.name} ainda está escrevendo.`
                  : `${job.bot.name} está trabalhando nisso.`}{' '}
                Esta página se atualiza sozinha.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </BotPage>
  );
}
