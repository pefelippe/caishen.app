import type { ProviderName } from '@zapbots/ai';
import type { Resolvers } from '@zapbots/graphql/server';

import { AiKeyError, aiKeys, removeAiKey, saveAiKey } from '../services/aiKeys';
import { connections } from '../services/connections';
import {
  addExternalCalendar,
  listExternalCalendars,
  refreshExternalCalendar,
  removeExternalCalendar,
} from '../services/personal/calendars';
import { healthInbox, setHealthInbox } from '../services/fitness/health';
import { googleTasksSync, syncGoogleTasks } from '../services/personal/googleTasks';
import { automationInbox, setAutomationInbox } from '../services/automation';
import { music, spotifyLinkOf, startSpotifyLink, unlinkSpotify } from '../services/spotify';
import { telegramConfigured } from '../services/telegram/api';
import { startTelegramLink, unlinkTelegram } from '../services/telegram/link';
import { calendarFeed, setCalendarFeed } from '../services/personal/feed';
import {
  bankAccounts,
  bankLinks,
  linkBank,
  syncBankLink,
  unlinkBank,
} from '../services/openFinance';
import {
  maskPhone,
  startWhatsappLink,
  unlinkWhatsapp,
  whatsappLinkOf,
} from '../services/whatsapp/link';
import { whatsappConfigured } from '../services/whatsapp/meta';
import { badInput, requireViewer } from './guards';
import { requireAdmin } from './settings';

const providerName = (provider: string) => provider.toLowerCase() as ProviderName;

export const connectionResolvers: Resolvers = {
  BankLink: {
    accounts: link => bankAccounts(link),
  },
  Mutation: {
    linkBank: (_, { itemId }, context) => linkBank(requireViewer(context), itemId),
    syncBankLink: (_, { id }, context) => syncBankLink(requireViewer(context), id),
    unlinkBank: (_, { id }, context) => unlinkBank(requireViewer(context), id),
    setCalendarFeed: (_, { on }, context) => setCalendarFeed(requireViewer(context), on),
    setHealthInbox: (_, { on }, context) => setHealthInbox(requireViewer(context), on),
    setAutomationInbox: (_, { on }, context) => setAutomationInbox(requireViewer(context), on),
    syncGoogleTasks: (_, __, context) => syncGoogleTasks(requireViewer(context)),
    startTelegramLink: (_, __, context) => {
      const viewer = requireViewer(context);
      if (!telegramConfigured()) badInput('O Telegram ainda não está ligado neste servidor');
      return startTelegramLink(viewer);
    },
    unlinkTelegram: async (_, __, context) => {
      await unlinkTelegram(requireViewer(context));
      return true;
    },
    startSpotifyLink: (_, __, context) => startSpotifyLink(requireViewer(context)),
    unlinkSpotify: async (_, __, context) => {
      await unlinkSpotify(requireViewer(context));
      return true;
    },
    addExternalCalendar: (_, { name, url }, context) =>
      addExternalCalendar(requireViewer(context), name, url),
    refreshExternalCalendar: (_, { id }, context) =>
      refreshExternalCalendar(requireViewer(context), id),
    removeExternalCalendar: (_, { id }, context) =>
      removeExternalCalendar(requireViewer(context), id),
    startWhatsappLink: (_, __, context) => {
      const viewer = requireViewer(context);
      if (!whatsappConfigured()) badInput('O WhatsApp ainda não está ligado neste servidor');
      return startWhatsappLink(viewer);
    },
    setAiKey: async (_, { key, provider }, context) => {
      const viewer = requireViewer(context);
      await requireAdmin(viewer);
      try {
        await saveAiKey(viewer, providerName(provider), key);
      } catch (error) {
        if (error instanceof AiKeyError) badInput(error.message);
        throw error;
      }
      return (await aiKeys(viewer)).find(saved => saved.provider === provider)!;
    },
    removeAiKey: async (_, { provider }, context) => {
      const viewer = requireViewer(context);
      await requireAdmin(viewer);
      return removeAiKey(viewer, providerName(provider));
    },
    unlinkWhatsapp: async (_, __, context) => {
      await unlinkWhatsapp(requireViewer(context));
      return true;
    },
  },
  Query: {
    aiKeys: (_, __, context) => aiKeys(requireViewer(context)),
    bankLinks: (_, __, context) => bankLinks(requireViewer(context)),
    calendarFeed: (_, __, context) => calendarFeed(requireViewer(context)),
    healthInbox: (_, __, context) => healthInbox(requireViewer(context)),
    automationInbox: (_, __, context) => automationInbox(requireViewer(context)),
    music: (_, __, context) => music(requireViewer(context)),
    spotifyLink: (_, __, context) => spotifyLinkOf(requireViewer(context)),
    googleTasksSync: (_, __, context) => googleTasksSync(requireViewer(context)),
    externalCalendars: (_, __, context) => listExternalCalendars(requireViewer(context)),
    connections: (_, __, context) => connections(requireViewer(context)),
    whatsappLink: async (_, __, context) => {
      const link = await whatsappLinkOf(requireViewer(context));
      return link && { linkedAt: link.linkedAt, phone: maskPhone(link.phone) };
    },
  },
};
