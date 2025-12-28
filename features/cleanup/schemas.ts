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

export const likedTracksResponseSchema = z.object({
  tracks: z.array(spotifyTrackSchema),
});

export const playlistTracksResponseSchema = z.object({
  tracks: z.array(spotifyTrackSchema),
});

export const artistImagesResponseSchema = z.object({
  images: z.record(z.string(), z.string().nullable()),
});

export const cleanupExecuteResponseSchema = z.object({
  removedFromLiked: z.number(),
  playlistsUpdated: z.number(),
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

export type LibraryMetaSchema = z.infer<typeof libraryMetaSchema>;
