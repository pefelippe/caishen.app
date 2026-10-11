import type { Viewer } from '@mny/auth';
import { type ScrEntryRow, db, schema } from '@mny/database';
import { summarizeScr, type ScrSummary } from '@mny/finance';
import { and, desc, eq, isNull } from 'drizzle-orm';

export class ScrImportError extends Error {}

export interface ScrEntryInput {
  dueCents: number;
  institution: string;
  limitCents: number;
  lossCents: number;
  modality: string;
  overdueCents: number;
  overdueMaxDays?: number | null;
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

async function hasRegistratoConsent(holderId: string) {
  const [consent] = await db
    .select({ id: schema.consent.id })
    .from(schema.consent)
    .where(
      and(
        eq(schema.consent.holderId, holderId),
        eq(schema.consent.source, 'BACEN_REGISTRATO'),
        isNull(schema.consent.revokedAt)
      )
    )
    .limit(1);
  return Boolean(consent);
}

/**
 * Stores an SCR Snapshot. Shared by manual entry and, later, the Registrato PDF parser; the
 * caller must already have checked the Holder belongs to the Viewer's Organization.
 */
export async function createScrSnapshot(
  viewer: Viewer,
  holderId: string,
  referenceMonth: string,
  entries: ScrEntryInput[],
  sourceHash: string | null = null
) {
  if (!(await hasRegistratoConsent(holderId))) {
    throw new ScrImportError('Autorize a consulta ao Registrato antes de importar o relatório');
  }
  if (!MONTH.test(referenceMonth)) throw new ScrImportError('Data-base deve ser YYYY-MM');
  if (entries.length === 0) throw new ScrImportError('O Retrato precisa de ao menos uma linha');
  for (const entry of entries) {
    const amounts = [entry.dueCents, entry.overdueCents, entry.lossCents, entry.limitCents];
    if (amounts.some(amount => !Number.isSafeInteger(amount) || amount < 0)) {
      throw new ScrImportError(`Valores inválidos em ${entry.institution}`);
    }
  }

  const [existing] = await db
    .select({ id: schema.scrSnapshot.id })
    .from(schema.scrSnapshot)
    .where(
      and(
        eq(schema.scrSnapshot.holderId, holderId),
        eq(schema.scrSnapshot.referenceMonth, referenceMonth)
      )
    );
  if (existing) {
    throw new ScrImportError(`Já existe um Retrato SCR de ${referenceMonth}; exclua-o antes`);
  }

  return db.transaction(async tx => {
    const [snapshot] = await tx
      .insert(schema.scrSnapshot)
      .values({ holderId, importedById: viewer.userId, referenceMonth, sourceHash })
      .returning();
    await tx.insert(schema.scrEntry).values(
      entries.map(entry => ({
        ...entry,
        institution: entry.institution.trim(),
        modality: entry.modality.trim(),
        overdueMaxDays: entry.overdueMaxDays ?? null,
        scrSnapshotId: snapshot!.id,
      }))
    );
    return snapshot!;
  });
}

export function scrEntries(scrSnapshotId: string) {
  return db
    .select()
    .from(schema.scrEntry)
    .where(eq(schema.scrEntry.scrSnapshotId, scrSnapshotId))
    .orderBy(schema.scrEntry.institution, schema.scrEntry.modality);
}

export function summarize(referenceMonth: string, entries: ScrEntryRow[]): ScrSummary {
  return summarizeScr(referenceMonth, entries);
}

/** Summary of the Holder's most recent SCR Snapshot, or `null` when none was imported. */
export async function latestScrSummary(holderId: string): Promise<ScrSummary | null> {
  const [snapshot] = await db
    .select()
    .from(schema.scrSnapshot)
    .where(eq(schema.scrSnapshot.holderId, holderId))
    .orderBy(desc(schema.scrSnapshot.referenceMonth))
    .limit(1);
  return snapshot ? summarize(snapshot.referenceMonth, await scrEntries(snapshot.id)) : null;
}
