import type { BotKey } from '@zapbots/graphql/client';

import { BOT_SECTIONS, teamBot } from '../lib/bots';
import { SectionLayout } from './SectionLayout';

/**
 * A Bot's page: the white menu of what its field needs (for the Caishen: the overview, income,
 * Obligations and Jobs), the open section beside it.
 */
export function BotLayout({ bot }: { bot: BotKey }) {
  const member = teamBot(bot);
  return (
    <div className="h-full min-h-0" data-bot={bot}>
      <SectionLayout groups={BOT_SECTIONS[bot]} icon={member.icon} title={member.name} />
    </div>
  );
}
