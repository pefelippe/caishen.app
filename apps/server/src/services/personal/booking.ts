import { randomBytes } from 'node:crypto';

import type { Viewer } from '@zapbots/auth';
import { db, schema, type BookingTypeRow } from '@zapbots/database';
import { addDays } from '@zapbots/finance';
import {
  bookingSlots,
  dateIn,
  isTimeZone,
  occurrences,
  wallClock,
  windowsProblem,
  zonedInstant,
  type BookingWindow,
  type Busy,
} from '@zapbots/personal';
import { and, asc, count, desc, eq, gte, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';

import { badInput, notFound, owned } from '../../resolvers/guards';
import { clientOrigin, sendEmail } from '../mail';
import { externalOccurrences } from './calendars';
import { text, title } from './clock';

/** A Tipo de agendamento as the form gives it. */
export interface BookingTypeInput {
  active?: boolean | null;
  daysAhead?: null | number;
  description?: null | string;
  durationMinutes: number;
  minNoticeMinutes?: null | number;
  slug: string;
  title: string;
  windows: BookingWindow[];
}

/** At most this many bookings ahead one e-mail can hold on one link, so nobody fills a week. */
const MAX_AHEAD_PER_GUEST = 2;
/** An Evento with an hour and no end takes this long out of the free slots. */
const DEFAULT_EVENT_MINUTES = 60;

const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const between = (value: number, min: number, max: number) =>
  Number.isInteger(value) && value >= min && value <= max;

function bookingTypeValues(input: BookingTypeInput) {
  const slug = input.slug.trim().toLowerCase();
  if (!SLUG.test(slug))
    badInput('O link precisa ter de 3 a 40 letras minúsculas, números ou hífens.');
  if (!between(input.durationMinutes, 5, 480) || input.durationMinutes % 5)
    badInput('A duração vai de 5 minutos a 8 horas, de 5 em 5.');
  const minNoticeMinutes = input.minNoticeMinutes ?? 240;
  if (!between(minNoticeMinutes, 0, 60 * 24 * 14)) badInput('A antecedência vai até 14 dias.');
  const daysAhead = input.daysAhead ?? 30;
  if (!between(daysAhead, 1, 180)) badInput('Dá para abrir de 1 a 180 dias à frente.');
  const windows = input.windows.map(({ end, start, weekday }) => ({ end, start, weekday }));
  const problem = windowsProblem(windows);
  if (problem) badInput(problem);
  if (!windows.length) badInput('Escolha ao menos um dia com horário.');
  return {
    active: input.active ?? true,
    daysAhead,
    description: text(input.description, 'A descrição', 1000),
    durationMinutes: input.durationMinutes,
    minNoticeMinutes,
    slug,
    title: title(input.title),
    windows: windows.sort((a, b) => a.weekday - b.weekday),
  };
}

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  ((error as { code?: string }).code === '23505' ||
    (error as { cause?: { code?: string } }).cause?.code === '23505');

/** The Viewer's own booking links, oldest first. */
export function listBookingTypes(viewer: Viewer) {
  return db
    .select()
    .from(schema.bookingType)
    .where(and(owned(schema.bookingType, viewer), eq(schema.bookingType.userId, viewer.userId)))
    .orderBy(asc(schema.bookingType.createdAt));
}

/** Creates a booking link (no `id`) or changes one of the Viewer's. */
export async function saveBookingType(
  viewer: Viewer,
  id: null | string | undefined,
  input: BookingTypeInput
): Promise<BookingTypeRow> {
  const values = bookingTypeValues(input);
  try {
    if (id) {
      const [row] = await db
        .update(schema.bookingType)
        .set(values)
        .where(
          and(owned(schema.bookingType, viewer, id), eq(schema.bookingType.userId, viewer.userId))
        )
        .returning();
      return row ?? notFound('Link de agendamento');
    }
    const [row] = await db
      .insert(schema.bookingType)
      .values({ ...values, organizationId: viewer.organizationId, userId: viewer.userId })
      .returning();
    return row!;
  } catch (error) {
    if (isUniqueViolation(error)) badInput('Esse link já está em uso. Escolha outro.');
    throw error;
  }
}

export async function deleteBookingType(viewer: Viewer, id: string): Promise<boolean> {
  const deleted = await db
    .delete(schema.bookingType)
    .where(and(owned(schema.bookingType, viewer, id), eq(schema.bookingType.userId, viewer.userId)))
    .returning({ id: schema.bookingType.id });
  return deleted.length > 0;
}

/** The Viewer's bookings: those ahead, soonest first, or the last 50 (cancelled too), newest first. */
export async function listBookings(viewer: Viewer, upcoming: boolean) {
  const rows = await db
    .select({ booking: schema.booking, typeTitle: schema.bookingType.title })
    .from(schema.booking)
    .innerJoin(schema.bookingType, eq(schema.bookingType.id, schema.booking.bookingTypeId))
    .where(
      and(
        owned(schema.booking, viewer),
        upcoming ? isNull(schema.booking.cancelledAt) : undefined,
        upcoming ? gte(schema.booking.endsAt, new Date()) : undefined
      )
    )
    .orderBy(upcoming ? asc(schema.booking.startsAt) : desc(schema.booking.startsAt))
    .limit(50);
  return rows.map(row => ({ ...row.booking, typeTitle: row.typeTitle }));
}

/** The owner's name, e-mail and clock. */
async function ownerOf(type: BookingTypeRow) {
  const [owner] = await db
    .select({ email: schema.user.email, name: schema.user.name, timezone: schema.user.timezone })
    .from(schema.user)
    .where(eq(schema.user.id, type.userId));
  return owner ?? notFound('Link de agendamento');
}

/** An active booking link by its slug, for anyone with the link. */
async function activeType(slug: string): Promise<BookingTypeRow> {
  const [type] = await db
    .select()
    .from(schema.bookingType)
    .where(and(eq(schema.bookingType.slug, slug.toLowerCase()), schema.bookingType.active));
  return type ?? notFound('Link de agendamento');
}

/** What anyone with the link sees of it: the title, how long, whose time. Nothing else. */
export async function publicBookingType(slug: string) {
  const type = await activeType(slug);
  const owner = await ownerOf(type);
  return {
    description: type.description,
    durationMinutes: type.durationMinutes,
    ownerName: owner.name,
    slug: type.slug,
    timeZone: owner.timezone,
    title: type.title,
  };
}

/**
 * The owner's timed Eventos and outside events from `from` to `to` (their dates) as busy spans;
 * all-day ones leave time free.
 */
async function busyOf(organizationId: string, timeZone: string, from: string, to: string) {
  const events = await db
    .select()
    .from(schema.event)
    .where(
      and(
        eq(schema.event.organizationId, organizationId),
        isNotNull(schema.event.startTime),
        lte(schema.event.startsOn, to),
        or(
          isNotNull(schema.event.repeat),
          gte(sql`coalesce(${schema.event.endsOn}, ${schema.event.startsOn})`, addDays(from, -1))
        )
      )
    );
  const busy: Busy[] = [];
  for (const event of events) {
    const dates = event.repeat
      ? occurrences(event.startsOn, event.repeat, addDays(from, -1), to)
      : [event.startsOn];
    // An Evento over several days with hours runs from the first day's start to the last day's end.
    const span = event.endsOn
      ? Math.round((Date.parse(event.endsOn) - Date.parse(event.startsOn)) / 86_400_000)
      : 0;
    for (const date of dates) {
      const start = zonedInstant(date, event.startTime!, timeZone);
      const end = event.endTime
        ? zonedInstant(addDays(date, span), event.endTime, timeZone)
        : new Date(start.getTime() + DEFAULT_EVENT_MINUTES * 60_000);
      busy.push({ end, start });
    }
  }
  // The timed events of the calendars kept elsewhere take their time too.
  for (const occurrence of await externalOccurrences(
    organizationId,
    timeZone,
    addDays(from, -1),
    to
  )) {
    if (occurrence.start && occurrence.end)
      busy.push({ end: occurrence.end, start: occurrence.start });
  }
  return busy;
}

async function freeSlots(type: BookingTypeRow, timeZone: string, now: Date) {
  const from = dateIn(timeZone, now);
  const to = addDays(from, type.daysAhead);
  return bookingSlots({
    busy: await busyOf(type.organizationId, timeZone, from, to),
    durationMinutes: type.durationMinutes,
    from,
    notBefore: new Date(now.getTime() + type.minNoticeMinutes * 60_000),
    timeZone,
    to,
    windows: type.windows,
  });
}

/** The free slots of a booking link, as instants, for anyone with the link. */
export async function publicBookingSlots(slug: string, now = new Date()): Promise<Date[]> {
  const type = await activeType(slug);
  const owner = await ownerOf(type);
  return freeSlots(type, owner.timezone, now);
}

/** "terça-feira, 10 de novembro, às 09:00 (America/Sao_Paulo)". */
function when(instant: Date, timeZone: string) {
  const formatted = instant.toLocaleString('pt-BR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    timeZone,
    weekday: 'long',
  });
  return `${formatted} (${timeZone})`;
}

