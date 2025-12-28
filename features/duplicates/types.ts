import type { SpotifyPlaylistTrackItem, SpotifyTrack } from "@/lib/spotify";

export type LibraryMeta = {
  user: { id: string; displayName: string };
  playlists: { id: string; name: string; trackTotal: number }[];
  likedTotal: number;
};

export type DuplicateItem = {
  key: string;
  track: SpotifyTrack;
  position?: number;
  occurrences?: number;
};

export type DuplicateGroup = {
  id: string;
  kind: "exact" | "potential";
  title: string;
  subtitle?: string;
  items: DuplicateItem[];
};

export type ExecuteResult = {
  removedFromLiked: number;
  removedFromPlaylist: number;
  removedTracks: number;
  archivePlaylist: { id: string; name: string } | null;
  failures?: { scope: "playlist" | "liked"; id?: string; message: string }[];
};

export type PlaylistItemsPage = {
  items: SpotifyPlaylistTrackItem[];
  total: number;
  nextOffset: number | null;
};

export type LikedTracksPage = {
  items: SpotifyTrack[];
  total: number;
  nextOffset: number | null;
};
