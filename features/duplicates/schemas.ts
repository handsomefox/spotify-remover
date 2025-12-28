import { z } from "zod";
import { spotifyTrackSchema } from "@/lib/spotify-schemas";

export const libraryMetaSchema = z.object({
  user: z.object({
    id: z.string(),
    displayName: z.string(),
  }),
  playlists: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      trackTotal: z.number(),
    }),
  ),
  likedTotal: z.number(),
});

export const likedTracksPageSchema = z.object({
  items: z.array(spotifyTrackSchema),
  total: z.number(),
  nextOffset: z.number().nullable(),
});

export const playlistTrackItemSchema = z.object({
  track: spotifyTrackSchema,
  position: z.number(),
});

export const playlistItemsPageSchema = z.object({
  items: z.array(playlistTrackItemSchema),
  total: z.number(),
  nextOffset: z.number().nullable(),
});

export const duplicatesExecuteResponseSchema = z.object({
  removedFromLiked: z.number(),
  removedFromPlaylist: z.number(),
  removedTracks: z.number(),
  archivePlaylist: z.object({ id: z.string(), name: z.string() }).nullable(),
  failures: z
    .array(
      z.object({
        scope: z.enum(["playlist", "liked"]),
        id: z.string().optional(),
        message: z.string(),
      }),
    )
    .optional(),
});
