import { db, schema } from '@zapbots/database';
import { addMonths } from '@zapbots/finance';
import { and, desc, eq, gte, lt } from 'drizzle-orm';

/**
 * The guides of the Titular's company (DAS, DARF…), as Adaflow shows them (docs/adr/0023). The
 * Caishen does not work them out: it keeps what was read and counts each in the month it is due.
 */

/** The guides due in `yearMonth` (`YYYY-MM`), paid or not, earliest first. */
export function guidesDueIn(holderId: string, yearMonth: string) {
  const from = `${yearMonth}-01`;
  return db
    .select()
    .from(schema.companyGuide)
    .where(
      and(
        eq(schema.companyGuide.holderId, holderId),
        gte(schema.companyGuide.dueDate, from),
        lt(schema.companyGuide.dueDate, addMonths(from, 1))
      )
    )
    .orderBy(schema.companyGuide.dueDate);
}

/** Every guide of the Holder, the latest competência first. */
export function companyGuides(holderId: string) {
  return db
    .select()
    .from(schema.companyGuide)
    .where(eq(schema.companyGuide.holderId, holderId))
    .orderBy(desc(schema.companyGuide.competence), schema.companyGuide.dueDate);
}
