"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import type { SpotifyPlaylistTrackItem, SpotifyTrack } from "@/lib/spotify";

type LibraryMeta = {
  user: { id: string; displayName: string };
  playlists: { id: string; name: string; trackTotal: number }[];
  likedTotal: number;
};

type DuplicateItem = {
  key: string;
  track: SpotifyTrack;
  position?: number;
  occurrences?: number;
};

type DuplicateGroup = {
  id: string;
  kind: "exact" | "potential";
  title: string;
  subtitle?: string;
  items: DuplicateItem[];
};

type ExecuteResult = {
  removedFromLiked: number;
  removedFromPlaylist: number;
  removedTracks: number;
  archivePlaylist: { id: string; name: string } | null;
  failures?: { scope: "playlist" | "liked"; id?: string; message: string }[];
};

const steps = [
  "Choose a source",
  "Scan for duplicates",
  "Select removals",
  "Review results",
];

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s*\[.*?\]\s*/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const buildPotentialKey = (track: SpotifyTrack) => {
  const primaryArtist = track.artists[0]?.name ?? "";
  return `${normalize(track.name)}|${normalize(primaryArtist)}`;
};

export default function DuplicatesPage() {
  const { data: session, status } = useSession();
  const [libraryMeta, setLibraryMeta] = useState<LibraryMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [sourceType, setSourceType] = useState<"liked" | "playlist">("liked");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [hasScanned, setHasScanned] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    loaded: number;
    total: number;
  } | null>(null);
  const [executeState, setExecuteState] = useState<{
    loading: boolean;
    error: string | null;
    result: ExecuteResult | null;
  }>({ loading: false, error: null, result: null });
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      setLibraryMeta(null);
      setDuplicateGroups([]);
      setSelection({});
      setExecuteState({ loading: false, error: null, result: null });
      setHasScanned(false);
      setScanProgress(null);
    }
  }, [status]);

  useEffect(() => {
    if (scanError) {
      toast.error(scanError);
    }
  }, [scanError]);

  useEffect(() => {
    if (executeState.error) {
      toast.error(executeState.error);
    }
  }, [executeState.error]);

  useEffect(() => {
    if (executeState.result?.failures?.length) {
      toast.warning(
        `Some removals failed (${executeState.result.failures.length}). See details below.`
      );
    }
  }, [executeState.result?.failures?.length]);

  useEffect(() => {
    if (executeState.result) {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [executeState.result]);

  useEffect(() => {
    if (libraryMeta && !selectedPlaylistId) {
      setSelectedPlaylistId(libraryMeta.playlists[0]?.id ?? "");
    }
  }, [libraryMeta, selectedPlaylistId]);

  const selectedPlaylistName = useMemo(() => {
    return (
      libraryMeta?.playlists.find(
        (playlist) => playlist.id === selectedPlaylistId
      )?.name ?? ""
    );
  }, [libraryMeta, selectedPlaylistId]);

  const flowStep = useMemo(() => {
    if (executeState.result) {
      return 3;
    }
    if (scanLoading) {
      return 1;
    }
    if (hasScanned || duplicateGroups.length > 0) {
      return 2;
    }
    return 0;
  }, [executeState.result, duplicateGroups.length, hasScanned, scanLoading]);

  const scanPercent = useMemo(() => {
    if (!scanProgress || scanProgress.total <= 0) {
      return 0;
    }
    return Math.min(
      100,
      Math.round((scanProgress.loaded / scanProgress.total) * 100)
    );
  }, [scanProgress]);

  const duplicatesSummary = useMemo(() => {
    const totalItems = duplicateGroups.reduce(
      (sum, group) => sum + group.items.length,
      0
    );
    return {
      groups: duplicateGroups.length,
      items: totalItems,
    };
  }, [duplicateGroups]);

  const selectedItems = useMemo(() => {
    const items: DuplicateItem[] = [];
    duplicateGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (selection[item.key]) {
          items.push(item);
        }
      });
    });
    return items;
  }, [duplicateGroups, selection]);

  const buildGroupsFromPlaylist = (
    items: SpotifyPlaylistTrackItem[]
  ): { groups: DuplicateGroup[]; defaults: Record<string, boolean> } => {
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
        (a, b) => (a.position ?? 0) - (b.position ?? 0)
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
  };

  const buildGroupsFromLiked = (
    tracks: SpotifyTrack[]
  ): { groups: DuplicateGroup[]; defaults: Record<string, boolean> } => {
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
  };

  const loadSources = async () => {
    setLoadingMeta(true);
    setScanError(null);
    setLibraryMeta(null);
    setDuplicateGroups([]);
    setSelection({});
    setHasScanned(false);
    setScanProgress(null);
    setExecuteState({ loading: false, error: null, result: null });

    try {
      const response = await fetch("/api/spotify/library/meta");
      if (!response.ok) {
        throw new Error("Unable to load playlists.");
      }
      const data = (await response.json()) as LibraryMeta;
      setLibraryMeta(data);
    } catch (error) {
      console.error(error);
      setScanError("Unable to load your Spotify library. Try again.");
    } finally {
      setLoadingMeta(false);
    }
  };

  const scanDuplicates = async () => {
    setScanLoading(true);
    setScanError(null);
    setDuplicateGroups([]);
    setSelection({});
    setExecuteState({ loading: false, error: null, result: null });
    setHasScanned(false);
    setScanProgress({ loaded: 0, total: 0 });

    try {
      if (sourceType === "liked") {
        const tracks: SpotifyTrack[] = [];
        let offset = 0;
        const limit = 50;
        let total = 0;

        while (true) {
          const response = await fetch(
            `/api/spotify/liked?offset=${offset}&limit=${limit}`
          );
          if (!response.ok) {
            throw new Error("Unable to load liked songs.");
          }
          const data = (await response.json()) as {
            items: SpotifyTrack[];
            total: number;
            nextOffset: number | null;
          };
          tracks.push(...data.items);
          total = data.total;
          setScanProgress({ loaded: tracks.length, total });
          if (data.nextOffset == null) {
            break;
          }
          offset = data.nextOffset;
        }

        const { groups, defaults } = buildGroupsFromLiked(tracks);
        setDuplicateGroups(groups);
        setSelection(defaults);
      } else {
        if (!selectedPlaylistId) {
          throw new Error("Select a playlist first.");
        }
        const items: SpotifyPlaylistTrackItem[] = [];
        let offset = 0;
        const limit = 100;
        let total = 0;

        while (true) {
          const response = await fetch(
            `/api/spotify/playlists/${selectedPlaylistId}/items?offset=${offset}&limit=${limit}`
          );
          if (!response.ok) {
            throw new Error("Unable to load playlist tracks.");
          }
          const data = (await response.json()) as {
            items: SpotifyPlaylistTrackItem[];
            total: number;
            nextOffset: number | null;
          };
          items.push(...data.items);
          total = data.total;
          setScanProgress({ loaded: items.length, total });
          if (data.nextOffset == null) {
            break;
          }
          offset = data.nextOffset;
        }

        const { groups, defaults } = buildGroupsFromPlaylist(items);
        setDuplicateGroups(groups);
        setSelection(defaults);
      }
      setHasScanned(true);
    } catch (error) {
      console.error(error);
      setScanError(
        error instanceof Error
          ? error.message
          : "Failed to scan for duplicates."
      );
      setScanProgress(null);
    } finally {
      setScanLoading(false);
    }
  };

  const buildRemovalPayload = () => {
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
        })
      ),
      removedTrackUris: Array.from(removedUris),
    };
  };

  const applyResolution = async () => {
    const invalidGroups = duplicateGroups.filter((group) =>
      group.items.every((item) => selection[item.key])
    );
    if (invalidGroups.length > 0) {
      setExecuteState({
        loading: false,
        error:
          "Keep at least one track in every group. Uncheck one item per group before applying.",
        result: null,
      });
      return;
    }

    const payload = buildRemovalPayload();

    setExecuteState({ loading: true, error: null, result: null });

    try {
      const response = await fetch("/api/spotify/duplicates/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          playlistId:
            sourceType === "playlist" ? selectedPlaylistId : undefined,
          sourceName:
            sourceType === "playlist" ? selectedPlaylistName : "Liked Songs",
          ...payload,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        throw new Error(errorPayload.error ?? "Duplicate cleanup failed.");
      }

      const result = (await response.json()) as ExecuteResult;
      setExecuteState({ loading: false, error: null, result });
    } catch (error) {
      console.error(error);
      setExecuteState({
        loading: false,
        error:
          error instanceof Error ? error.message : "Duplicate cleanup failed.",
        result: null,
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-base uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
              Spotify Cleanup Tool
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <Link
                className="hover:text-slate-700 dark:hover:text-slate-200"
                href="/"
              >
                Cleanup flow
              </Link>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-emerald-700 dark:text-emerald-300">
                Duplicate finder
              </span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <Link
                className="hover:text-slate-700 dark:hover:text-slate-200"
                href="/archives"
              >
                Archive cleanup
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 text-base">
            {session && (
              <span className="text-slate-600 dark:text-slate-300">
                Signed in as{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {session.user?.name ?? "Spotify user"}
                </span>
              </span>
            )}
            <button
              className="rounded-full border-2 border-emerald-500 px-4 py-2 text-base text-emerald-800 transition hover:border-emerald-600 hover:text-emerald-900 dark:border-emerald-300 dark:text-emerald-200 dark:hover:border-emerald-200 dark:hover:text-emerald-100"
              onClick={() => (session ? signOut() : signIn("spotify"))}
            >
              {session ? "Sign out" : "Sign in with Spotify"}
            </button>
          </div>
        </header>

        <main className="mt-12">
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {status === "loading" && (
              <div className="space-y-4">
                <div className="h-6 w-40 animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
                <div className="h-4 w-full animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
              </div>
            )}

            {status === "unauthenticated" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">
                  Connect Spotify to find duplicates.
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  Scan your liked songs or playlists you own to surface
                  duplicates and clean them up safely.
                </p>
                <button
                  className="rounded-full bg-emerald-600 px-6 py-3 text-white transition hover:bg-emerald-700 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
                  onClick={() => signIn("spotify")}
                >
                  Sign in with Spotify
                </button>
              </div>
            )}

            {session && (
              <div className="space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold">Duplicate finder</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {libraryMeta
                        ? `${libraryMeta.likedTotal} liked tracks · ${libraryMeta.playlists.length} playlists`
                        : "Pick a source, scan, then decide which duplicates to remove."}
                    </p>
                  </div>
                  {libraryMeta && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                        Step {flowStep + 1} of {steps.length}
                      </div>
                      <button
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                        onClick={loadSources}
                        disabled={loadingMeta}
                      >
                        {loadingMeta ? "Loading..." : "Reload sources"}
                      </button>
                    </div>
                  )}
                </div>

                {!libraryMeta && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Load your playlists to start a duplicate scan.
                    </p>
                    <button
                      className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
                      onClick={loadSources}
                      disabled={loadingMeta}
                    >
                      {loadingMeta ? "Loading..." : "Load my sources"}
                    </button>
                  </div>
                )}

                {libraryMeta && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {steps.map((label, index) => (
                        <div
                          key={label}
                          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                            index === flowStep
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200"
                              : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400"
                          }`}
                        >
                          {label}
                        </div>
                      ))}
                    </div>

                    {flowStep === 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold">
                              Choose a source
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Liked songs or a playlist you own.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                                sourceType === "liked"
                                  ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200"
                                  : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                              }`}
                              onClick={() => setSourceType("liked")}
                            >
                              Liked Songs
                            </button>
                            <button
                              className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                                sourceType === "playlist"
                                  ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200"
                                  : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                              }`}
                              onClick={() => setSourceType("playlist")}
                            >
                              Playlist
                            </button>
                            <select
                              className={`h-10 min-w-[220px] rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${
                                sourceType === "playlist"
                                  ? ""
                                  : "cursor-not-allowed opacity-50"
                              }`}
                              value={selectedPlaylistId}
                              onChange={(event) =>
                                setSelectedPlaylistId(event.target.value)
                              }
                              disabled={sourceType !== "playlist"}
                            >
                              {libraryMeta.playlists.length === 0 && (
                                <option value="" disabled>
                                  No playlists found
                                </option>
                              )}
                              {libraryMeta.playlists.length > 0 && (
                                <option value="" disabled>
                                  Select a playlist
                                </option>
                              )}
                              {libraryMeta.playlists.map((playlist) => (
                                <option key={playlist.id} value={playlist.id}>
                                  {playlist.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {sourceType === "liked"
                              ? `${libraryMeta.likedTotal} liked tracks`
                              : `${libraryMeta.playlists.length} playlists`}
                          </span>
                          <button
                            className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
                            onClick={scanDuplicates}
                            disabled={scanLoading}
                          >
                            {scanLoading
                              ? "Scanning..."
                              : "Scan for duplicates"}
                          </button>
                        </div>
                      </div>
                    )}

                    {flowStep === 1 && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
                        <h3 className="text-lg font-semibold">
                          Scanning for duplicates
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {sourceType === "liked"
                            ? "Checking your Liked Songs."
                            : `Checking ${selectedPlaylistName || "your playlist"}.`}
                        </p>
                        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/60">
                          <div
                            className="h-2 rounded-full bg-emerald-500/70 transition-all duration-300 dark:bg-emerald-400/70"
                            style={{ width: `${scanPercent}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {scanProgress?.total
                            ? `${scanProgress.loaded} / ${scanProgress.total} tracks scanned`
                            : "Preparing scan..."}
                        </p>
                      </div>
                    )}

                    {flowStep === 2 && (
                      <>
                        {duplicateGroups.length === 0 && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                            No duplicates found in{" "}
                            {sourceType === "liked"
                              ? "Liked Songs"
                              : selectedPlaylistName || "this playlist"}
                            .
                          </div>
                        )}

                        {duplicateGroups.length > 0 && (
                          <div className="space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-semibold">
                                  Duplicates found
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {duplicatesSummary.groups} groups ·{" "}
                                  {duplicatesSummary.items} tracks
                                </p>
                                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                                  Select tracks to remove · unchecked = keep
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Leaving a group untouched keeps every track
                                  as-is.
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Each group must keep at least one track.
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                                  onClick={() => {
                                    const updated: Record<string, boolean> = {};
                                    duplicateGroups.forEach((group) => {
                                      group.items.forEach((item, index) => {
                                        updated[item.key] = index > 0;
                                      });
                                    });
                                    setSelection(updated);
                                  }}
                                >
                                  Select extras (keep one)
                                </button>
                                <button
                                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                                  onClick={() => {
                                    const updated: Record<string, boolean> = {};
                                    duplicateGroups.forEach((group) => {
                                      group.items.forEach((item) => {
                                        updated[item.key] = false;
                                      });
                                    });
                                    setSelection(updated);
                                  }}
                                >
                                  Clear (keep all)
                                </button>
                              </div>
                            </div>

                            <div className="max-h-[min(68vh,560px)] space-y-4 overflow-y-auto pr-1">
                              {duplicateGroups.map((group) => (
                                <div
                                  key={group.id}
                                  className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {group.title}
                                      </p>
                                      {group.subtitle && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                          {group.subtitle} ·{" "}
                                          {group.kind === "exact"
                                            ? "Exact duplicates"
                                            : "Potential duplicates"}
                                        </p>
                                      )}
                                    </div>
                                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                                      {group.items.length} items
                                    </span>
                                  </div>
                                  {group.items.map((item) => (
                                    <label
                                      key={item.key}
                                      className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 text-sm last:border-none dark:border-slate-800"
                                    >
                                      <div className="flex min-w-0 items-center gap-3">
                                        {item.track.album.imageUrl ? (
                                          <img
                                            src={item.track.album.imageUrl}
                                            alt={`${item.track.name} cover art`}
                                            className="h-10 w-10 rounded-lg border border-slate-200 object-cover dark:border-slate-800"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                                            Cover
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                                            {item.track.name}
                                          </p>
                                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                            {item.track.artists
                                              .map((artist) => artist.name)
                                              .join(", ")}
                                            {item.track.album.name
                                              ? ` · ${item.track.album.name}`
                                              : ""}
                                            {typeof item.position === "number"
                                              ? ` · Pos ${item.position + 1}`
                                              : ""}
                                            {item.occurrences
                                              ? ` · ${item.occurrences}x`
                                              : ""}
                                          </p>
                                        </div>
                                      </div>
                                      <span className="flex shrink-0 items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(selection[item.key])}
                                          onChange={(event) =>
                                            setSelection((prev) => ({
                                              ...prev,
                                              [item.key]: event.target.checked,
                                            }))
                                          }
                                          aria-label={`Remove ${item.track.name}`}
                                          className="h-4 w-4 rounded border-slate-300 bg-white text-emerald-600 accent-emerald-600 dark:border-slate-600 dark:bg-slate-900"
                                        />
                                        <span className="w-14 text-right text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                                          {selection[item.key]
                                            ? "Remove"
                                            : "Keep"}
                                        </span>
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              ))}
                            </div>

                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-500/10 dark:text-emerald-200">
                              {selectedItems.length} tracks selected for
                              removal.
                            </div>

                            <div className="flex flex-wrap gap-4">
                              <button
                                className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
                                onClick={applyResolution}
                                disabled={
                                  selectedItems.length === 0 ||
                                  executeState.loading
                                }
                              >
                                {executeState.loading
                                  ? "Applying..."
                                  : "Apply resolution"}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {flowStep === 3 && executeState.result && (
                      <div ref={resultRef} className="space-y-4">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-500/10">
                          <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                            Duplicate cleanup complete
                          </h3>
                          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
                            Removed {executeState.result.removedTracks} tracks
                            and archived them to a backup playlist.
                          </p>
                          {executeState.result.archivePlaylist && (
                            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
                              Backup playlist created:{" "}
                              <span className="font-semibold">
                                {executeState.result.archivePlaylist.name}
                              </span>
                              .
                            </p>
                          )}
                        </div>

                        {executeState.result.failures &&
                          executeState.result.failures.length > 0 && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-200">
                              <p className="font-semibold">
                                Some removals did not complete:
                              </p>
                              <ul className="mt-2 space-y-1 text-amber-800 dark:text-amber-200">
                                {executeState.result.failures.map(
                                  (failure, index) => (
                                    <li
                                      key={`${failure.scope}-${failure.id}-${index}`}
                                    >
                                      {failure.scope === "liked"
                                        ? "Liked Songs"
                                        : selectedPlaylistName ||
                                          failure.id ||
                                          "Playlist"}
                                      : {failure.message}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                        <div className="flex flex-wrap gap-4">
                          <button
                            className="rounded-full border border-slate-200 px-6 py-3 text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                            onClick={loadSources}
                          >
                            Run another scan
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
