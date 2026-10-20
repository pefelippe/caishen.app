import { useQuery } from '@apollo/client/react';
import { DocumentsDocument } from '@zapbots/graphql/client';
import { DownloadIcon, FileTextIcon, PaperclipIcon, SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { PageSkeleton } from '../components/PageSkeleton';
import { deliverableName, downloadMarkdown } from '../lib/documents';
import { formatDate } from '../lib/format';
import { useI18n } from '../lib/i18n';

/** One line of the table: a Deliverable, which opens on its own page, or an Attachment. */
interface Row {
  createdAt: string;
  id: string;
  kind: 'attachment' | 'deliverable';
  name: string;
  /** Whether a Routine handed the Job over; Attachments always come with a single Job. */
  routine: boolean;
  /** The Deliverable's text, searched and downloaded. */
  text: string;
  /** Where an Attachment opens, in its Connection. */
  url?: string;
}

type Kind = 'all' | Row['kind'];
type Origin = 'all' | 'job' | 'routine';
const PERIODS = ['all', '7', '30', '90'] as const;
type Period = (typeof PERIODS)[number];

/**
 * Documentos: the Deliverables and the Attachments in one table, newest first, with filters and
 * a search. A Deliverable opens on its own page to read and edit; an Attachment opens where it
 * came from.
 */
export function DocumentsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data, loading } = useQuery(DocumentsDocument, { fetchPolicy: 'cache-and-network' });
  const [term, setTerm] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [origin, setOrigin] = useState<Origin>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (loading && !data) return <PageSkeleton />;

  const all: Row[] = [
    ...(data?.documents.deliverables ?? []).map(job => ({
      createdAt: job.finishedAt ?? job.createdAt,
      id: job.id,
      kind: 'deliverable' as const,
      name: deliverableName(job.deliverable, job.instructions),
      routine: Boolean(job.routine),
      text: job.deliverable ?? '',
    })),
    ...(data?.documents.attachments ?? []).map(file => ({
      createdAt: file.createdAt,
      id: file.id,
      kind: 'attachment' as const,
      name: file.name,
      routine: false,
      text: '',
      url: file.url,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const search = term.trim().toLocaleLowerCase();
  const since = period === 'all' ? null : Date.now() - Number(period) * 86_400_000;
  const rows = all.filter(
    row =>
      (kind === 'all' || row.kind === kind) &&
      (origin === 'all' || row.routine === (origin === 'routine')) &&
      (since === null || new Date(row.createdAt).getTime() >= since) &&
      (!search ||
        row.name.toLocaleLowerCase().includes(search) ||
        row.text.toLocaleLowerCase().includes(search))
  );
  const picked = rows.filter(row => selected.has(row.id));
  const pickedDeliverables = picked.filter(row => row.kind === 'deliverable');
  const allPicked = rows.length > 0 && picked.length === rows.length;

  const toggle = (id: string, on: boolean) =>
    setSelected(current => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const open = (row: Row) => {
    if (row.kind === 'deliverable') navigate(`/documents/${row.id}`);
    else window.open(row.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1>{t('documents.title')}</h1>
        <p className="mt-1 max-w-prose text-muted-foreground">{t('documents.subtitle')}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Select onValueChange={value => setKind(value as Kind)} value={kind}>
          <SelectTrigger aria-label={t('documents.type')} className="w-44 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('documents.allTypes')}</SelectItem>
            <SelectItem value="deliverable">{t('documents.deliverable')}</SelectItem>
            <SelectItem value="attachment">{t('documents.attachment')}</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={value => setPeriod(value as Period)} value={period}>
          <SelectTrigger aria-label={t('documents.created')} className="w-44 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map(value => (
              <SelectItem key={value} value={value}>
                {value === 'all'
                  ? t('documents.anyTime')
                  : t('documents.lastDays', { count: value })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={value => setOrigin(value as Origin)} value={origin}>
          <SelectTrigger aria-label={t('documents.anyOrigin')} className="w-44 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('documents.anyOrigin')}</SelectItem>
            <SelectItem value="job">{t('documents.fromJob')}</SelectItem>
            <SelectItem value="routine">{t('documents.fromRoutine')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative ml-auto w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t('documents.search')}
            className="bg-card pl-9"
            onChange={event => setTerm(event.target.value)}
            placeholder={t('documents.search')}
            value={term}
          />
        </div>
      </div>

      {picked.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-secondary px-3 py-2">
          <span className="text-sm">{t('documents.selected', { count: picked.length })}</span>
          <Button
            disabled={pickedDeliverables.length === 0}
            onClick={() => pickedDeliverables.forEach(row => downloadMarkdown(row.name, row.text))}
            size="sm"
            variant="outline"
          >
            <DownloadIcon />
            {t('documents.downloadSelected', { count: pickedDeliverables.length })}
          </Button>
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label={t('documents.selectAll')}
                  checked={allPicked}
                  onCheckedChange={checked =>
                    setSelected(checked === true ? new Set(rows.map(row => row.id)) : new Set())
                  }
                />
              </TableHead>
              <TableHead>{t('documents.name')}</TableHead>
              <TableHead className="w-36">{t('documents.type')}</TableHead>
              <TableHead className="w-36 text-right">{t('documents.created')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow
                className="cursor-pointer"
                data-state={selected.has(row.id) ? 'selected' : undefined}
                key={row.id}
                onClick={() => open(row)}
              >
                <TableCell onClick={event => event.stopPropagation()}>
                  <Checkbox
                    aria-label={t('documents.select', { name: row.name })}
                    checked={selected.has(row.id)}
                    onCheckedChange={checked => toggle(row.id, checked === true)}
                  />
                </TableCell>
                <TableCell className="max-w-0">
                  <span className="flex items-center gap-2">
                    {row.kind === 'deliverable' ? (
                      <FileTextIcon className="size-4 shrink-0 text-ink" />
                    ) : (
                      <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate font-medium">{row.name}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={row.kind === 'deliverable' ? 'secondary' : 'outline'}>
                    {t(
                      row.kind === 'deliverable' ? 'documents.deliverable' : 'documents.attachment'
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums">
                  {formatDate(row.createdAt)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell className="py-10 text-center text-muted-foreground" colSpan={4}>
                  {all.length ? t('documents.noMatch') : t('documents.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('documents.count', { count: rows.length })}
      </p>
    </div>
  );
}
