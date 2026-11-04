/**
 * Makes the URL slug of a name: lower case, accents removed, each run of other characters than a-z and 0-9 changed to 1 hyphen, no hyphen at the start or the end.
 * @param name - the English name
 * @returns the slug
 * @sideEffects none
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Adds the slug to each entity of 1 kind. The entity with the lowest ID keeps the slug of its name; each other entity with the same slug gets "-<id>" at the end.
 * @param entities - the entities of 1 kind, with an ID and a name
 * @returns the entities with their slugs, in the order of the input
 * @sideEffects none
 */
export function withSlugs<T extends { id: number; name: string }>(entities: readonly T[]): (T & { slug: string })[] {
  const owner = new Map<string, number>();
  for (const { id, name } of entities) {
    const slug = slugify(name);
    const current = owner.get(slug);
    if (current === undefined || id < current) owner.set(slug, id);
  }
  return entities.map((entity) => {
    const slug = slugify(entity.name);
    return { ...entity, slug: owner.get(slug) === entity.id ? slug : `${slug}-${entity.id}` };
  });
}
