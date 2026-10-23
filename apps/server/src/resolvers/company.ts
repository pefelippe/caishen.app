import { db, schema } from '@zapbots/database';
import {
  employerPaysCpp,
  normalizeCnpj,
  parsePercent,
  proLabore,
  type SimplesAnnex,
} from '@zapbots/finance';
import type { Resolvers } from '@zapbots/graphql/server';
import { and, eq } from 'drizzle-orm';

import { companyMonth, companyMonths } from '../services/company';
import { badInput, findHolder, notFound, owned, requireViewer } from './guards';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The Empresa and its taxes (docs/adr/0016): one per Titular, its revenue by competência. */
export const companyResolvers: Resolvers = {
  Holder: {
    company: async holder => {
      const [row] = await db
        .select()
        .from(schema.company)
        .where(eq(schema.company.holderId, holder.id));
      return row ?? null;
    },
  },
  Company: {
    issRate: company => (company.issRate == null ? null : Number(company.issRate)),
    months: (company, { last, upTo }) => {
      if (!MONTH.test(upTo)) badInput('Mês inválido: use AAAA-MM');
      if (!Number.isInteger(last) || last < 1 || last > 24) badInput('De 1 a 24 meses');
      return companyMonths(company, upTo, last);
    },
    proLabore: company =>
      proLabore(company.proLaboreCents, employerPaysCpp(company.regime, company.annex)),
  },
  Mutation: {
    saveCompany: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      await findHolder(viewer, input.holderId);
      const cnpj = normalizeCnpj(input.cnpj);
      if (!cnpj) badInput('CNPJ inválido: confira os 14 caracteres');
      const simples = input.regime === 'SIMPLES';
      if (simples && !input.annex) badInput('Informe o Anexo do Simples Nacional');
      const proLaboreCents = input.regime === 'MEI' ? 0 : (input.proLaboreCents ?? 0);
      if (!Number.isInteger(proLaboreCents) || proLaboreCents < 0) {
        badInput('Pró-labore deve ser zero ou positivo');
      }
      let issRate: string | null = null;
      if (input.regime === 'PRESUMIDO' && input.issRate?.trim()) {
        const rate = parsePercent(input.issRate);
        if (!rate || rate.gt('0.05') || rate.lt('0.02')) badInput('O ISS vai de 2% a 5%');
        issRate = rate.toString();
      }
      if (input.revenueSourceId) {
        const [source] = await db
          .select({ id: schema.incomeSource.id })
          .from(schema.incomeSource)
          .where(
            and(
              eq(schema.incomeSource.id, input.revenueSourceId),
              eq(schema.incomeSource.holderId, input.holderId)
            )
          );
        if (!source) notFound('Fonte de Renda');
      }
      const values = {
        activity: input.activity ?? 'SERVICES',
        annex: simples ? (input.annex as SimplesAnnex) : null,
        cnpj,
        exports: input.exports ?? false,
        fatorR: simples ? (input.fatorR ?? false) : false,
        issRate,
        name: input.name?.trim() || null,
        proLaboreCents,
        regime: input.regime,
        revenueSourceId: input.revenueSourceId ?? null,
        startsOn: input.startsOn,
      };
      const [row] = await db
        .insert(schema.company)
        .values({ ...values, holderId: input.holderId, organizationId: viewer.organizationId })
        .onConflictDoUpdate({
          set: { ...values, updatedAt: new Date() },
          target: schema.company.holderId,
        })
        .returning();
      return row!;
    },
    deleteCompany: async (_, { id }, context) => {
      const deleted = await db
        .delete(schema.company)
        .where(owned(schema.company, requireViewer(context), id))
        .returning({ id: schema.company.id });
      return deleted.length > 0;
    },
    setCompanyRevenue: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      const [company] = await db
        .select()
        .from(schema.company)
        .where(owned(schema.company, viewer, input.companyId));
      if (!company) notFound('Empresa');
      if (!MONTH.test(input.month)) badInput('Mês inválido: use AAAA-MM');
      if (!Number.isInteger(input.amountCents) || input.amountCents < 0) {
        badInput('Faturamento deve ser zero ou positivo');
      }
      if (
        input.rbt12Cents != null &&
        (!Number.isInteger(input.rbt12Cents) || input.rbt12Cents < 0)
      ) {
        badInput('RBT12 deve ser zero ou positivo');
      }
      const values = { amountCents: input.amountCents, rbt12Cents: input.rbt12Cents ?? null };
      await db
        .insert(schema.companyRevenue)
        .values({
          ...values,
          companyId: company.id,
          month: input.month,
          organizationId: viewer.organizationId,
        })
        .onConflictDoUpdate({
          set: { ...values, updatedAt: new Date() },
          target: [schema.companyRevenue.companyId, schema.companyRevenue.month],
        });
      return companyMonth(company, input.month);
    },
    clearCompanyRevenue: async (_, { companyId, month }, context) => {
      const viewer = requireViewer(context);
      const [company] = await db
        .select({ id: schema.company.id })
        .from(schema.company)
        .where(owned(schema.company, viewer, companyId));
      if (!company) notFound('Empresa');
      const deleted = await db
        .delete(schema.companyRevenue)
        .where(
          and(
            eq(schema.companyRevenue.companyId, company.id),
            eq(schema.companyRevenue.month, month)
          )
        )
        .returning({ id: schema.companyRevenue.id });
      return deleted.length > 0;
    },
  },
};
