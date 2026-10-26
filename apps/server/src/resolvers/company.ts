import { db, schema } from '@zapbots/database';
import { cnpjDigits, isValidCnpj } from '@zapbots/finance';
import type { Resolvers } from '@zapbots/graphql/server';

import { CnpjError, lookupCnpj } from '../services/cnpj';
import { badInput, findHolder, owned, requireViewer } from './guards';

/** The Titular's company: its registry at the Receita, looked up by its CNPJ (docs/adr/0024). */
export const companyResolvers: Resolvers = {
  Holder: {
    company: async holder => {
      if (!holder.companyCnpj) return null;
      try {
        const company = await lookupCnpj(holder.companyCnpj);
        return {
          ...company,
          cnaeCode: company.cnae?.code ?? null,
          cnaeDescription: company.cnae?.description ?? null,
        };
      } catch (error) {
        if (error instanceof CnpjError) badInput(error.message);
        throw error;
      }
    },
    companyCnpj: holder => holder.companyCnpj,
  },
  Mutation: {
    setCompanyCnpj: async (_, { cnpj, holderId }, context) => {
      const viewer = requireViewer(context);
      const holder = await findHolder(viewer, holderId);
      const digits = cnpj ? cnpjDigits(cnpj) : '';
      if (digits && !isValidCnpj(digits)) badInput('CNPJ inválido: confira os 14 números.');
      const [saved] = await db
        .update(schema.holder)
        .set({ companyCnpj: digits || null })
        .where(owned(schema.holder, viewer, holder.id))
        .returning();
      return saved!;
    },
  },
};
