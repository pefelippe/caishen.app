import { ArrowUpIcon, SlidersHorizontalIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState, type ClipboardEvent, type FormEvent } from 'react';

import { Logo } from '@zapbots/ui/blocks/logo';
import { Button } from '@zapbots/ui/components/button';
import { Input } from '@zapbots/ui/components/input';
import { cn } from '@zapbots/ui/lib/utils';

import { CHAT_SUGGESTIONS, useChatPanel } from '../components/ChatPanel';
import { AttachMenu, Waiting } from '../components/ChatThread';
import {
  addAttachments,
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  pastedFiles,
  type ChatAttachment,
} from '../lib/attachments';
import { HOME_CARDS, rise, SIZE_CLASS, stagger } from '../home/cards';
import { CustomizeHome, useHomeLayout } from '../home/CustomizeHome';
import { useI18n } from '../lib/i18n';

/**
 * The greeting and the line to ask the Caishen, centered on a light blue panel, as the Dashboard
 * opened before; sending, or a suggestion, opens the chat panel with it.
 */
function Ask({ name }: { name: string }) {
  const { t } = useI18n();
  const { startNew } = useChatPanel();
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<ChatAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLInputElement>(null);

  /** Files from the + or pasted wait under the line and go with the question. */
  const attach = async (picked: File[]) => {
    setError(null);
    const added = await addAttachments(files, picked);
    setFiles(added.files);
    setError(added.error);
    input.current?.focus();
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = pastedFiles(event.clipboardData);
    if (!pasted.length) return;
    event.preventDefault();
    void attach(pasted);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() && !files.length) return;
    startNew(draft.trim(), files.length ? files : undefined);
    setDraft('');
    setFiles([]);
    setError(null);
  };

  return (
    <motion.section
      className="flex flex-col items-center gap-6 rounded-3xl bg-accent px-5 py-12 text-center md:py-14"
      variants={rise}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-foreground text-background">
        <Logo size={24} />
      </span>
      <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
        {t('welcome.hello', { name })}
      </h1>
      <form
        className="flex h-16 w-full max-w-2xl items-center gap-2 rounded-full bg-card pr-2 pl-3 shadow-[0_12px_40px_-16px_rgb(37_99_235/0.35)] transition-shadow focus-within:shadow-[0_12px_40px_-12px_rgb(37_99_235/0.5)]"
        onSubmit={onSubmit}
      >
        <AttachMenu
          disabled={files.length >= MAX_ATTACHMENTS}
          onPick={() => picker.current?.click()}
        />
        <Input
          aria-label={t('welcome.ask')}
          className="h-full flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-base"
          onChange={event => setDraft(event.target.value)}
          onPaste={onPaste}
          placeholder={t('welcome.askAi')}
          ref={input}
          value={draft}
        />
        <Button
          aria-label={t('welcome.send')}
          className="size-12 rounded-full"
          disabled={!draft.trim() && !files.length}
          size="icon"
          type="submit"
        >
          <ArrowUpIcon className="size-5" />
        </Button>
      </form>
      <input
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        multiple
        onChange={event => {
          const picked = [...(event.target.files ?? [])];
          event.target.value = '';
          void attach(picked);
        }}
        ref={picker}
        type="file"
      />
      {(files.length > 0 || error) && (
        <div className="-mt-2 flex w-full max-w-2xl flex-col items-center gap-2">
          <Waiting
            files={files}
            onRemove={index => setFiles(current => current.filter((_, at) => at !== index))}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {CHAT_SUGGESTIONS.map(suggestion => (
          <Button
            className="h-9 rounded-full bg-card px-4 font-normal hover:bg-card/70"
            key={suggestion.text}
            onClick={() => startNew(suggestion.text)}
            variant="ghost"
          >
            <suggestion.icon className="size-4" />
            {suggestion.text}
          </Button>
        ))}
      </div>
    </motion.section>
  );
}

/**
 * The Página inicial: the greeting and the line to ask the Caishen on top, then the cards the User
 * chose, from every area, in their order (Personalizar), each leading to its screen.
 */
export function DashboardPage({ user }: { user: { name: string } }) {
  const { t } = useI18n();
  const { change, layout } = useHomeLayout();
  const [customizing, setCustomizing] = useState(false);
  const shown = layout?.filter(card => !card.hidden) ?? [];

  return (
    <motion.div
      animate="shown"
      className="mx-auto flex w-full max-w-6xl flex-col gap-5"
      initial="hidden"
      variants={stagger}
    >
      <Ask name={user.name.split(' ')[0]!} />

      {layout && (
        <>
          <motion.div className="-mb-2 flex justify-end" variants={rise}>
            <Button onClick={() => setCustomizing(true)} size="sm" variant="ghost">
              <SlidersHorizontalIcon />
              {t('home.customize')}
            </Button>
          </motion.div>

          {shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t('home.customize.empty')}
            </p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              {shown.map(({ key }) => {
                const { Component, size } = HOME_CARDS[key];
                return (
                  <motion.div className={cn('min-w-0', SIZE_CLASS[size])} key={key} variants={rise}>
                    <Component />
                  </motion.div>
                );
              })}
            </div>
          )}

          <CustomizeHome
            layout={layout}
            onChange={change}
            onOpenChange={setCustomizing}
            open={customizing}
          />
        </>
      )}
    </motion.div>
  );
}
