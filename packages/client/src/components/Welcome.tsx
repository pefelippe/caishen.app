import { useQuery } from '@apollo/client/react';
import { BotsDocument } from '@zapbots/graphql/client';
import { BriefcaseIcon, ChartColumnIcon, MessageCirclePlusIcon, SettingsIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { JOB_STATUS } from '../lib/jobs';
import { AlertList } from './AlertList';
import { BotGlyph } from './BotGlyph';

function Action({ children, icon, to }: { children: ReactNode; icon: ReactNode; to: string }) {
  return (
    <Button asChild className="h-auto flex-col gap-2 px-3 py-3 font-normal" variant="ghost">
      <Link to={to}>
        <span className="grid size-12 place-items-center rounded-full bg-secondary">{icon}</span>
        {children}
      </Link>
    </Button>
  );
}

/**
 * What the right side shows before a Conversation is opened: a greeting, the shortcuts, what the
 * team points out and what it has delivered lately.
 */
export function Welcome({ name }: { name: string }) {
  const { data } = useQuery(BotsDocument, { fetchPolicy: 'cache-and-network' });
  const caishen = data?.bots.find(bot => bot.key === 'FINANCE');

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col items-center gap-8 px-6 py-12 text-center md:px-12">
        <BotGlyph bot="FINANCE" className="shadow-sm" size={88} />
        <div>
          <h1>Olá, {name.split(' ')[0]}</h1>
          <p className="mt-2 text-muted-foreground">
            Escolha uma conversa à esquerda ou peça algo à equipe. Os Bots entram nas suas
            ferramentas, fazem o trabalho e voltam com a Entrega pronta.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Action icon={<MessageCirclePlusIcon className="size-5" />} to="/c/new?bot=FINANCE">
            Nova conversa
          </Action>
          <Action icon={<BriefcaseIcon className="size-5" />} to="/caishen/trabalhos">
            Dar um Trabalho
          </Action>
          <Action icon={<ChartColumnIcon className="size-5" />} to="/caishen/financas">
            Ver Finanças
          </Action>
          <Action icon={<SettingsIcon className="size-5" />} to="/configuracoes">
            Configurar Modelos
          </Action>
        </div>
        {caishen && caishen.alerts.length > 0 && (
          <section className="w-full text-left" data-bot="FINANCE">
            <h2 className="mb-2 text-base font-medium">Avisos do Caishen</h2>
            <AlertList alerts={caishen.alerts} />
          </section>
        )}
        {caishen && caishen.recentJobs.length > 0 && (
          <section className="w-full text-left">
            <h2 className="mb-2 text-base font-medium">Últimos Trabalhos</h2>
            <ul className="flex flex-col divide-y">
              {caishen.recentJobs.map(job => (
                <li className="flex items-baseline gap-3 py-1.5" key={job.id}>
                  <Link
                    className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                    to={`/caishen/trabalhos/${job.id}`}
                  >
                    {job.instructions}
                  </Link>
                  <Badge variant={JOB_STATUS[job.status].variant}>
                    {JOB_STATUS[job.status].label}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
