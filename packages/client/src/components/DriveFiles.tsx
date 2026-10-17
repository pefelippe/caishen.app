import { useQuery } from '@apollo/client/react';
import { ConnectionsDocument } from '@zapbots/graphql/client';
import { PaperclipIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { pickDriveFile, type PickedFile } from '../lib/drive';

interface Props {
  files: PickedFile[];
  onChange: (files: PickedFile[]) => void;
}

/** Files picked from the Google Drive to hand to a Bot with a Job. */
export function DriveFiles({ files, onChange }: Props) {
  const { data } = useQuery(ConnectionsDocument);
  const [error, setError] = useState<string | null>(null);

  const drive = data?.connections.find(connection => connection.kind === 'GOOGLE_DRIVE');

  const attach = async () => {
    setError(null);
    try {
      const file = await pickDriveFile();
      if (file && !files.some(picked => picked.fileId === file.fileId)) onChange([...files, file]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível anexar');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {files.map(file => (
        <span className="flex items-center gap-0.5" key={file.fileId}>
          <span className="flex items-center gap-1 text-ink">
            <PaperclipIcon className="size-3" />
            {file.name}
          </span>
          <Button
            aria-label={`Remover ${file.name}`}
            className="text-muted-foreground"
            onClick={() => onChange(files.filter(picked => picked.fileId !== file.fileId))}
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
          type="button"
          variant="link"
        >
          <PaperclipIcon className="size-3" />
          Anexar do Drive
        </Button>
      ) : (
        <Link className="text-muted-foreground underline-offset-4 hover:underline" to="/conexoes">
          Conecte o Google Drive para entregar arquivos
        </Link>
      )}
      {error && <span className="text-destructive">{error}</span>}
    </div>
  );
}
