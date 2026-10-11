import { useMutation, useQuery } from '@apollo/client/react';
import { DeleteNoteDocument, NoteDocument, RenameNoteDocument } from '@mny/graphql/client';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { BackLink } from '../components/BackLink';
import { NoteEditor } from '../components/NoteEditor';
import { PageSkeleton } from '../components/PageSkeleton';

interface Props {
  user: { id: string; name: string };
}

export function NotePage({ user }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useQuery(NoteDocument, { variables: { id: id! } });
  const [rename] = useMutation(RenameNoteDocument);
  const [remove] = useMutation(DeleteNoteDocument);

  if (loading) return <PageSkeleton />;
  const note = data?.note;
  if (!note) return <p>Anotação não encontrada.</p>;

  const onDelete = async () => {
    await remove({ variables: { id: note.id } });
    navigate('/anotacoes');
  };

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/anotacoes">Anotações</BackLink>
      <div className="flex items-center justify-between gap-2">
        <Input
          aria-label="Título"
          className="h-auto flex-1 border-none px-0 text-2xl font-semibold shadow-none focus-visible:ring-0 md:text-2xl dark:bg-transparent"
          defaultValue={note.title}
          key={note.id}
          onBlur={event => {
            const title = event.target.value.trim();
            if (title && title !== note.title) void rename({ variables: { id: note.id, title } });
          }}
        />
        <Button onClick={() => void onDelete()} variant="destructive">
          Excluir
        </Button>
      </div>
      <NoteEditor key={note.id} noteId={note.id} user={user} />
    </div>
  );
}
