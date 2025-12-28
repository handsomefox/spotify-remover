import type { SpotifyTrack } from "@/lib/spotify";
import type { LibraryData, Source, TrackWithSources } from "../types";

type ArtistStatsEntry = {
  id: string;
  name: string;
  trackIds: Set<string>;
  primaryTrackIds: Set<string>;
};

type ArtistSummary = {
  id: string;
  name: string;
  count: number;
};

export type ArtistSort = "count-desc" | "count-asc" | "name-asc" | "name-desc";

export type PlaylistImpact = {
  id: string;
  label: string;
  trackCount: number;
};

export function buildTracksWithSources(
  libraryData: LibraryData | null,
): TrackWithSources[] {
  if (!libraryData) {
    return [];
  }

  const map = new Map<string, TrackWithSources>();

  const addTrack = (track: SpotifyTrack, source: Source) => {
    const existing = map.get(track.id);
    if (existing) {
      const exists = existing.sources.some((existingSource) => {
        if (existingSource.type !== source.type) {
          return false;
        }
        if (source.type === "liked") {
          return true;
        }
        return (
          existingSource.type === "playlist" &&
          existingSource.playlistId === source.playlistId
        );
      });
      if (!exists) {
        existing.sources.push(source);
      }
      return;
    }

    map.set(track.id, { ...track, sources: [source] });
  };

  libraryData.likedTracks.forEach((track) => {
    addTrack(track, { type: "liked" });
  });

  libraryData.playlists.forEach((playlist) => {
    playlist.tracks.forEach((track) => {
      addTrack(track, {
        type: "playlist",
        playlistId: playlist.id,
        playlistName: playlist.name,
      });
    });
  });

  return Array.from(map.values());
}

export function buildArtistStats(tracksWithSources: TrackWithSources[]) {
  const map = new Map<string, ArtistStatsEntry>();

  tracksWithSources.forEach((track) => {
    const primaryArtistId = track.artists[0]?.id ?? null;
    track.artists.forEach((artist) => {
      const entry = map.get(artist.id) ?? {
        id: artist.id,
        name: artist.name,
        trackIds: new Set<string>(),
        primaryTrackIds: new Set<string>(),
      };
      entry.trackIds.add(track.id);
      if (primaryArtistId && artist.id === primaryArtistId) {
        entry.primaryTrackIds.add(track.id);
      }
      map.set(artist.id, entry);
    });
  });

  return map;
}

function buildArtistCompare(sort: ArtistSort) {
  return (a: ArtistSummary, b: ArtistSummary) => {
    const isNameSort = sort.startsWith("name");
    const direction = sort.endsWith("asc") ? 1 : -1;
    if (isNameSort) {
      const result = a.name.localeCompare(b.name);
      if (result !== 0) {
        return result * direction;
      }
    } else {
      const result = a.count - b.count;
      if (result !== 0) {
        return result * direction;
      }
    }
    return a.name.localeCompare(b.name);
  };
}

export function buildArtistList(
  artistStats: Map<string, ArtistStatsEntry>,
  sort: ArtistSort,
  showFeaturedOnly: boolean,
): ArtistSummary[] {
  return Array.from(artistStats.values())
    .filter((artist) => showFeaturedOnly || artist.primaryTrackIds.size > 0)
    .map((artist) => ({
      id: artist.id,
      name: artist.name,
      count: artist.trackIds.size,
    }))
    .sort(buildArtistCompare(sort));
}

export function buildFeaturedOnlyArtists(
  artistStats: Map<string, ArtistStatsEntry>,
  sort: ArtistSort,
): ArtistSummary[] {
  return Array.from(artistStats.values())
    .filter((artist) => artist.primaryTrackIds.size === 0)
    .map((artist) => ({
      id: artist.id,
      name: artist.name,
      count: artist.trackIds.size,
    }))
    .sort(buildArtistCompare(sort));
}

export function buildTrackCandidates(
  tracksWithSources: TrackWithSources[],
  selectedArtistIds: string[],
) {
  const selectedSet = new Set(selectedArtistIds);
  const candidateMap = new Map<string, TrackWithSources>();
  tracksWithSources.forEach((track) => {
    if (track.artists.some((artist) => selectedSet.has(artist.id))) {
      candidateMap.set(track.id, track);
    }
  });
  const candidates = Array.from(candidateMap.values());
  const selection: Record<string, boolean> = {};
  candidates.forEach((track) => {
    selection[track.id] = true;
  });
  return { candidates, selection };
}

export function buildPlaylistImpact(selectedTracks: TrackWithSources[]) {
  const impactMap = new Map<string, { label: string; trackCount: number }>();

  selectedTracks.forEach((track) => {
    track.sources.forEach((source) => {
      if (source.type === "liked") {
        const entry = impactMap.get("liked") ?? {
          label: "Liked Songs",
          trackCount: 0,
        };
        entry.trackCount += 1;
        impactMap.set("liked", entry);
        return;
      }

      const entry = impactMap.get(source.playlistId) ?? {
        label: source.playlistName,
        trackCount: 0,
      };
      entry.trackCount += 1;
      impactMap.set(source.playlistId, entry);
    });
  });

  return Array.from(impactMap.entries()).map(([id, data]) => ({
    id,
    label: data.label,
    trackCount: data.trackCount,
  }));
}

export function buildRemovalPayload(
  selectedTracks: TrackWithSources[],
  selectedSources: Record<string, boolean>,
) {
  const likedIds = new Set<string>();
  const playlistMap: Record<string, Set<string>> = {};
  const removedUris = new Set<string>();

  selectedTracks.forEach((track) => {
    let removedSomewhere = false;

    track.sources.forEach((source) => {
      if (source.type === "liked") {
        if (selectedSources.liked) {
          likedIds.add(track.id);
          removedSomewhere = true;
        }
        return;
      }

      if (!selectedSources[source.playlistId]) {
        return;
      }

      if (!playlistMap[source.playlistId]) {
        playlistMap[source.playlistId] = new Set<string>();
      }
      playlistMap[source.playlistId].add(track.uri);
      removedSomewhere = true;
    });

    if (removedSomewhere) {
      removedUris.add(track.uri);
    }
  });

  return {
    likedTrackIds: Array.from(likedIds),
    playlistTrackUris: Object.fromEntries(
      Object.entries(playlistMap).map(([id, uriSet]) => [
        id,
        Array.from(uriSet),
      ]),
    ),
    removedTrackUris: Array.from(removedUris),
  };
}

export function buildPlaylistNameMap(libraryData: LibraryData | null) {
  const map = new Map<string, string>();
  libraryData?.playlists.forEach((playlist) => {
    map.set(playlist.id, playlist.name);
  });
  return map;
}

export function computeScanPercent(
  scanProgress: {
    completedSources: number;
    totalSources: number;
    completedTracks: number;
    totalTracks: number;
  } | null,
) {
  if (!scanProgress) {
    return 0;
  }
  const total = scanProgress.totalTracks || scanProgress.totalSources;
  if (!total) {
    return 0;
  }
  const completed = scanProgress.totalTracks
    ? scanProgress.completedTracks
    : scanProgress.completedSources;
  return Math.min(100, Math.round((completed / total) * 100));
}
