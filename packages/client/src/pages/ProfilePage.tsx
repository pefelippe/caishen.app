import { useQuery } from '@apollo/client/react';
import { OrganizationDocument } from '@zapbots/graphql/client';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Field, PageHeading } from '@zapbots/ui/blocks/field';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Avatar, AvatarFallback } from '@zapbots/ui/components/avatar';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Input } from '@zapbots/ui/components/input';

import { DeleteAccountCard } from '../components/DeleteAccountCard';
import { FormError } from '../components/FormError';
import { initials, UserAvatar } from '../components/ProfileMenu';
import { TimeZoneCard } from '../components/TimeZoneCard';
import { TwoFactorCard } from '../components/TwoFactorCard';
import { authClient } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { ROLES } from './OrganizationPage';

/**
 * Perfil: the User's photo, name and e-mail beside the form that changes the name and the photo's
 * URL (the e-mail comes from the sign-in), the time zone (`TimeZoneCard`), the two-step verification (`TwoFactorCard`), and the
 * Organization they belong to, with their role, and deleting the account (`DeleteAccountCard`).
 */
export function ProfilePage() {
  const { t } = useI18n();
  const { data: session, refetch } = authClient.useSession();
  const { data: organization } = useQuery(OrganizationDocument);
  const [name, setName] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!session) return <PageSkeleton />;
  const user = session.user;
  const nameValue = name ?? user.name;
  const imageValue = image ?? user.image ?? '';
  const changed = nameValue.trim() !== user.name || imageValue.trim() !== (user.image ?? '').trim();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await authClient.updateUser({
      image: imageValue.trim() || null,
      name: nameValue.trim(),
    });
    setSaving(false);
    if (result.error) {
      // Better Auth's own reasons are for developers.
      setError(t('common.saveFailed'));
      return;
    }
    setName(null);
    setImage(null);
    await refetch();
  };

  const org = organization?.organization;
  const role = org?.members.find(member => member.email === user.email)?.role;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading subtitle={t('account.subtitle')}>{t('account.title')}</PageHeading>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="items-center justify-center py-10 text-center">
          <UserAvatar
            className="size-28 text-3xl *:data-[slot=avatar-fallback]:text-2xl"
            user={user}
          />
          <div>
            <div className="text-lg font-semibold">{user.name}</div>
            <div className="text-muted-foreground">{user.email}</div>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">{t('profile.info')}</h2>
          <form className="flex flex-col gap-5" onSubmit={event => void submit(event)}>
            <Field label={t('account.name')}>
              <Input
                maxLength={80}
                onChange={event => setName(event.target.value)}
                value={nameValue}
              />
            </Field>
            <Field hint={t('account.emailHint')} label={t('account.email')}>
              <Input disabled value={user.email} />
            </Field>
            <Field hint={t('profile.imageHint')} label={t('profile.image')}>
              <Input
                onChange={event => setImage(event.target.value)}
                placeholder="https://"
                type="url"
                value={imageValue}
              />
            </Field>
            <div className="flex items-center gap-3">
              <Button disabled={saving || !nameValue.trim() || !changed} type="submit">
                {t('common.save')}
              </Button>
              {error && <FormError message={error} />}
            </div>
          </form>
        </Card>
      </div>
      <TimeZoneCard timezone={user.timezone ?? 'America/Sao_Paulo'} />
      <TwoFactorCard />
      {org && (
        <Card>
          <h2 className="text-lg font-semibold">{t('profile.organizations')}</h2>
          <div className="flex items-center gap-3 rounded-xl border p-4">
            <Avatar className="size-10">
              <AvatarFallback className="text-sm font-semibold">
                {initials(org.name) || '·'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 leading-tight">
              <div className="font-medium">{org.name}</div>
              {role && (
                <div className="text-xs text-muted-foreground">
                  {ROLES[role] ? t(ROLES[role]!) : role}
                </div>
              )}
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/settings">{t('nav.settings')}</Link>
            </Button>
          </div>
        </Card>
      )}
      <DeleteAccountCard email={user.email} />
    </div>
  );
}
