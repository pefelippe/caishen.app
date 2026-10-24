import { useMutation, useQuery } from '@apollo/client/react';
import {
  BankLinksDocument,
  ConnectionsDocument,
  LinkBankDocument,
  PeriodDocument,
  SyncBankLinkDocument,
  UnlinkBankDocument,
  type BankLinksQuery,
} from '@zapbots/graphql/client';
import { useState, type FormEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { formatCents, formatDate } from '../lib/format';
import { FormError } from './FormError';

type BankLink = BankLinksQuery['bankLinks'][number];

const STATUS: Record<BankLink['status'], string> = {
  ACTIVE: 'ativo',
  ERROR: 'com erro',
  EXPIRED: 'autorização vencida',
};

/** The date and time of a read. */
const when = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso)
  );

/**
 * Open Finance through Meu Pluggy (docs/adr/0020): the banks are authorized in Meu Pluggy and
 * connected in Pluggy's dashboard; here the User pastes each item's id, then reads it again when
 * they want. Their debits come in as Gastos.
 */
export function OpenFinanceLinker() {
  const { data } = useQuery(BankLinksDocument, { fetchPolicy: 'cache-and-network' });
  const [itemId, setItemId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const refetchQueries = [BankLinksDocument, ConnectionsDocument, PeriodDocument];
  const [link, linking] = useMutation(LinkBankDocument, { refetchQueries });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    const result = await link({ variables: { itemId } }).catch(() => null);
    if (!result?.data) return;
    setItemId('');
    setNotice(added(result.data.linkBank.added));
  };

  return (
    <div className="flex flex-col gap-4">
      {data?.bankLinks.map(item => (
        <BankLinkRow item={item} key={item.id} onNotice={setNotice} />
      ))}
      {notice && <p className="text-sm">{notice}</p>}
      <form className="flex flex-col gap-2 rounded-xl bg-card p-4" onSubmit={submit}>
        <Label htmlFor="pluggy-item">Id do item na Pluggy</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-64 flex-1"
            id="pluggy-item"
            onChange={event => setItemId(event.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            required
            value={itemId}
          />
          <Button disabled={linking.loading || !itemId.trim()} size="sm" type="submit">
            {linking.loading ? 'Conectando…' : 'Conectar banco'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Autorize o banco no Meu Pluggy, conecte o MeuPluggy na aba Demo da sua aplicação no painel
          da Pluggy e copie o id em Itens Conectados. Os primeiros 90 dias entram como Gastos; o que
          já entrou não se repete.
        </p>
        {linking.error && <FormError message={linking.error.message} />}
      </form>
    </div>
  );
}

const added = (count: number) =>
  count === 0
    ? 'Nenhum gasto novo.'
    : count === 1
      ? '1 gasto novo em Lançamentos.'
      : `${count} gastos novos em Lançamentos.`;

/** One bank: its state, its accounts, and reading it again or unlinking it. */
function BankLinkRow({ item, onNotice }: { item: BankLink; onNotice: (text: string) => void }) {
  const [unlinking, setUnlinking] = useState(false);
  const [sync, syncing] = useMutation(SyncBankLinkDocument, {
    refetchQueries: [ConnectionsDocument, PeriodDocument],
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          {item.institution}{' '}
          <Badge variant={item.status === 'ACTIVE' ? 'secondary' : 'outline'}>
            {STATUS[item.status]}
          </Badge>
        </span>
        <span className="text-sm text-muted-foreground">
          {item.lastSyncedAt ? `Lido em ${when(item.lastSyncedAt)}` : 'Ainda não lido'}
          {item.consentExpiresAt && ` · autorização até ${formatDate(item.consentExpiresAt)}`}
        </span>
      </div>
      {item.error && <p className="text-sm text-warning">{item.error}</p>}
      {item.status === 'EXPIRED' && (
        <p className="text-sm text-muted-foreground">
          Autorize de novo no Meu Pluggy e reconecte na aba Demo do painel da Pluggy.
        </p>
      )}
      {item.accounts.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {item.accounts.map(account => (
            <li className="flex justify-between gap-4" key={account.id}>
              <span>
                {account.kind === 'CREDIT' ? 'Cartão' : 'Conta'} {account.name}
                {account.number && (
                  <span className="text-muted-foreground"> · {account.number}</span>
                )}
              </span>
              {account.balanceCents != null && (
                <span className="tabular-nums">{formatCents(account.balanceCents)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={syncing.loading}
          onClick={() =>
            void sync({ variables: { id: item.id } })
              .then(result => result.data && onNotice(added(result.data.syncBankLink.added)))
              .catch(() => null)
          }
          size="sm"
          variant="outline"
        >
          {syncing.loading ? 'Lendo…' : 'Ler de novo'}
        </Button>
        <Button onClick={() => setUnlinking(true)} size="sm" variant="ghost">
          Desconectar
        </Button>
      </div>
      {syncing.error && <FormError message={syncing.error.message} />}
      {unlinking && <UnlinkDialog item={item} onClose={() => setUnlinking(false)} />}
    </div>
  );
}

function UnlinkDialog({ item, onClose }: { item: BankLink; onClose: () => void }) {
  const [unlink, { error, loading }] = useMutation(UnlinkBankDocument, {
    refetchQueries: [BankLinksDocument, ConnectionsDocument, PeriodDocument],
  });
  const confirm = async () => {
    const result = await unlink({ variables: { id: item.id } }).catch(() => null);
    if (result?.data) onClose();
  };
  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desconectar {item.institution}?</DialogTitle>
          <DialogDescription>
            As contas e os gastos que vieram desse banco saem do Caishen. A autorização no banco
            termina no Meu Pluggy, onde foi dada.
          </DialogDescription>
        </DialogHeader>
        {error && <FormError message={error.message} />}
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            Cancelar
          </Button>
          <Button disabled={loading} onClick={() => void confirm()} variant="destructive">
            {loading ? 'Desconectando…' : 'Desconectar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
