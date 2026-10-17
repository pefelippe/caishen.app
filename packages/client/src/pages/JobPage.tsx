import { useMutation, useQuery } from '@apollo/client/react';
import { DeleteJobDocument, JobDocument, JobsDocument } from '@zapbots/graphql/client';
import { PaperclipIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { BackLink } from '../components/BackLink';
import { BotPage } from '../components/BotPage';
import { PageSkeleton } from '../components/PageSkeleton';
import { JOB_STATUS } from '../lib/jobs';

const longDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** One Job: what was asked and, once done, the Deliverable. */
export function JobPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useQuery(JobDocument, { variables: { id: id! } });
  const job = data?.job;
  const working = job?.status === 'QUEUED' || job?.status === 'RUNNING';
  // Polls only while the Bot is still on it.
  useQuery(JobDocument, { pollInterval: 1500, skip: !working, variables: { id: id! } });
  const [remove] = useMutation(DeleteJobDocument, { refetchQueries: [JobsDocument] });

  if (loading && !data) return <PageSkeleton />;
  if (!job) return <p>Trabalho não encontrado.</p>;

  const onDelete = async () => {
    await remove({ variables: { id: job.id } });
    navigate('/caishen/trabalhos');
  };

  return (
    <BotPage
      actions={
        !working && (
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
          Pedido em {longDate.format(new Date(job.createdAt))}
          {job.finishedAt && `, concluído em ${longDate.format(new Date(job.finishedAt))}`}
        </>
      }
      eyebrow={<BackLink to="/caishen/trabalhos">Trabalhos</BackLink>}
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
        </CardHeader>
        <CardContent>
          {job.status === 'DONE' && (
            <p className="max-w-prose leading-relaxed whitespace-pre-wrap">{job.deliverable}</p>
          )}
          {job.status === 'FAILED' && <p className="text-destructive">{job.error}</p>}
          {working && (
            <p className="text-muted-foreground">
              {job.bot.name} está trabalhando nisso. Esta página se atualiza sozinha.
            </p>
          )}
        </CardContent>
      </Card>
    </BotPage>
  );
}
