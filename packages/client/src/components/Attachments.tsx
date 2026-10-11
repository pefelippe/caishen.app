import { useMutation, useQuery } from '@apollo/client/react';
import {
  AddAttachmentDocument,
  ConnectionsDocument,
  RemoveAttachmentDocument,
  type AttachmentFieldsFragment,
} from '@mny/graphql/client';
import { PaperclipIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { pickDriveFile } from '../lib/drive';

interface Props {
  attachments: AttachmentFieldsFragment[];
  /** Exactly one of the two: the owner of the Attachments. */
  noteId?: string;
  taskId?: string;
}

/** Attachments of a Note or a Task, with a button that opens Google's file picker. */
export function Attachments({ attachments, noteId, taskId }: Props) {
  const { data } = useQuery(ConnectionsDocument);
  const [add] = useMutation(AddAttachmentDocument, { refetchQueries: 'active' });
  const [remove] = useMutation(RemoveAttachmentDocument, { refetchQueries: 'active' });
  const [error, setError] = useState<string | null>(null);

  const drive = data?.connections.find(connection => connection.kind === 'GOOGLE_DRIVE');

  const attach = async () => {
    setError(null);
    try {
      const file = await pickDriveFile();
      if (file) await add({ variables: { input: { ...file, noteId, taskId } } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível anexar');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {attachments.map(attachment => (
        <span className="flex items-center gap-0.5" key={attachment.id}>
          <a
            className="flex items-center gap-1 text-ink underline-offset-4 hover:underline"
            href={attachment.url}
            rel="noreferrer"
            target="_blank"
          >
            <PaperclipIcon className="size-3" />
            {attachment.name}
          </a>
          <Button
            aria-label={`Remover ${attachment.name}`}
            className="text-muted-foreground"
            onClick={() => void remove({ variables: { id: attachment.id } })}
            size="icon-xs"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </span>
      ))}
      {drive?.connected ? (
        <Button
          className="h-auto px-0 text-xs text-muted-foreground"
          onClick={() => void attach()}
          variant="link"
        >
          <PaperclipIcon className="size-3" />
          Anexar do Drive
        </Button>
      ) : (
        noteId && (
          <Link className="text-muted-foreground underline-offset-4 hover:underline" to="/conexoes">
            Conecte o Google Drive para anexar arquivos
          </Link>
        )
      )}
      {error && <span className="text-destructive">{error}</span>}
    </div>
  );
}
