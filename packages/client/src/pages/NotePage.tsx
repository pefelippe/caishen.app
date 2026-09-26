import { useMutation, useQuery } from '@apollo/client/react';
import { DeleteNoteDocument, NoteDocument, RenameNoteDocument } from '@mny/graphql/client';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { NoteEditor } from '../components/NoteEditor';

interface Props {
  user: { id: string; name: string };
}

export function NotePage({ user }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useQuery(NoteDocument, { variables: { id: id! } });
  const [rename] = useMutation(RenameNoteDocument);
  const [remove] = useMutation(DeleteNoteDocument);

  if (loading) return <p className="muted">Carregando…</p>;
  const note = data?.note;
  if (!note) return <p>Anotação não encontrada.</p>;

  const onDelete = async () => {
    await remove({ variables: { id: note.id } });
    navigate('/anotacoes');
  };

  return (
    <div className="stack">
      <Link className="muted small" to="/anotacoes">
        ← Anotações
      </Link>
      <div className="row between">
        <input
          className="title-input"
          defaultValue={note.title}
          key={note.id}
          onBlur={event => {
            const title = event.target.value.trim();
            if (title && title !== note.title) void rename({ variables: { id: note.id, title } });
          }}
        />
        <button className="danger" onClick={() => void onDelete()} type="button">
          Excluir
        </button>
      </div>
      <NoteEditor key={note.id} noteId={note.id} user={user} />
    </div>
  );
}
