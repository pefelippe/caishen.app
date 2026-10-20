import { useQuery } from '@apollo/client/react';
import { DocumentsDocument } from '@zapbots/graphql/client';
import { FileTextIcon, MessageCircleIcon, PaperclipIcon, SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

import { deliverableName } from '../lib/documents';
import { useI18n } from '../lib/i18n';
import { useNavGroups } from '../lib/nav';

/**
 * The magnifier in the header, and Ctrl+K anywhere: jump to any screen or document by name.
 * Documents load only once the palette opens.
 */
export function SearchCommand() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();
  const groups = useNavGroups();
  const { data } = useQuery(DocumentsDocument, { fetchPolicy: 'cache-first', skip: !open });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  const pages = [
    ...groups.flatMap(group => group.items),
    { icon: MessageCircleIcon, label: t('rail.chat'), to: '/chat' },
  ];
  const deliverables = data?.documents.deliverables ?? [];
  const attachments = data?.documents.attachments ?? [];

  return (
    <>
      <Button
        aria-keyshortcuts="Control+K Meta+K"
        aria-label={t('header.search')}
        className="size-9 rounded-full text-header-foreground hover:bg-white/10 hover:text-header-foreground"
        onClick={() => setOpen(true)}
        size="icon"
        variant="ghost"
      >
        <SearchIcon className="size-5" />
      </Button>
      <CommandDialog
        description={t('search.placeholder')}
        onOpenChange={setOpen}
        open={open}
        title={t('header.search')}
      >
        <CommandInput placeholder={t('search.placeholder')} />
        <CommandList>
          <CommandEmpty>{t('search.empty')}</CommandEmpty>
          <CommandGroup heading={t('search.pages')}>
            {pages.map(page => (
              <CommandItem
                key={page.to}
                onSelect={() => go(page.to)}
                value={`${page.label} ${page.to}`}
              >
                <page.icon />
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {deliverables.length + attachments.length > 0 && (
            <CommandGroup heading={t('search.documents')}>
              {deliverables.map(job => (
                <CommandItem
                  key={job.id}
                  onSelect={() => go(`/documents/${job.id}`)}
                  value={`${deliverableName(job.deliverable, job.instructions)} ${job.id}`}
                >
                  <FileTextIcon />
                  <span className="truncate">
                    {deliverableName(job.deliverable, job.instructions)}
                  </span>
                </CommandItem>
              ))}
              {attachments.map(file => (
                <CommandItem
                  key={file.id}
                  onSelect={() => {
                    setOpen(false);
                    window.open(file.url, '_blank', 'noopener,noreferrer');
                  }}
                  value={`${file.name} ${file.id}`}
                >
                  <PaperclipIcon />
                  <span className="truncate">{file.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
