import { useMutation, useQuery } from '@apollo/client/react';
import { CreateNoteDocument, NotesDocument } from '@mny/graphql/client';
import { Link, useNavigate } from 'react-router-dom';

export function NotesPage() {
  const navigate = useNavigate();
  const { data, loading } = useQuery(NotesDocument, { fetchPolicy: 'cache-and-network' });
  const [createNote] = useMutation(CreateNoteDocument, { refetchQueries: [NotesDocument] });

  const onCreate = async () => {
    const result = await createNote({ variables: { input: {} } });
    if (result.data) navigate(`/anotacoes/${result.data.createNote.id}`);
  };

  return (
    <div className="stack">
      <div className="row between">
        <h1>Anotações</h1>
        <button onClick={() => void onCreate()} type="button">
          Nova anotação
        </button>
      </div>
      <div className="card">
        {loading && !data ? (
          <p className="muted">Carregando…</p>
        ) : data?.notes.length ? (
          <table>
            <tbody>
              {data.notes.map(note => (
                <tr key={note.id}>
                  <td>
                    <Link to={`/anotacoes/${note.id}`}>{note.title}</Link>
                  </td>
                  <td className="muted">
                    {[note.holder?.name, note.creditOperation?.name, note.creditCard?.name]
                      .filter(Boolean)
                      .join(' · ')}
                  </td>
                  <td className="muted num">{new Date(note.updatedAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Nenhuma anotação ainda.</p>
        )}
      </div>
    </div>
  );
}
