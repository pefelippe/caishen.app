import { useMutation, useQuery } from '@apollo/client/react';
import { DeleteNoteDocument, NoteDocument, RenameNoteDocument } from '@mny/graphql/client';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { AreaPage } from '../components/AreaPage';
import { Attachments } from '../components/Attachments';
import { BackLink } from '../components/BackLink';
import { NoteEditor } from '../components/NoteEditor';
import { PageSkeleton } from '../components/PageSkeleton';

interface Props {
  user: { id: string; name: string };
}

const SUGGESTIONS = ['Resuma esta Anotação', 'O que mais eu anotei sobre este assunto?'];

export function NotePage({ user }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useQuery(NoteDocument, { variables: { id: id! } });
  const [rename] = useMutation(RenameNoteDocument);
  const [remove] = useMutation(DeleteNoteDocument);

  if (loading && !data) return <PageSkeleton />;
  const note = data?.note;
  if (!note) return <p>Anotação não encontrada.</p>;

  const onDelete = async () => {
    await remove({ variables: { id: note.id } });
    navigate('/anotacoes');
  };

  return (
    <AreaPage
      actions={
        <Button onClick={() => void onDelete()} variant="outline">
          Excluir
        </Button>
      }
      area="NOTES"
      eyebrow={<BackLink to="/anotacoes">Anotações</BackLink>}
      suggestions={SUGGESTIONS}
      title={
        <Input
          aria-label="Título"
          className="h-auto w-[min(44rem,70vw)] rounded-none border-0 border-b border-transparent bg-transparent px-0 font-serif text-4xl shadow-none focus-visible:border-ink focus-visible:ring-0 md:text-4xl"
          defaultValue={note.title}
          key={note.id}
          onBlur={event => {
            const title = event.target.value.trim();
            if (title && title !== note.title) void rename({ variables: { id: note.id, title } });
          }}
        />
      }
    >
      <Attachments attachments={note.attachments} noteId={note.id} />
      <NoteEditor key={note.id} noteId={note.id} user={user} />
    </AreaPage>
  );
}
