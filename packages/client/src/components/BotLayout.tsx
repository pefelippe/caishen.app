import type { BotKey } from '@zapbots/graphql/client';
import { Outlet } from 'react-router-dom';

import { Scrolling } from './Layout';

/**
 * A Bot's page: the open section of what its field needs (for the Caishen: the overview, income
 * and Obligations). The sections themselves are listed in the menu on the left, under the Bot.
 */
export function BotLayout({ bot }: { bot: BotKey }) {
  return (
    <div className="h-full min-h-0" data-bot={bot}>
      <Scrolling>
        <Outlet />
      </Scrolling>
    </div>
  );
}
