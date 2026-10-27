import { useMutation, useQuery } from '@apollo/client/react';
import {
  CreateNoteDocument,
  DeleteNoteDocument,
  NotesDocument,
  UpdateNoteDocument,
  type NoteFieldsFragment,
} from '@zapbots/graphql/client';
import {
  ArrowLeftIcon,
  EyeIcon,
  PencilIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PageHeading } from '@zapbots/ui/blocks/field';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Input } from '@zapbots/ui/components/input';
import { Textarea } from '@zapbots/ui/components/textarea';
import { cn } from '@zapbots/ui/lib/utils';

import { ChatText } from '../../components/ChatText';
import { QueryError } from '../../components/QueryError';
import { useToast, useUndoableDelete } from '../../components/Toaster';
import { useI18n } from '../../lib/i18n';

type Note = NoteFieldsFragment;

/** How long after the last key the Nota is saved. */
const SAVE_AFTER_MS = 800;

/** The Nota's name in the list: its title, else its first line. */
const nameOf = (note: Pick<Note, 'body' | 'title'>, untitled: string) =>
  note.title.trim() || note.body.trim().split('\n')[0]!.slice(0, 80) || untitled;

/**
 * One Nota open: its title and text, saved as they are typed (800 ms after the last key), shown as
 * Markdown when not being edited, and the pin.
 */
function Editor({
  note,
  onBack,
  onDelete,
}: {
  note: Note;
  onBack: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [editing, setEditing] = useState(!note.body);
  const [state, setState] = useState<'saved' | 'saving' | 'typing'>('saved');
  const [update] = useMutation(UpdateNoteDocument);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<{ body?: string; title?: string }>({});

  const flush = () => {
    clearTimeout(timer.current);
    const input = pending.current;
    if (!Object.keys(input).length) return;
    pending.current = {};
    setState('saving');
    void update({ variables: { id: note.id, input } })
      .then(() => setState('saved'))
      .catch(() => {
        setState('typing');
        toast({ message: t('common.saveFailed'), tone: 'error' });
      });
  };

  // Whatever is still waiting is saved on leaving the Nota.
  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (field: 'body' | 'title', value: string) => {
    (field === 'body' ? setBody : setTitle)(value);
    pending.current[field] = value;
    setState('typing');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_AFTER_MS);
  };

  const togglePin = () =>
    void update({
      optimisticResponse: { updateNote: { ...note, pinned: !note.pinned } },
      variables: { id: note.id, input: { pinned: !note.pinned } },
    }).catch(() => toast({ message: t('common.saveFailed'), tone: 'error' }));

  return (
    <Card className="min-h-[60vh] gap-4">
      <div className="flex items-center gap-1">
        <Button
          aria-label={t('personal.back')}
          className="md:hidden"
          onClick={onBack}
          size="icon"
          variant="ghost"
        >
          <ArrowLeftIcon />
        </Button>
        <span className="flex-1 text-xs text-muted-foreground" role="status">
          {state === 'saved' ? t('personal.notes.saved') : t('personal.notes.saving')}
        </span>
        <Button
          aria-label={editing ? t('personal.notes.preview') : t('personal.notes.edit')}
          onClick={() => {
            flush();
            setEditing(!editing);
          }}
          size="icon"
          variant="ghost"
        >
          {editing ? <EyeIcon /> : <PencilIcon />}
        </Button>
        <Button
          aria-label={note.pinned ? t('personal.notes.unpin') : t('personal.notes.pin')}
          aria-pressed={note.pinned}
          onClick={togglePin}
          size="icon"
          variant="ghost"
        >
          <PinIcon className={cn(note.pinned && 'fill-primary text-primary')} />
        </Button>
        <Button aria-label={t('personal.delete')} onClick={onDelete} size="icon" variant="ghost">
          <Trash2Icon />
        </Button>
      </div>
      <Input
        aria-label={t('personal.title')}
        className="border-0 px-0 text-xl font-semibold shadow-none focus-visible:ring-0 md:text-xl"
        maxLength={200}
        onBlur={flush}
        onChange={event => change('title', event.target.value)}
        placeholder={t('personal.title')}
        value={title}
      />
      {editing ? (
        <Textarea
          aria-label={t('personal.notes.text')}
          autoFocus={Boolean(note.title)}
          className="min-h-[50vh] flex-1 resize-none border-0 px-0 shadow-none focus-visible:ring-0"
          onBlur={flush}
          onChange={event => change('body', event.target.value)}
          placeholder={t('personal.notes.placeholder')}
          value={body}
        />
      ) : (
        <button className="min-h-[50vh] text-left" onClick={() => setEditing(true)} type="button">
          {body.trim() ? (
            <ChatText text={body} />
          ) : (
            <span className="text-muted-foreground">{t('personal.notes.placeholder')}</span>
          )}
        </button>
      )}
    </Card>
  );
}

