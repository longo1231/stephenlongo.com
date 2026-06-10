import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const musings = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/musings' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});

export const collections = { musings };
