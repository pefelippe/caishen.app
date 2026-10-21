/** Whether any of `texts` holds the search, already lowercased; an empty search holds everything. */
export const matches = (search: string, ...texts: string[]) =>
  !search || texts.some(text => text.toLocaleLowerCase('pt-BR').includes(search));
