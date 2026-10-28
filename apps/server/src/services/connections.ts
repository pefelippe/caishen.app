import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import type { ConnectionCategory, ConnectionKind } from '@zapbots/graphql/server';
import { and, eq } from 'drizzle-orm';

import { driveConnected, googleConfigured } from './drive';
import { aiConfigured, defaultModel, listModels } from './models';
import { bankLinks, openFinanceUnavailable } from './openFinance';
import { healthInbox } from './fitness/health';
import { listExternalCalendars } from './personal/calendars';
import { googleTasksConnected, googleTasksSync } from './personal/googleTasks';
import { calendarFeed as calendarFeedOf } from './personal/feed';
import { maskPhone, whatsappLinkOf } from './whatsapp/link';
import { whatsappConfigured } from './whatsapp/meta';

interface Status {
  /** False for Connections that are not built yet. */
  available: boolean;
  connected: boolean;
  detail: string | null;
  unavailableReason: string | null;
}

interface Provider {
  category: ConnectionCategory;
  kind: ConnectionKind;
  status(viewer: Viewer): Promise<Status>;
}

const openRouter: Provider = {
  category: 'AI',
  kind: 'OPENROUTER',
  // The Organization's own keys, pasted on this page (docs/adr/0022).
  status: async viewer => {
    // Without keys of its own, the server's OpenRouter key may still serve the free Models.
    if (!(await aiConfigured(viewer.organizationId))) {
      // Nothing is missing on the server: the card itself asks for a key.
      return { available: true, connected: false, detail: null, unavailableReason: null };
    }
    const models = await listModels(viewer.organizationId);
    return {
      available: true,
      connected: true,
      detail: models.length
        ? `${models.length} Modelos, ${models.filter(model => model.free).length} gratuitos. Padrão: ${await defaultModel(viewer.organizationId)}.`
        : 'O OpenRouter não respondeu à lista de Modelos.',
      unavailableReason: null,
    };
  },
};

const googleDrive: Provider = {
  category: 'FILE_STORAGE',
  kind: 'GOOGLE_DRIVE',
  status: async viewer => {
    const [google] = await db
      .select({ id: schema.account.id })
      .from(schema.account)
      .where(
        and(eq(schema.account.userId, viewer.userId), eq(schema.account.providerId, 'google'))
      );
    const unavailableReason = !googleConfigured()
      ? 'O servidor está sem as credenciais do Google (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET).'
      : !google
        ? 'Entre com sua conta Google para conectar o Drive.'
        : null;
    return {
      available: true,
      connected: !unavailableReason && (await driveConnected(viewer.userId)),
      detail: null,
      unavailableReason,
    };
  },
};

const whatsapp: Provider = {
  category: 'MESSAGING',
  kind: 'WHATSAPP',
  // One number, the Caishen's, for every User; each links theirs with a code (docs/adr/0019).
  status: async viewer => {
    if (!whatsappConfigured()) {
      return {
        available: false,
        connected: false,
        detail: null,
        unavailableReason: 'O WhatsApp ainda não está ligado neste servidor.',
      };
    }
    const link = await whatsappLinkOf(viewer);
    return {
      available: true,
      connected: Boolean(link),
      detail: link ? `Conectado ao número ${maskPhone(link.phone)}.` : null,
      unavailableReason: null,
    };
  },
};

const openFinance: Provider = {
  category: 'FINANCE',
  kind: 'OPEN_FINANCE',
  // Meu Pluggy, free for one person's own banks: only the e-mails allowed here (docs/adr/0020).
  status: async viewer => {
    const reason = await openFinanceUnavailable(viewer);
    if (reason) {
      return { available: false, connected: false, detail: null, unavailableReason: reason };
    }
    const links = await bankLinks(viewer);
    return {
      available: true,
      connected: links.length > 0,
      detail: links.length
        ? `${links.length === 1 ? '1 banco conectado' : `${links.length} bancos conectados`}: ${links.map(link => link.institution).join(', ')}.`
        : null,
      unavailableReason: null,
    };
  },
};

const calendarFeed: Provider = {
  category: 'CALENDAR',
  kind: 'CALENDAR_FEED',
  // A private .ics link, read by the User's own calendar app: nothing to set up on the server.
  status: async viewer => {
    const feed = await calendarFeedOf(viewer);
    return { available: true, connected: Boolean(feed), detail: null, unavailableReason: null };
  },
};

const externalCalendars: Provider = {
  category: 'CALENDAR',
  kind: 'EXTERNAL_CALENDARS',
  // iCloud, Google or Outlook by each calendar's secret .ics address: no passwords (docs/adr/0028).
  status: async viewer => {
    const calendars = await listExternalCalendars(viewer);
    return {
      available: true,
      connected: calendars.length > 0,
      detail: calendars.length
        ? `${calendars.length === 1 ? '1 agenda ligada' : `${calendars.length} agendas ligadas`}: ${calendars.map(calendar => calendar.name).join(', ')}.`
        : null,
      unavailableReason: null,
    };
  },
};

const health: Provider = {
  category: 'HEALTH',
  kind: 'HEALTH',
  // Apple Health and Health Connect have no web API: the phone sends to an address (docs/adr/0029).
  status: async viewer => {
    const inbox = await healthInbox(viewer);
    return {
      available: true,
      connected: Boolean(inbox?.lastReceivedAt),
      detail: null,
      unavailableReason: null,
    };
  },
};

const googleTasks: Provider = {
  category: 'CALENDAR',
  kind: 'GOOGLE_TASKS',
  // The Google account with the tasks.readonly scope, asked for on Integrações (docs/adr/0030).
  status: async viewer => {
    if (!googleConfigured()) {
      return {
        available: false,
        connected: false,
        detail: null,
        unavailableReason:
          'O servidor está sem as credenciais do Google (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET).',
      };
    }
    const connected = await googleTasksConnected(viewer);
    const sync = connected ? await googleTasksSync(viewer) : null;
    return {
      available: true,
      connected,
      detail: sync?.error ?? null,
      unavailableReason: null,
    };
  },
};

/** Every Connection zapbots knows. A new one is a new entry here and its copy on the Conexões page. */
const PROVIDERS: Provider[] = [
  openRouter,
  googleDrive,
  whatsapp,
  openFinance,
  calendarFeed,
  externalCalendars,
  health,
  googleTasks,
];

export function connections(viewer: Viewer) {
  return Promise.all(
    PROVIDERS.map(async ({ category, kind, status }) => ({
      category,
      kind,
      ...(await status(viewer)),
    }))
  );
}
