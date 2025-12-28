import type { SpotifyTrack } from "@/lib/spotify";

export type Source =
  | { type: "liked" }
  | { type: "playlist"; playlistId: string; playlistName: string };

export type TrackWithSources = SpotifyTrack & { sources: Source[] };

export type LibraryData = {
  user: { id: string; displayName: string };
  likedTracks: SpotifyTrack[];
  playlists: { id: string; name: string; tracks: SpotifyTrack[] }[];
};

export type LibraryMeta = {
  user: { id: string; displayName: string };
  playlists: { id: string; name: string; trackTotal: number }[];
  likedTotal: number;
};

export type ExecuteResult = {
  removedFromLiked: number;
  playlistsUpdated: number;
  removedTracks: number;
  archivePlaylist: { id: string; name: string } | null;
  failures?: { scope: "playlist" | "liked"; id?: string; message: string }[];
};

export type ScanProgress = {
  phase: "meta" | "tracks" | "done";
  completedSources: number;
  totalSources: number;
  completedTracks: number;
  totalTracks: number;
};
