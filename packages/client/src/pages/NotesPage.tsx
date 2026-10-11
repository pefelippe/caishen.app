import { useMutation, useQuery } from '@apollo/client/react';
import { CreateNoteDocument, NotesDocument } from '@mny/graphql/client';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

import { AreaPage } from '../components/AreaPage';

const SUGGESTIONS = [
  'O que eu anotei por último?',
  'Resuma minhas Anotações desta semana',
  'Crie uma Anotação com uma lista de compras',
];

export function NotesPage() {
  const navigate = useNavigate();
  const { data, loading } = useQuery(NotesDocument, { fetchPolicy: 'cache-and-network' });
  const [createNote] = useMutation(CreateNoteDocument, { refetchQueries: [NotesDocument] });

  const onCreate = async () => {
    const result = await createNote({ variables: { input: {} } });
    if (result.data) navigate(`/anotacoes/${result.data.createNote.id}`);
  };

  return (
    <AreaPage
      actions={<Button onClick={() => void onCreate()}>Nova Anotação</Button>}
      area="NOTES"
      description="Texto rico e colaborativo. Uma Anotação pode ter Anexos do Google Drive."
      suggestions={SUGGESTIONS}
      title="Anotações"
    >
      {loading && !data ? (
        <Skeleton className="h-24 w-full" />
      ) : data?.notes.length ? (
        <Table className="border-t border-foreground/60">
          <TableBody>
            {data.notes.map(note => (
              <TableRow key={note.id}>
                <TableCell className="py-3">
                  <Link
                    className="font-serif text-lg underline-offset-4 hover:underline"
                    to={`/anotacoes/${note.id}`}
                  >
                    {note.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[note.task?.title, note.creditOperation?.name, note.creditCard?.name]
                    .filter(Boolean)
                    .join(' · ')}
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {new Date(note.updatedAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="border-t border-foreground/60 pt-5 text-muted-foreground">
          Nenhuma Anotação ainda. Comece uma, ou peça ao Buddy para criar.
        </p>
      )}
    </AreaPage>
  );
}
