import { useMutation, useQuery } from '@apollo/client/react';
import { CreateHolderDocument, HoldersDocument } from '@mny/graphql/client';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { ScoreBadge } from '../components/ScoreBadge';
import { formatCents } from '../lib/format';

export function HoldersPage() {
  const { data, loading } = useQuery(HoldersDocument);
  const [createHolder] = useMutation(CreateHolderDocument, { refetchQueries: [HoldersDocument] });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await createHolder({
      variables: {
        input: {
          document: String(values.get('document')) || null,
          name: String(values.get('name')),
        },
      },
    });
    form.reset();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Titulares</h1>
        <p className="text-muted-foreground">
          Cada Titular é uma pessoa cujas finanças você acompanha. A Avaliação é sempre por Titular.
        </p>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : data?.holders.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead className="text-right">Renda mensal</TableHead>
                  <TableHead>Última avaliação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.holders.map(holder => (
                  <TableRow key={holder.id}>
                    <TableCell>
                      <Link
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        to={`/titulares/${holder.id}`}
                      >
                        {holder.name}
                      </Link>
                    </TableCell>
                    <TableCell>{holder.document ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(holder.monthlyIncomeCents)}
                    </TableCell>
                    <TableCell>
                      {holder.assessments[0] ? (
                        <ScoreBadge
                          band={holder.assessments[0].band}
                          score={holder.assessments[0].score}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Nenhum Titular ainda.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Novo Titular</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
            <Input className="w-64" name="name" placeholder="Nome do Titular" required />
            <Input className="w-48" name="document" placeholder="CPF (opcional)" />
            <Button type="submit">Adicionar Titular</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
