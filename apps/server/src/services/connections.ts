import { keysFromEnv } from '@zapbots/ai';
import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import type { ConnectionCategory, ConnectionKind } from '@zapbots/graphql/server';
import { and, eq } from 'drizzle-orm';

import { driveConnected, googleConfigured } from './drive';
import { defaultModel, listModels } from './models';
import { bankLinks, openFinanceUnavailable } from './openFinance';
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
  // One key on the server serves every User (docs/adr/0009), so there is nothing to connect here.
  status: async () => {
    if (!keysFromEnv().openrouter) {
      return {
        available: true,
        connected: false,
        detail: null,
        unavailableReason: 'O servidor está sem a chave do OpenRouter (OPENROUTER_API_KEY).',
      };
    }
    const models = await listModels();
    return {
      available: true,
      connected: true,
      detail: models.length
        ? `${models.length} Modelos, ${models.filter(model => model.free).length} gratuitos. Padrão: ${await defaultModel()}.`
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

/** Every Connection zapbots knows. A new one is a new entry here and its copy on the Conexões page. */
const PROVIDERS: Provider[] = [openRouter, googleDrive, whatsapp, openFinance];

export function connections(viewer: Viewer) {
  return Promise.all(
    PROVIDERS.map(async ({ category, kind, status }) => ({
      category,
      kind,
      ...(await status(viewer)),
    }))
  );
}
