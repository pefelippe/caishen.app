import { closeDb } from '@zapbots/database';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';

afterAll(async () => {
  await closeDb();
});

const CREATE = `mutation ($input: NoteInput!) { createNote(input: $input) { id title body pinned } }`;
const UPDATE = `mutation ($id: ID!, $input: NoteInput!) { updateNote(id: $id, input: $input) { id title body pinned } }`;
const NOTES = `query ($search: String, $pinned: Boolean) { notes(search: $search, pinned: $pinned) { title } }`;

const titles = (result: { data: { notes: { title: string }[] } }) =>
  result.data.notes.map(note => note.title);

describe('Notas', () => {
  it('shows pinned ones first and finds by title or text', async () => {
    const viewer = await createViewer();
    await gql(viewer, CREATE, { input: { body: 'ABC1D23', title: 'Placa do carro' } });
    const wifi = (
      await gql(viewer, CREATE, { input: { body: 'senha: 100%_casa', title: 'Wi-fi' } })
    ).data.createNote;
    await gql(viewer, UPDATE, { id: wifi.id, input: { pinned: true } });

    expect(titles(await gql(viewer, NOTES))).toEqual(['Wi-fi', 'Placa do carro']);
    expect(titles(await gql(viewer, NOTES, { search: 'abc1' }))).toEqual(['Placa do carro']);
    expect(titles(await gql(viewer, NOTES, { search: '100%_' }))).toEqual(['Wi-fi']);
    expect(titles(await gql(viewer, NOTES, { search: '%' }))).toEqual(['Wi-fi']);
    expect(titles(await gql(viewer, NOTES, { pinned: true }))).toEqual(['Wi-fi']);
  });

  it('changes only the fields given and refuses an empty one', async () => {
    const viewer = await createViewer();
    expect((await gql(viewer, CREATE, { input: { body: ' ' } })).errors).toEqual([
      'BAD_USER_INPUT',
    ]);
    const note = (await gql(viewer, CREATE, { input: { pinned: true, title: 'Compras' } })).data
      .createNote;
    const updated = await gql(viewer, UPDATE, { id: note.id, input: { body: 'pão' } });
    expect(updated.data.updateNote).toMatchObject({ body: 'pão', pinned: true, title: 'Compras' });
  });

  it("keeps each Organization's to itself", async () => {
    const ana = await createViewer('Ana');
    const bia = await createViewer('Bia');
    const note = (await gql(ana, CREATE, { input: { title: 'Segredo' } })).data.createNote;
    expect(titles(await gql(bia, NOTES))).toEqual([]);
    expect(
      (await gql(bia, `query ($id: ID!) { note(id: $id) { id } }`, { id: note.id })).data.note
    ).toBeNull();
    expect(
      (await gql(bia, `mutation ($id: ID!) { deleteNote(id: $id) }`, { id: note.id })).data
        .deleteNote
    ).toBe(false);
  });
});
