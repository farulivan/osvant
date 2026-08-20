// Content collections (07 §2, ADR-010). Journal articles author as
// markdown commits through normal PR flow; rendered fully at build —
// zero content JS ships.
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const journal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/journal" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    leadImage: z.object({
      src: z.string(),
      alt: z.string(),
    }),
    ogOverride: z.string().optional(),
    // Powers `next drop` deep-links + PDP cross-links (RFC B6)
    scent: z.enum(["volt", "nocturne", "static", "fever", "halo"]).optional(),
  }),
});

export const collections = { journal };