/**
 * Notas: the list on the left, pinned first, with a search; the open Nota on the right (alone on a
 * phone). A new Nota opens at once, empty.
 */
export function NotesPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const { data, error, loading } = useQuery(NotesDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { search: query || null },
  });
  const [create, created] = useMutation(CreateNoteDocument, { refetchQueries: [NotesDocument] });
  const [removeNote] = useMutation(DeleteNoteDocument, { refetchQueries: [NotesDocument] });
  const { hidden, remove } = useUndoableDelete();

  // Searching waits for a pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  if (error && !data) return <QueryError error={error} title={t('nav.notes')} />;
  if (loading && !data) return <PageSkeleton />;
  if (!data) return null;

  const notes = data.notes.filter(note => !hidden.has(note.id));
  const openId = params.get('n');
  const opened = notes.find(note => note.id === openId);
  const open = (id: null | string) => setParams(id ? { n: id } : {});
  const untitled = t('personal.notes.untitled');

  const add = async () => {
    const result = await create({
      variables: { input: { title: t('personal.notes.newTitle') } },
    }).catch(() => null);
    if (result?.data) open(result.data.createNote.id);
    else toast({ message: t('common.saveFailed'), tone: 'error' });
  };

  const deleteNote = (note: Note) => {
    open(null);
    remove({
      commit: () => removeNote({ variables: { id: note.id } }),
      ids: [note.id],
      message: t('personal.notes.deleted', { title: nameOf(note, untitled) }),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading subtitle={t('personal.notes.subtitle')}>{t('nav.notes')}</PageHeading>
        <Button disabled={created.loading} onClick={() => void add()}>
          <PlusIcon />
          {t('personal.notes.new')}
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className={cn('flex flex-col gap-3', opened && 'max-md:hidden')}>
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label={t('personal.notes.search')}
              className="pl-9"
              onChange={event => setSearch(event.target.value)}
              placeholder={t('personal.notes.search')}
              type="search"
              value={search}
            />
          </div>
          {notes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {query ? t('personal.notes.noMatch') : t('personal.notes.empty')}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {notes.map(note => (
                <li key={note.id}>
                  <button
                    className={cn(
                      'flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left hover:bg-muted/60',
                      note.id === openId && 'bg-accent'
                    )}
                    onClick={() => open(note.id)}
                    type="button"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {note.pinned && (
                        <PinIcon className="size-3.5 shrink-0 fill-primary text-primary" />
                      )}
                      <span className="truncate">{nameOf(note, untitled)}</span>
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {note.title.trim() ? note.body : note.body.split('\n').slice(1).join(' ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cn(!opened && 'max-md:hidden')}>
          {opened ? (
            <Editor
              key={opened.id}
              note={opened}
              onBack={() => open(null)}
              onDelete={() => deleteNote(opened)}
            />
          ) : (
            <Card className="min-h-[40vh] items-center justify-center text-center text-sm text-muted-foreground">
              {t('personal.notes.pick')}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