export interface BookInput {
  email: string;
  name: string;
  note?: null | string;
  slug: string;
  startsAt: Date | string;
  timeZone?: null | string;
}

/**
 * Books a slot for a guest: checked again inside a lock on the link, so two guests never take the
 * same one. The slot becomes an Evento in the owner's Agenda, and both get an e-mail.
 */
export async function book(input: BookInput, now = new Date()) {
  const type = await activeType(input.slug);
  const owner = await ownerOf(type);
  const name = title(input.name, 'O nome');
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) badInput('Informe um e-mail válido.');
  const note = text(input.note, 'A mensagem', 1000);
  const guestTimeZone = input.timeZone && isTimeZone(input.timeZone) ? input.timeZone : null;
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) badInput('Horário inválido.');
  const endsAt = new Date(startsAt.getTime() + type.durationMinutes * 60_000);

  const booked = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${type.id}))`);
    const [{ ahead }] = (await tx
      .select({ ahead: count() })
      .from(schema.booking)
      .where(
        and(
          eq(schema.booking.bookingTypeId, type.id),
          eq(schema.booking.guestEmail, email),
          isNull(schema.booking.cancelledAt),
          gte(schema.booking.endsAt, now)
        )
      )) as [{ ahead: number }];
    if (ahead >= MAX_AHEAD_PER_GUEST)
      badInput('Você já tem horários marcados neste link. Cancele um para marcar outro.');
    const free = await freeSlots(type, owner.timezone, now);
    if (!free.some(slot => slot.getTime() === startsAt.getTime()))
      badInput('Esse horário não está mais livre. Escolha outro.');

    const start = wallClock(startsAt, owner.timezone);
    const end = wallClock(endsAt, owner.timezone);
    const [event] = await tx
      .insert(schema.event)
      .values({
        createdById: type.userId,
        endTime: end.time,
        endsOn: end.date === start.date ? null : end.date,
        notes: [`Agendado por ${name} <${email}>.`, note].filter(Boolean).join('\n\n'),
        organizationId: type.organizationId,
        startTime: start.time,
        startsOn: start.date,
        title: `${type.title} com ${name}`,
      })
      .returning();
    const [row] = await tx
      .insert(schema.booking)
      .values({
        bookingTypeId: type.id,
        cancelToken: randomBytes(24).toString('base64url'),
        endsAt,
        eventId: event!.id,
        guestEmail: email,
        guestName: name,
        guestTimeZone,
        note,
        organizationId: type.organizationId,
        startsAt,
      })
      .returning();
    return row!;
  });

  const cancelUrl = `${clientOrigin()}/book/cancel/${booked.cancelToken}`;
  await Promise.all([
    sendEmail({
      link: { label: 'Ver na Agenda', url: `${clientOrigin()}/personal/calendar` },
      paragraphs: [
        `${name} (${email}) marcou “${type.title}” com você para ${when(startsAt, owner.timezone)}.`,
        ...(note ? [`Mensagem: ${note}`] : []),
      ],
      subject: `Novo agendamento: ${name}`,
      to: owner.email,
    }),
    sendEmail({
      link: { label: 'Cancelar o horário', url: cancelUrl },
      paragraphs: [
        `Olá, ${name}. Seu horário com ${owner.name} está marcado: “${type.title}”, ${when(startsAt, guestTimeZone ?? owner.timezone)}.`,
        'Se não puder ir, cancele pelo link abaixo.',
      ],
      subject: `Confirmado: ${type.title} com ${owner.name}`,
      to: email,
    }),
  ]);

  return {
    cancelToken: booked.cancelToken,
    cancelledAt: null,
    endsAt,
    ownerName: owner.name,
    startsAt,
    title: type.title,
  };
}

async function bookingWithType(where: ReturnType<typeof eq>) {
  const [row] = await db
    .select({ booking: schema.booking, type: schema.bookingType })
    .from(schema.booking)
    .innerJoin(schema.bookingType, eq(schema.bookingType.id, schema.booking.bookingTypeId))
    .where(where);
  return row;
}

/** A booking as its guest sees it from the link in their e-mail, or null. */
export async function bookingByToken(token: string) {
  const row = await bookingWithType(eq(schema.booking.cancelToken, token));
  if (!row) return null;
  const owner = await ownerOf(row.type);
  return {
    cancelToken: token,
    cancelledAt: row.booking.cancelledAt,
    endsAt: row.booking.endsAt,
    ownerName: owner.name,
    startsAt: row.booking.startsAt,
    title: row.type.title,
  };
}

/** Marks a booking cancelled and takes its Evento out of the Agenda. */
async function cancel(bookingId: string, eventId: null | string) {
  await db.transaction(async tx => {
    await tx
      .update(schema.booking)
      .set({ cancelledAt: new Date() })
      .where(eq(schema.booking.id, bookingId));
    if (eventId) await tx.delete(schema.event).where(eq(schema.event.id, eventId));
  });
}

/** The guest cancels from their e-mail's link; the owner is told. */
export async function cancelBookingByToken(token: string): Promise<boolean> {
  const row = await bookingWithType(eq(schema.booking.cancelToken, token));
  if (!row) notFound('Agendamento');
  // A booking that already happened stays in the owner's Agenda.
  if (row.booking.cancelledAt || row.booking.startsAt <= new Date()) return false;
  await cancel(row.booking.id, row.booking.eventId);
  const owner = await ownerOf(row.type);
  await sendEmail({
    paragraphs: [
      `${row.booking.guestName} cancelou “${row.type.title}” de ${when(row.booking.startsAt, owner.timezone)}. O horário saiu da sua Agenda.`,
    ],
    subject: `Cancelado: ${row.booking.guestName}`,
    to: owner.email,
  });
  return true;
}

/** Tells the guest their booking is off. */
async function tellGuest(row: NonNullable<Awaited<ReturnType<typeof bookingWithType>>>) {
  const owner = await ownerOf(row.type);
  await sendEmail({
    paragraphs: [
      `Olá, ${row.booking.guestName}. ${owner.name} cancelou “${row.type.title}” de ${when(row.booking.startsAt, row.booking.guestTimeZone ?? owner.timezone)}.`,
      `Se quiser, marque outro horário: ${clientOrigin()}/book/${row.type.slug}`,
    ],
    subject: `Cancelado: ${row.type.title} com ${owner.name}`,
    to: row.booking.guestEmail,
  });
}

/** The owner cancels a booking; the guest is told. */
export async function cancelBooking(viewer: Viewer, id: string): Promise<boolean> {
  const row = await bookingWithType(eq(schema.booking.id, id));
  if (!row || row.booking.organizationId !== viewer.organizationId) notFound('Agendamento');
  if (row.booking.cancelledAt) return false;
  await cancel(row.booking.id, row.booking.eventId);
  await tellGuest(row);
  return true;
}

/**
 * An Evento made by a booking was deleted from the Agenda: the booking is cancelled too and the
 * guest told, so nobody shows up for a time that is gone.
 */
export async function cancelBookingsOfEvent(eventId: string): Promise<void> {
  const row = await bookingWithType(eq(schema.booking.eventId, eventId));
  if (!row || row.booking.cancelledAt) return;
  await db
    .update(schema.booking)
    .set({ cancelledAt: new Date() })
    .where(eq(schema.booking.id, row.booking.id));
  await tellGuest(row);
}
