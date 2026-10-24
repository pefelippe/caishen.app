import type { Resolvers } from '@zapbots/graphql/server';

import { connections } from '../services/connections';
import {
  maskPhone,
  startWhatsappLink,
  unlinkWhatsapp,
  whatsappLinkOf,
} from '../services/whatsapp/link';
import { whatsappConfigured } from '../services/whatsapp/meta';
import { badInput, requireViewer } from './guards';

export const connectionResolvers: Resolvers = {
  Mutation: {
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
    connections: (_, __, context) => connections(requireViewer(context)),
    whatsappLink: async (_, __, context) => {
      const link = await whatsappLinkOf(requireViewer(context));
      return link && { linkedAt: link.linkedAt, phone: maskPhone(link.phone) };
    },
  },
};
