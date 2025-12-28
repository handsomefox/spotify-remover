import type { SpotifyPlaylistTrackItem, SpotifyTrack } from "@/lib/spotify";
import type { DuplicateGroup, DuplicateItem } from "../types";

export const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s*\[.*?\]\s*/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export const buildPotentialKey = (track: SpotifyTrack) => {
  const primaryArtist = track.artists[0]?.name ?? "";
  return `${normalize(track.name)}|${normalize(primaryArtist)}`;
};

export function buildGroupsFromPlaylist(items: SpotifyPlaylistTrackItem[]): {
  groups: DuplicateGroup[];
  defaults: Record<string, boolean>;
} {
  const occurrences = new Map<string, DuplicateItem[]>();

  items.forEach((item) => {
    const entry = occurrences.get(item.track.id) ?? [];
    entry.push({
      key: `exact:${item.track.id}:${item.position}`,
      track: item.track,
      position: item.position,
    });
    occurrences.set(item.track.id, entry);
  });

  const groups: DuplicateGroup[] = [];
  const defaults: Record<string, boolean> = {};
  const duplicatedIds = new Set<string>();

  occurrences.forEach((itemsForTrack, trackId) => {
    if (itemsForTrack.length < 2) {
      return;
    }
    duplicatedIds.add(trackId);
    const sorted = [...itemsForTrack].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
    sorted.forEach((item, index) => {
      defaults[item.key] = index > 0;
    });
    groups.push({
      id: `exact:${trackId}`,
      kind: "exact",
      title: sorted[0]?.track.name ?? "Duplicate track",
      subtitle: sorted[0]?.track.artists
        .map((artist) => artist.name)
        .join(", "),
      items: sorted,
    });
  });

  const potentialMap = new Map<string, DuplicateItem[]>();
  const uniqueTracks = new Map<string, SpotifyTrack>();

  items.forEach((item) => {
    if (duplicatedIds.has(item.track.id)) {
      return;
    }
    if (!uniqueTracks.has(item.track.id)) {
      uniqueTracks.set(item.track.id, item.track);
    }
  });

  uniqueTracks.forEach((track) => {
    const key = buildPotentialKey(track);
    const entry = potentialMap.get(key) ?? [];
    entry.push({
      key: `potential:${track.id}`,
      track,
    });
    potentialMap.set(key, entry);
  });

  potentialMap.forEach((entries, key) => {
    if (entries.length < 2) {
      return;
    }
    entries.forEach((item) => {
      defaults[item.key] = false;
    });
    const sample = entries[0];
    const primaryArtist = sample?.track.artists[0]?.name ?? "";
    groups.push({
      id: `potential:${key}`,
      kind: "potential",
      title: sample?.track.name ?? "Potential duplicate",
      subtitle: primaryArtist,
      items: entries,
    });
  });

  return { groups, defaults };
}

export function buildGroupsFromLiked(tracks: SpotifyTrack[]): {
  groups: DuplicateGroup[];
  defaults: Record<string, boolean>;
} {
  const potentialMap = new Map<string, DuplicateItem[]>();
  const defaults: Record<string, boolean> = {};

  tracks.forEach((track) => {
    const key = buildPotentialKey(track);
    const entry = potentialMap.get(key) ?? [];
    entry.push({
      key: `potential:${track.id}`,
      track,
    });
    potentialMap.set(key, entry);
  });

  const groups: DuplicateGroup[] = [];
  potentialMap.forEach((entries, key) => {
    if (entries.length < 2) {
      return;
    }
    entries.forEach((item) => {
      defaults[item.key] = false;
    });
    const sample = entries[0];
    const primaryArtist = sample?.track.artists[0]?.name ?? "";
    groups.push({
      id: `potential:${key}`,
      kind: "potential",
      title: sample?.track.name ?? "Potential duplicate",
      subtitle: primaryArtist,
      items: entries,
    });
  });

  return { groups, defaults };
}

export function buildRemovalPayload(
  selectedItems: DuplicateItem[],
  sourceType: "liked" | "playlist",
) {
  const likedIds = new Set<string>();
  const playlistUris = new Set<string>();
  const playlistPositions = new Map<string, Set<number>>();
  const removedUris = new Set<string>();

  selectedItems.forEach((item) => {
    removedUris.add(item.track.uri);
    if (sourceType === "liked") {
      likedIds.add(item.track.id);
    } else if (sourceType === "playlist") {
      if (typeof item.position === "number") {
        const positions = playlistPositions.get(item.track.uri) ?? new Set();
        positions.add(item.position);
        playlistPositions.set(item.track.uri, positions);
      } else {
        playlistUris.add(item.track.uri);
      }
    }
  });

  playlistPositions.forEach((_, uri) => {
    if (playlistUris.has(uri)) {
      playlistUris.delete(uri);
    }
  });

  return {
    likedTrackIds: Array.from(likedIds),
    playlistTrackUris: Array.from(playlistUris),
    playlistTrackPositions: Array.from(playlistPositions.entries()).map(
      ([uri, positions]) => ({
        uri,
        positions: Array.from(positions).sort((a, b) => a - b),
      }),
    ),
    removedTrackUris: Array.from(removedUris),
  };
}

export function computeScanPercent(
  scanProgress: {
    loaded: number;
    total: number;
  } | null,
) {
  if (!scanProgress || scanProgress.total <= 0) {
    return 0;
  }
  return Math.min(
    100,
    Math.round((scanProgress.loaded / scanProgress.total) * 100),
  );
}

export function buildDuplicatesSummary(groups: DuplicateGroup[]) {
  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);
  return { groups: groups.length, items: totalItems };
}

export function buildSelectedItems(
  groups: DuplicateGroup[],
  selection: Record<string, boolean>,
) {
  const items: DuplicateItem[] = [];
  groups.forEach((group) => {
    group.items.forEach((item) => {
      if (selection[item.key]) {
        items.push(item);
      }
    });
  });
  return items;
}
