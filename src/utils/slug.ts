// One anchor per title, shared by the diorama's night stars and the spine wall,
// so a star in the sky and its spine on the shelf agree on the same #hash.
export const slug = (title: string): string =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
