import { useMutation, useQuery } from '@apollo/client/react';
import { CreateNoteDocument, NotesDocument } from '@mny/graphql/client';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

export function NotesPage() {
  const navigate = useNavigate();
  const { data, loading } = useQuery(NotesDocument, { fetchPolicy: 'cache-and-network' });
  const [createNote] = useMutation(CreateNoteDocument, { refetchQueries: [NotesDocument] });

  const onCreate = async () => {
    const result = await createNote({ variables: { input: {} } });
    if (result.data) navigate(`/anotacoes/${result.data.createNote.id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Anotações</h1>
        <Button onClick={() => void onCreate()}>Nova anotação</Button>
      </div>
      <Card>
        <CardContent>
          {loading && !data ? (
            <Skeleton className="h-24 w-full" />
          ) : data?.notes.length ? (
            <Table>
              <TableBody>
                {data.notes.map(note => (
                  <TableRow key={note.id}>
                    <TableCell>
                      <Link
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        to={`/anotacoes/${note.id}`}
                      >
                        {note.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {[note.holder?.name, note.creditOperation?.name, note.creditCard?.name]
                        .filter(Boolean)
                        .join(' · ')}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {new Date(note.updatedAt).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Nenhuma anotação ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
