import { HocuspocusProvider } from '@hocuspocus/provider';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';

const COLORS = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2'];

function colorFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length]!;
}

interface Props {
  noteId: string;
  user: { id: string; name: string };
}

/** Rich-text Note synced through the collab app; the session cookie authenticates the socket. */
export function NoteEditor({ noteId, user }: Props) {
  const [status, setStatus] = useState('connecting');
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  // Created in the effect, not in a memo: StrictMode runs the cleanup once on mount, and a memoized
  // provider would be handed back already destroyed, leaving an editor that never syncs.
  useEffect(() => {
    const next = new HocuspocusProvider({
      name: `note:${noteId}`,
      onAuthenticationFailed: () => setStatus('forbidden'),
      onStatus: ({ status: current }) => setStatus(current),
      url: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/collab`,
    });
    setProvider(next);
    return () => {
      next.destroy();
      setProvider(null);
    };
  }, [noteId]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <span className="text-xs text-muted-foreground">
          {status === 'connected'
            ? '● sincronizado'
            : status === 'forbidden'
              ? 'sem acesso'
              : '○ conectando…'}
        </span>
        {provider && <SyncedEditor key={noteId} provider={provider} user={user} />}
      </CardContent>
    </Card>
  );
}

function SyncedEditor({ provider, user }: { provider: HocuspocusProvider; user: Props['user'] }) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: provider.document }),
        CollaborationCaret.configure({
          provider,
          user: { color: colorFor(user.id), name: user.name },
        }),
      ],
    },
    [provider]
  );
  return <EditorContent className="editor" editor={editor} />;
}
