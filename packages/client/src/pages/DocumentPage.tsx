import { useMutation, useQuery } from '@apollo/client/react';
import { EditDeliverableDocument, JobDocument } from '@zapbots/graphql/client';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ArrowLeftIcon, DownloadIcon, RotateCcwIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { DocumentToolbar } from '../components/DocumentToolbar';
import { PageSkeleton } from '../components/PageSkeleton';
import { deliverableName, downloadMarkdown } from '../lib/documents';
import { formatDate } from '../lib/format';
import { useI18n } from '../lib/i18n';

/** How long typing has to pause before the edit is saved. */
const SAVE_DELAY = 800;

type Status = 'error' | 'saved' | 'saving';

/**
 * A Deliverable on its own page, as a document: the Caishen's text in an editor the User can
 * change. Edits save on their own; the Bot's original stays on the server and can be restored.
 */
export function DocumentPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { data, loading } = useQuery(JobDocument, { variables: { id } });

  if (loading && !data) return <PageSkeleton />;
  const job = data?.job;
  if (!job || job.status !== 'DONE') {
    return (
      <div className="flex flex-col items-start gap-4 p-10">
        <p className="text-muted-foreground">{t('document.notFound')}</p>
        <Button asChild variant="outline">
          <Link to="/documents">
            <ArrowLeftIcon />
            {t('document.back')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <DocumentEditor
      createdAt={job.finishedAt ?? job.createdAt}
      edited={job.edited}
      id={job.id}
      instructions={job.instructions}
      original={job.originalDeliverable ?? ''}
      text={job.deliverable ?? ''}
    />
  );
}

function DocumentEditor({
  createdAt,
  edited,
  id,
  instructions,
  original,
  text,
}: {
  createdAt: string;
  edited: boolean;
  id: string;
  instructions: string;
  original: string;
  text: string;
}) {
  const { t } = useI18n();
  const [save] = useMutation(EditDeliverableDocument);
  const [status, setStatus] = useState<Status>('saved');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const persist = async (markdown: string | null) => {
    setStatus('saving');
    const result = await save({ variables: { id, text: markdown } }).catch(() => null);
    setStatus(result?.data ? 'saved' : 'error');
  };

  const editor = useEditor({
    content: text,
    contentType: 'markdown',
    editorProps: { attributes: { 'aria-label': deliverableName(text, instructions) } },
    extensions: [StarterKit, Markdown],
    immediatelyRender: true,
    onUpdate: ({ editor: current }) => {
      clearTimeout(timer.current);
      setStatus('saving');
      timer.current = setTimeout(() => {
        timer.current = undefined;
        void persist(current.getMarkdown());
      }, SAVE_DELAY);
    },
  });

  // An edit still waiting for its pause is saved when the page closes.
  useEffect(
    () => () => {
      if (timer.current === undefined) return;
      clearTimeout(timer.current);
      if (!editor.isDestroyed) void save({ variables: { id, text: editor.getMarkdown() } });
    },
    [editor, id, save]
  );

  const restore = async () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    editor.commands.setContent(original, { contentType: 'markdown', emitUpdate: false });
    await persist(null);
  };

  const name = deliverableName(editor.isEmpty ? text : editor.getMarkdown(), instructions);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-card px-5 py-3">
        <Button asChild aria-label={t('document.back')} size="icon-sm" variant="ghost">
          <Link to="/documents">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-medium">{name}</div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {formatDate(createdAt)}
            {edited && ` · ${t('document.edited')}`}
          </div>
        </div>
        <Badge variant={status === 'error' ? 'destructive' : 'outline'}>
          {t(
            status === 'saving'
              ? 'document.saving'
              : status === 'error'
                ? 'document.saveFailed'
                : 'document.saved'
          )}
        </Badge>
        {edited && (
          <Button
            onClick={() => void restore()}
            size="sm"
            title={t('document.restoreHint')}
            variant="ghost"
          >
            <RotateCcwIcon />
            {t('document.restore')}
          </Button>
        )}
        <Button
          onClick={() => downloadMarkdown(name, editor.getMarkdown())}
          size="sm"
          variant="outline"
        >
          <DownloadIcon />
          {t('documents.download')}
        </Button>
      </header>
      <DocumentToolbar editor={editor} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted px-4 py-8">
        <EditorContent
          className="doc-page mx-auto min-h-full w-full max-w-[816px] rounded-sm bg-card px-8 py-12 shadow-sm md:px-[72px] md:py-16"
          editor={editor}
        />
      </div>
    </div>
  );
}
