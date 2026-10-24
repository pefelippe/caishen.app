import { useMutation, useQuery } from '@apollo/client/react';
import { OrganizationDocument, RenameOrganizationDocument } from '@zapbots/graphql/client';
import { useState, type FormEvent } from 'react';

import { Field } from '@zapbots/ui/blocks/field';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Avatar, AvatarFallback } from '@zapbots/ui/components/avatar';
import { Badge } from '@zapbots/ui/components/badge';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Input } from '@zapbots/ui/components/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@zapbots/ui/components/table';

import { FormError } from '../components/FormError';
import { initials } from '../components/ProfileMenu';
import { authClient } from '../lib/auth';
import { useI18n, type StringKey } from '../lib/i18n';

export const ROLES: Record<string, StringKey> = {
  admin: 'users.roleAdmin',
  member: 'users.roleMember',
  owner: 'users.roleOwner',
};

/**
 * Configurações › Organização: its name and the Users in it. Inviting Members is out of scope
 * (docs/adr/0007), so the list only shows who is already there.
 */
export function OrganizationSettings() {
  const { t } = useI18n();
  const { data: session } = authClient.useSession();
  const { data, loading } = useQuery(OrganizationDocument);
  const [rename, { error, loading: saving }] = useMutation(RenameOrganizationDocument);
  const [name, setName] = useState<string | null>(null);

  if (loading && !data) return <PageSkeleton />;
  if (!data) return <p>{t('common.loadFailed')}</p>;
  const organization = data.organization;
  const value = name ?? organization.name;
  const members = organization.members;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await rename({ variables: { name: value } }).catch(() => undefined);
    setName(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="text-lg font-semibold">{t('org.info')}</h2>
        <div className="flex flex-col gap-6 sm:flex-row">
          <Avatar className="size-16 shrink-0">
            <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">
              {initials(organization.name) || '·'}
            </AvatarFallback>
          </Avatar>
          <form className="flex flex-1 flex-col gap-5" onSubmit={event => void submit(event)}>
            <Field label={t('org.name')}>
              <Input maxLength={80} onChange={event => setName(event.target.value)} value={value} />
            </Field>
            <div className="flex items-center gap-3">
              <Button
                disabled={saving || !value.trim() || value === organization.name}
                type="submit"
              >
                {t('common.save')}
              </Button>
              {error && <FormError error={error} />}
            </div>
          </form>
        </div>
      </Card>

      <Card>
        <div>
          <h2 className="text-lg font-semibold">{t('users.title')}</h2>
          <p className="mt-1 text-muted-foreground">
            {t('org.memberCount', { count: members.length })} · {t('users.subtitle')}
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('users.name')}</TableHead>
              <TableHead className="text-right">{t('users.role')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(member => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="text-xs font-semibold">
                        {initials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="leading-tight">
                      <div className="font-medium">
                        {member.name}{' '}
                        {member.email === session?.user.email && (
                          <span className="font-normal text-muted-foreground">
                            {t('profile.you')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">
                    {ROLES[member.role] ? t(ROLES[member.role]!) : member.role}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
