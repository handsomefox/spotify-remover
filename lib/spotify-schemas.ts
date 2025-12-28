import { z } from "zod";

export const spotifyArtistSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const spotifyTrackSchema = z.object({
  id: z.string(),
  uri: z.string(),
  name: z.string(),
  artists: z.array(spotifyArtistSchema),
  album: z.object({
    name: z.string(),
    imageUrl: z.string().nullable(),
  }),
});

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

export type SpotifyTrackSchema = z.infer<typeof spotifyTrackSchema>;
export type LibraryMetaSchema = z.infer<typeof libraryMetaSchema>;
