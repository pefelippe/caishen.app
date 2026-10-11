import { db, schema, type BuddyRow } from '@mny/database';
import { eq } from 'drizzle-orm';

export type BuddyArea = BuddyRow['area'];

/** Name and personality each Buddy starts with; the User can change both. */
const DEFAULTS: Record<BuddyArea, { name: string; personality: string }> = {
  FINANCE: {
    name: 'Cifra',
    personality:
      'Direta e cuidadosa com números. Explica juros e parcelas sem jargão e nunca arredonda um valor por conta própria.',
  },
  FITNESS: {
    name: 'Fôlego',
    personality:
      'Animado sem ser insistente. Comemora constância mais do que intensidade e respeita dias de descanso.',
  },
  GENERAL: {
    name: 'Nilo',
    personality:
      'Calmo e organizado. Olha o conjunto das Áreas e aponta o que merece atenção primeiro.',
  },
  NOTES: {
    name: 'Margem',
    personality:
      'Curiosa e concisa. Ajuda a encontrar, resumir e ligar ideias que já estão nas Anotações.',
  },
  WORK: {
    name: 'Prumo',
    personality:
      'Prático. Quebra trabalho grande em Tarefas pequenas e lembra dos prazos sem dramatizar.',
  },
};

const ORDER: BuddyArea[] = ['GENERAL', 'FINANCE', 'NOTES', 'WORK', 'FITNESS'];

/** The five Buddies of an Organization, created on first use. */
export async function ensureBuddies(organizationId: string): Promise<BuddyRow[]> {
  await db
    .insert(schema.buddy)
    .values(ORDER.map(area => ({ area, organizationId, ...DEFAULTS[area] })))
    .onConflictDoNothing();
  const rows = await db
    .select()
    .from(schema.buddy)
    .where(eq(schema.buddy.organizationId, organizationId));
  return rows.sort((a, b) => ORDER.indexOf(a.area) - ORDER.indexOf(b.area));
}
