import { useMutation, useQuery } from '@apollo/client/react';
import { OrganizationDocument, RenameOrganizationDocument } from '@zapbots/graphql/client';
import { useState, type FormEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Field, PageHeading } from '../components/Field';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { formatDate } from '../lib/format';
import { useI18n, type StringKey } from '../lib/i18n';

const ROLES: Record<string, StringKey> = {
  admin: 'users.roleAdmin',
  member: 'users.roleMember',
  owner: 'users.roleOwner',
};

/**
 * Organização: its name and the Users in it. Inviting Members is out of scope (docs/adr/0007), so
 * the list only shows who is already there.
 */
export function OrganizationPage() {
  const { t } = useI18n();
  const { data, loading } = useQuery(OrganizationDocument);
  const [rename, { error, loading: saving }] = useMutation(RenameOrganizationDocument);
  const [name, setName] = useState<string | null>(null);

  if (loading && !data) return <PageSkeleton />;
  if (!data) return <p>{t('common.loadFailed')}</p>;
  const organization = data.organization;
  const value = name ?? organization.name;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await rename({ variables: { name: value } }).catch(() => undefined);
    setName(null);
  };

  return (
    <div className="flex flex-col gap-10">
      <PageHeading subtitle={t('org.subtitle')}>{t('org.title')}</PageHeading>
      <form className="flex flex-col gap-6" onSubmit={event => void submit(event)}>
        <Field label={t('org.name')}>
          <Input maxLength={80} onChange={event => setName(event.target.value)} value={value} />
        </Field>
        <Field label={t('org.created')}>
          <p className="tabular-nums">{formatDate(organization.createdAt.slice(0, 10))}</p>
        </Field>
        <div className="flex items-center gap-3">
          <Button disabled={saving || !value.trim() || value === organization.name} type="submit">
            {t('common.save')}
          </Button>
          {error && <FormError message={error.message} />}
        </div>
      </form>
      <section className="flex flex-col gap-4 border-t pt-8">
        <div>
          <h2 className="text-lg font-semibold">{t('users.title')}</h2>
          <p className="mt-1 max-w-prose text-muted-foreground">{t('users.subtitle')}</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('users.name')}</TableHead>
              <TableHead>{t('users.email')}</TableHead>
              <TableHead>{t('users.role')}</TableHead>
              <TableHead className="text-right">{t('users.since')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organization.members.map(member => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell className="text-muted-foreground">{member.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {ROLES[member.role] ? t(ROLES[member.role]!) : member.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatDate(member.joinedAt.slice(0, 10))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
