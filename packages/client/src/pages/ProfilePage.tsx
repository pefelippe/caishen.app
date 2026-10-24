import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Field, PageHeading } from '../components/Field';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { authClient } from '../lib/auth';
import { LANGUAGES, useI18n, type Language } from '../lib/i18n';

/** Perfil: the User's own details. The name changes here; the e-mail and photo come from Google. */
export function ProfilePage() {
  const { language, setLanguage, t } = useI18n();
  const { data: session, refetch } = authClient.useSession();
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [languageError, setLanguageError] = useState<string | null>(null);

  if (!session) return <PageSkeleton />;
  const user = session.user;
  const value = name ?? user.name;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await authClient.updateUser({ name: value.trim() });
    setSaving(false);
    if (result.error) {
      setError(result.error.message ?? t('common.saveFailed'));
      return;
    }
    setName(null);
    await refetch();
  };

  const changeLanguage = async (next: Language) => {
    setLanguage(next);
    setLanguageError(null);
    const result = await authClient.updateUser({ language: next });
    if (result.error) setLanguageError(result.error.message ?? t('common.saveFailed'));
    else await refetch();
  };

  return (
    <div className="flex flex-col gap-10">
      <PageHeading subtitle={t('account.subtitle')}>{t('account.title')}</PageHeading>
      {user.image && (
        <img
          alt=""
          className="size-16 rounded-full object-cover"
          referrerPolicy="no-referrer"
          src={user.image}
        />
      )}
      <form className="flex flex-col gap-6" onSubmit={event => void submit(event)}>
        <Field label={t('account.name')}>
          <Input maxLength={80} onChange={event => setName(event.target.value)} value={value} />
        </Field>
        <Field hint={t('account.emailHint')} label={t('account.email')}>
          <Input disabled value={user.email} />
        </Field>
        <div className="flex items-center gap-3">
          <Button disabled={saving || !value.trim() || value.trim() === user.name} type="submit">
            {t('common.save')}
          </Button>
          {error && <FormError message={error} />}
        </div>
      </form>
      <section className="flex flex-col gap-6 rounded-2xl bg-card p-6 shadow-[0_1px_3px_rgb(15_23_42/0.06)]">
        <h2 className="text-lg font-semibold">{t('account.preferences')}</h2>
        <Field hint={t('account.languageHint')} label={t('account.language')}>
          <Select onValueChange={next => void changeLanguage(next as Language)} value={language}>
            <SelectTrigger aria-label={t('account.language')} className="w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {languageError && <FormError message={languageError} />}
      </section>
    </div>
  );
}
