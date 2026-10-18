import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { TEAM } from '../lib/bots';
import { useI18n } from '../lib/i18n';
import { BotGlyph } from './BotGlyph';

interface Props {
  align?: 'center' | 'end' | 'start';
  side?: 'bottom' | 'right';
  /** The button that opens the menu, usually a "+". */
  children: ReactNode;
}

/** "+": starts a new Conversation with the Bot picked from the team. */
export function NewChatMenu({ align = 'start', children, side = 'bottom' }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-72" side={side}>
        <DropdownMenuLabel>{t('chat.newWith')}</DropdownMenuLabel>
        {TEAM.map(member => (
          <DropdownMenuItem
            className="gap-3 py-2"
            key={member.key}
            onSelect={() => navigate(`/c/new?bot=${member.key}`)}
          >
            <BotGlyph bot={member.key} size={32} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block font-medium">{member.name}</span>
              <span className="block text-xs text-muted-foreground">{member.field}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
