import type { Resolvers } from '@zapbots/graphql/server';

import { connections } from '../services/connections';
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

export const connectionResolvers: Resolvers = {
  BankLink: {
    accounts: link => bankAccounts(link),
  },
  Mutation: {
    linkBank: (_, { itemId }, context) => linkBank(requireViewer(context), itemId),
    syncBankLink: (_, { id }, context) => syncBankLink(requireViewer(context), id),
    unlinkBank: (_, { id }, context) => unlinkBank(requireViewer(context), id),
    startWhatsappLink: (_, __, context) => {
      const viewer = requireViewer(context);
      if (!whatsappConfigured()) badInput('O WhatsApp ainda não está ligado neste servidor');
      return startWhatsappLink(viewer);
    },
    unlinkWhatsapp: async (_, __, context) => {
      await unlinkWhatsapp(requireViewer(context));
      return true;
    },
  },
  Query: {
    bankLinks: (_, __, context) => bankLinks(requireViewer(context)),
    connections: (_, __, context) => connections(requireViewer(context)),
    whatsappLink: async (_, __, context) => {
      const link = await whatsappLinkOf(requireViewer(context));
      return link && { linkedAt: link.linkedAt, phone: maskPhone(link.phone) };
    },
  },
};
