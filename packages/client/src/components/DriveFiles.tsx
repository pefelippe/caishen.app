import { useQuery } from '@apollo/client/react';
import { ConnectionsDocument } from '@zapbots/graphql/client';
import { PaperclipIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@zapbots/ui/components/button';

import { pickDriveFile, type PickedFile } from '../lib/drive';
import { friendlyError } from '../lib/errors';

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
      setError(friendlyError(cause, 'Não foi possível anexar.'));
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
      {/* Drive is no longer offered on Integrações: only an old Connection can still attach. */}
      {drive?.connected && (
        <Button
          className="text-muted-foreground"
          onClick={() => void attach()}
          size="sm"
          type="button"
          variant="ghost"
        >
          <PaperclipIcon />
          Anexar do Drive
        </Button>
      )}
      {error && <span className="text-destructive">{error}</span>}
    </div>
  );
}
