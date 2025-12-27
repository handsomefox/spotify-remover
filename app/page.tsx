"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import type { SpotifyTrack } from "@/lib/spotify";

type Source =
  | { type: "liked" }
  | { type: "playlist"; playlistId: string; playlistName: string };

type TrackWithSources = SpotifyTrack & { sources: Source[] };

type LibraryData = {
  user: { id: string; displayName: string };
  likedTracks: SpotifyTrack[];
  playlists: { id: string; name: string; tracks: SpotifyTrack[] }[];
};

type LibraryMeta = {
  user: { id: string; displayName: string };
  playlists: { id: string; name: string; trackTotal: number }[];
  likedTotal: number;
};

type ExecuteResult = {
  removedFromLiked: number;
  playlistsUpdated: number;
  removedTracks: number;
  archivePlaylist: { id: string; name: string } | null;
  failures?: { scope: "playlist" | "liked"; id?: string; message: string }[];
};

type ScanProgress = {
  phase: "meta" | "tracks" | "done";
  completedSources: number;
  totalSources: number;
  completedTracks: number;
  totalTracks: number;
};

const steps = [
  "Choose artists",
  "Review tracks",
  "Confirm playlists",
  "Execute cleanup",
];

export default function Home() {
  const { data: session, status } = useSession();
  const [libraryData, setLibraryData] = useState<LibraryData | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [maxTrackCount, setMaxTrackCount] = useState<string>("");
  const [trackCandidates, setTrackCandidates] = useState<TrackWithSources[]>(
    [],
  );
  const [trackSelection, setTrackSelection] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedSources, setSelectedSources] = useState<
    Record<string, boolean>
  >({});
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [executeState, setExecuteState] = useState<{
    loading: boolean;
    error: string | null;
    result: ExecuteResult | null;
  }>({ loading: false, error: null, result: null });

  useEffect(() => {
    if (status === "unauthenticated") {
      setLibraryData(null);
      setSelectedArtistIds([]);
      setTrackCandidates([]);
      setTrackSelection({});
      setSelectedSources({});
      setScanProgress(null);
      setExecuteState({ loading: false, error: null, result: null });
    }
  }, [session, status]);

  useEffect(() => {
    if (libraryError) {
      toast.error(libraryError);
    }
  }, [libraryError]);

  useEffect(() => {
    if (executeState.error) {
      toast.error(executeState.error);
    }
  }, [executeState.error]);

  useEffect(() => {
    if (session?.error) {
      toast.error("Your Spotify session expired. Please sign in again.");
    }
  }, [session?.error]);

  useEffect(() => {
    if (executeState.result?.failures?.length) {
      toast.warning(
        `Some removals failed (${executeState.result.failures.length}). See details below.`,
      );
    }
  }, [executeState.result?.failures?.length]);

  const tracksWithSources = useMemo(() => {
    if (!libraryData) {
      return [] as TrackWithSources[];
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
  }, [libraryData]);

  const playlistNameById = useMemo(() => {
    const map = new Map<string, string>();
    libraryData?.playlists.forEach((playlist) => {
      map.set(playlist.id, playlist.name);
    });
    return map;
  }, [libraryData]);

  const scanPercent = useMemo(() => {
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
  }, [scanProgress]);

  const updateProgress = (deltaSources: number, deltaTracks: number) => {
    setScanProgress((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        completedSources: Math.min(
          prev.totalSources,
          prev.completedSources + deltaSources,
        ),
        completedTracks: Math.min(
          prev.totalTracks,
          prev.completedTracks + deltaTracks,
        ),
      };
    });
  };

  const mapWithConcurrency = async <T, R>(
    items: T[],
    limit: number,
    mapper: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let cursor = 0;

    const workers = Array.from({ length: Math.min(limit, items.length) }).map(
      async () => {
        while (cursor < items.length) {
          const current = cursor;
          cursor += 1;
          results[current] = await mapper(items[current], current);
        }
      },
    );

    await Promise.all(workers);
    return results;
  };

  const artistList = useMemo(() => {
    const artistMap = new Map<
      string,
      { id: string; name: string; trackIds: Set<string> }
    >();

    tracksWithSources.forEach((track) => {
      track.artists.forEach((artist) => {
        const entry = artistMap.get(artist.id) ?? {
          id: artist.id,
          name: artist.name,
          trackIds: new Set<string>(),
        };
        entry.trackIds.add(track.id);
        artistMap.set(artist.id, entry);
      });
    });

    return Array.from(artistMap.values())
      .map((artist) => ({
        id: artist.id,
        name: artist.name,
        count: artist.trackIds.size,
      }))
      .sort((a, b) => b.count - a.count);
  }, [tracksWithSources]);

  const selectedTracks = useMemo(
    () => trackCandidates.filter((track) => trackSelection[track.id]),
    [trackCandidates, trackSelection],
  );

  const playlistImpact = useMemo(() => {
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
  }, [selectedTracks]);

  const hasSelection = selectedArtistIds.length > 0;

  const loadLibrary = async () => {
    setLibraryError(null);
    setLoadingLibrary(true);
    setLibraryData(null);
    setStep(0);
    setExecuteState({ loading: false, error: null, result: null });
    setScanProgress({
      phase: "meta",
      completedSources: 0,
      totalSources: 0,
      completedTracks: 0,
      totalTracks: 0,
    });

    try {
      const metaResponse = await fetch("/api/spotify/library/meta");
      if (!metaResponse.ok) {
        throw new Error("Unable to load Spotify metadata.");
      }
      const meta = (await metaResponse.json()) as LibraryMeta;

      const totalSources =
        meta.playlists.length + (meta.likedTotal > 0 ? 1 : 0);
      const totalTracks =
        meta.likedTotal +
        meta.playlists.reduce((sum, playlist) => sum + playlist.trackTotal, 0);

      setScanProgress({
        phase: "tracks",
        completedSources: 0,
        totalSources,
        completedTracks: 0,
        totalTracks,
      });

      const likedPromise =
        meta.likedTotal > 0
          ? fetch("/api/spotify/liked")
              .then(async (response) => {
                if (!response.ok) {
                  throw new Error("Unable to load liked songs.");
                }
                const data = (await response.json()) as {
                  tracks: SpotifyTrack[];
                };
                updateProgress(1, data.tracks.length);
                return data.tracks;
              })
              .catch((error) => {
                console.error(error);
                throw error;
              })
          : Promise.resolve([] as SpotifyTrack[]);

      const playlistsPromise = mapWithConcurrency(
        meta.playlists,
        3,
        async (playlist) => {
          const response = await fetch(
            `/api/spotify/playlists/${playlist.id}/tracks`,
          );
          if (!response.ok) {
            throw new Error(`Unable to load ${playlist.name}.`);
          }
          const data = (await response.json()) as {
            tracks: SpotifyTrack[];
          };
          updateProgress(1, data.tracks.length);
          return {
            id: playlist.id,
            name: playlist.name,
            tracks: data.tracks,
          };
        },
      );

      const [likedTracks, playlists] = await Promise.all([
        likedPromise,
        playlistsPromise,
      ]);

      setLibraryData({
        user: meta.user,
        likedTracks,
        playlists,
      });
      setScanProgress((prev) =>
        prev
          ? {
              ...prev,
              phase: "done",
              completedSources: prev.totalSources,
              completedTracks: prev.totalTracks,
            }
          : prev,
      );
      setStep(0);
      setSelectedArtistIds([]);
      setTrackCandidates([]);
      setTrackSelection({});
      setSelectedSources({});
    } catch (error) {
      console.error(error);
      setLibraryError("Unable to load your Spotify library. Try again.");
      setScanProgress(null);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const startTrackReview = () => {
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
    setTrackCandidates(candidates);
    setTrackSelection(selection);
    setStep(1);
  };

  const startPlaylistReview = () => {
    const sourceSelection: Record<string, boolean> = {};
    playlistImpact.forEach((entry) => {
      sourceSelection[entry.id] = true;
    });
    setSelectedSources(sourceSelection);
    setStep(2);
  };

  const buildRemovalPayload = () => {
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
  };

  const executeCleanup = async () => {
    const payload = buildRemovalPayload();

    setExecuteState({ loading: true, error: null, result: null });

    try {
      const response = await fetch("/api/spotify/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        throw new Error(errorPayload.error ?? "Cleanup failed.");
      }

      const result = (await response.json()) as ExecuteResult;
      setExecuteState({ loading: false, error: null, result });
      setStep(3);
    } catch (error) {
      console.error(error);
      setExecuteState({
        loading: false,
        error: error instanceof Error ? error.message : "Cleanup failed.",
        result: null,
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-amber-50 via-emerald-50 to-stone-100 text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl float-slow" />
        <div className="absolute right-0 top-16 h-96 w-96 rounded-full bg-amber-200/50 blur-3xl glow-pulse" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-lime-200/50 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-12">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-700">
              Spotify Cleanup Tool
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
            {session && (
              <span className="text-slate-600">
                Signed in as{" "}
                <span className="font-semibold text-slate-900">
                  {session.user?.name ?? "Spotify user"}
                </span>
              </span>
            )}
            <button
              className="rounded-full border border-emerald-400/60 px-4 py-2 text-emerald-800 transition hover:border-emerald-600 hover:text-emerald-900"
              onClick={() => (session ? signOut() : signIn("spotify"))}
            >
              {session ? "Sign out" : "Sign in with Spotify"}
            </button>
          </div>
        </header>

        <main className="mt-12">
          <section className="rounded-3xl border border-white/80 bg-white/80 p-8 shadow-xl shadow-emerald-100 backdrop-blur">
            {status === "loading" && (
              <div className="space-y-4">
                <div className="h-6 w-40 animate-pulse rounded bg-emerald-100" />
                <div className="h-4 w-full animate-pulse rounded bg-emerald-100" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-emerald-100" />
              </div>
            )}

            {status === "unauthenticated" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">
                  Connect Spotify to get started.
                </h2>
                <p className="text-slate-600">
                  We only request the permissions needed to read your library
                  and remove tracks. You can revoke access any time from your
                  Spotify settings.
                </p>
                <button
                  className="rounded-full bg-emerald-600 px-6 py-3 text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700"
                  onClick={() => signIn("spotify")}
                >
                  Sign in and scan my library
                </button>
              </div>
            )}

            {session && !libraryData && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold">
                  Ready to audit your playlists?
                </h2>
                <p className="text-slate-600">
                  We will load your liked songs and playlists you own. Nothing
                  will be removed until you confirm every step.
                </p>
                <button
                  className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800"
                  onClick={loadLibrary}
                  disabled={loadingLibrary}
                >
                  {loadingLibrary ? "Loading..." : "Load my Spotify library"}
                </button>
                {loadingLibrary && scanProgress && (
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-emerald-100">
                      <div
                        className="h-2 rounded-full bg-emerald-600 transition-all"
                        style={{ width: `${scanPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {scanProgress.phase === "meta"
                        ? "Preparing scan..."
                        : `Scanning ${scanProgress.completedSources}/${scanProgress.totalSources} sources · ${scanProgress.completedTracks}/${scanProgress.totalTracks} tracks`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {session && libraryData && (
              <div className="space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold">Cleanup flow</h2>
                    <p className="text-sm text-slate-500">
                      {libraryData.likedTracks.length} liked tracks ·{" "}
                      {libraryData.playlists.length} owned playlists
                    </p>
                  </div>
                  <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                    Step {step + 1} of {steps.length}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {steps.map((label, index) => (
                    <div
                      key={label}
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                        index === step
                          ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {step === 0 && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold">
                          Select artists to remove
                        </h3>
                        <p className="text-sm text-slate-500">
                          Artists are sorted by how many unique tracks appear
                          across your liked songs and playlists.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                          <span>Less than</span>
                          <input
                            type="number"
                            min={1}
                            value={maxTrackCount}
                            onChange={(event) =>
                              setMaxTrackCount(event.target.value)
                            }
                            className="h-7 w-20 rounded-full border border-slate-200 px-2 text-xs font-semibold text-slate-700"
                            placeholder="X"
                          />
                          <button
                            className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300"
                            onClick={() => {
                              const value = Number(maxTrackCount);
                              if (!Number.isFinite(value) || value <= 0) {
                                return;
                              }
                              setSelectedArtistIds(
                                artistList
                                  .filter((artist) => artist.count < value)
                                  .map((artist) => artist.id),
                              );
                            }}
                          >
                            Select
                          </button>
                        </div>
                        <button
                          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300"
                          onClick={() =>
                            setSelectedArtistIds(
                              artistList.map((artist) => artist.id),
                            )
                          }
                        >
                          Select all
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[min(65vh,480px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                      {artistList.length === 0 && (
                        <div className="p-6 text-sm text-slate-500">
                          No artists found yet. Try reloading your library.
                        </div>
                      )}
                      {artistList.map((artist) => (
                        <label
                          key={artist.id}
                          className="flex min-w-0 cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 text-sm leading-6 last:border-none"
                        >
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                            {artist.name}
                          </span>
                          <span className="flex items-center gap-3 whitespace-nowrap text-slate-500">
                            {artist.count} tracks
                            <input
                              type="checkbox"
                              checked={selectedArtistIds.includes(artist.id)}
                              onChange={(event) => {
                                setSelectedArtistIds((prev) => {
                                  if (event.target.checked) {
                                    return [...prev, artist.id];
                                  }
                                  return prev.filter((id) => id !== artist.id);
                                });
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                            />
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <button
                        className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800"
                        onClick={startTrackReview}
                        disabled={!hasSelection}
                      >
                        Review tracks
                      </button>
                      <button
                        className="rounded-full border border-slate-200 px-6 py-3 text-slate-600 transition hover:border-slate-300"
                        onClick={loadLibrary}
                      >
                        Refresh library
                      </button>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold">Review tracks</h3>
                        <p className="text-sm text-slate-500">
                          Uncheck any songs you want to keep.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600"
                          onClick={() => {
                            const updated: Record<string, boolean> = {};
                            trackCandidates.forEach((track) => {
                              updated[track.id] = true;
                            });
                            setTrackSelection(updated);
                          }}
                        >
                          Check all
                        </button>
                        <button
                          className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600"
                          onClick={() => {
                            const updated: Record<string, boolean> = {};
                            trackCandidates.forEach((track) => {
                              updated[track.id] = false;
                            });
                            setTrackSelection(updated);
                          }}
                        >
                          Uncheck all
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[min(66vh,540px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                      {trackCandidates.length === 0 && (
                        <div className="p-6 text-sm text-slate-500">
                          No tracks found for the selected artists.
                        </div>
                      )}
                      {trackCandidates.map((track) => (
                        <label
                          key={track.id}
                          className="flex cursor-pointer flex-col gap-2 border-b border-slate-100 px-6 py-4 text-base last:border-none"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              {track.album.imageUrl ? (
                                <img
                                  src={track.album.imageUrl}
                                  alt={`${track.name} cover art`}
                                  className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                  Cover
                                </div>
                              )}
                              <div className="space-y-1">
                                <p className="font-medium text-slate-900">
                                  {track.name}
                                </p>
                                <p className="text-sm text-slate-500">
                                  {track.artists
                                    .map((artist) => artist.name)
                                    .join(", ")}
                                  {" · "}
                                  {track.sources
                                    .map((source) =>
                                      source.type === "liked"
                                        ? "Liked Songs"
                                        : source.playlistName,
                                    )
                                    .join(", ")}
                                </p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={Boolean(trackSelection[track.id])}
                              onChange={(event) =>
                                setTrackSelection((prev) => ({
                                  ...prev,
                                  [track.id]: event.target.checked,
                                }))
                              }
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                            />
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <button
                        className="rounded-full border border-slate-200 px-6 py-3 text-slate-600 transition hover:border-slate-300"
                        onClick={() => setStep(0)}
                      >
                        Back
                      </button>
                      <button
                        className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800"
                        onClick={startPlaylistReview}
                        disabled={selectedTracks.length === 0}
                      >
                        Review playlists
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold">
                        Choose which sources to modify
                      </h3>
                      <p className="text-sm text-slate-500">
                        Toggle off any playlist or your liked songs to keep it
                        untouched.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {playlistImpact.map((source) => (
                        <label
                          key={source.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {source.label}
                            </p>
                            <p className="text-xs text-slate-500">
                              {source.trackCount} tracks will be removed
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(selectedSources[source.id])}
                            onChange={(event) =>
                              setSelectedSources((prev) => ({
                                ...prev,
                                [source.id]: event.target.checked,
                              }))
                            }
                            className="h-5 w-5 rounded border-slate-300 text-emerald-600"
                          />
                        </label>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <button
                        className="rounded-full border border-slate-200 px-6 py-3 text-slate-600 transition hover:border-slate-300"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </button>
                      <button
                        className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800"
                        onClick={executeCleanup}
                        disabled={
                          Object.values(selectedSources).every(
                            (value) => !value,
                          ) || executeState.loading
                        }
                      >
                        {executeState.loading
                          ? "Removing..."
                          : "Confirm removal"}
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && executeState.result && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                      <h3 className="text-xl font-semibold text-emerald-900">
                        Cleanup complete
                      </h3>
                      <p className="mt-2 text-sm text-emerald-700">
                        Removed {executeState.result.removedTracks} tracks from{" "}
                        {executeState.result.playlistsUpdated} playlists and{" "}
                        {executeState.result.removedFromLiked} liked songs.
                      </p>
                      {executeState.result.archivePlaylist && (
                        <p className="mt-2 text-sm text-emerald-700">
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
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                          <p className="font-semibold">
                            Some removals did not complete:
                          </p>
                          <ul className="mt-2 space-y-1 text-amber-800">
                            {executeState.result.failures.map(
                              (failure, index) => {
                                const label =
                                  failure.scope === "liked"
                                    ? "Liked Songs"
                                    : (playlistNameById.get(failure.id ?? "") ??
                                      `Playlist ${failure.id ?? "unknown"}`);
                                return (
                                  <li
                                    key={`${failure.scope}-${failure.id}-${index}`}
                                  >
                                    {label}: {failure.message}
                                  </li>
                                );
                              },
                            )}
                          </ul>
                          <p className="mt-2 text-xs text-amber-700">
                            You can retry, or check Spotify to confirm what
                            moved.
                          </p>
                        </div>
                      )}

                    <div className="flex flex-wrap gap-4">
                      <button
                        className="rounded-full border border-slate-200 px-6 py-3 text-slate-600 transition hover:border-slate-300"
                        onClick={loadLibrary}
                      >
                        Run another cleanup
                      </button>
                    </div>
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
