import { z } from "zod";

export const archivesResponseSchema = z.object({
  playlists: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      trackTotal: z.number(),
    }),
  ),
});

export const archivesDeleteResponseSchema = z.object({
  removed: z.number(),
  failures: z
    .array(
      z.object({
        id: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});
