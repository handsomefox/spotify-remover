"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import AppHeader from "@/components/layout/app-header";
import AppShell from "@/components/layout/app-shell";
import { fetchJson } from "@/lib/api";
import { mapWithConcurrency } from "@/lib/async";
import type { SpotifyTrack } from "@/lib/spotify";
import ArtistSelection from "./components/artist-selection";
import CleanupResults from "./components/results";
import CleanupUnauthenticated from "./components/cleanup-unauthenticated";
import FeaturedOnlyInfo from "./components/featured-only-info";
import FlowHeader from "./components/flow-header";
import FlowSteps from "./components/flow-steps";
import LibraryLoader from "./components/library-loader";
import SourceReview from "./components/source-review";
import TrackReview from "./components/track-review";
import {
  buildArtistList,
  buildArtistStats,
  buildFeaturedOnlyArtists,
  buildPlaylistImpact,
  buildPlaylistNameMap,
  buildRemovalPayload,
  buildTrackCandidates,
  buildTracksWithSources,
  computeScanPercent,
} from "./logic/cleanup";
import {
  artistImagesResponseSchema,
  cleanupExecuteResponseSchema,
  libraryMetaSchema,
  likedTracksResponseSchema,
  playlistTracksResponseSchema,
} from "./schemas";
import type { ExecuteResult, LibraryData, ScanProgress } from "./types";

const steps = [
  "Choose artists",
  "Review tracks",
  "Review selections",
  "Execute cleanup",
];

type ExecuteState = {
  loading: boolean;
  error: string | null;
  result: ExecuteResult | null;
};

export default function CleanupPage() {
  const { data: session, status } = useSession();
  const [libraryData, setLibraryData] = useState<LibraryData | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([]);
  const [showFeaturedOnlyArtists, setShowFeaturedOnlyArtists] = useState(true);
  const [showFeaturedOnlyInfo, setShowFeaturedOnlyInfo] = useState(false);
  const [artistSort, setArtistSort] = useState<
    "count-desc" | "count-asc" | "name-asc" | "name-desc"
  >("count-desc");
  const [artistImages, setArtistImages] = useState<
    Record<string, string | null>
  >({});
  const [trackCandidates, setTrackCandidates] = useState<
    ReturnType<typeof buildTracksWithSources>
  >([]);
  const [trackSelection, setTrackSelection] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedSources, setSelectedSources] = useState<
    Record<string, boolean>
  >({});
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [executeState, setExecuteState] = useState<ExecuteState>({
    loading: false,
    error: null,
    result: null,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      setLibraryData(null);
      setSelectedArtistIds([]);
      setTrackCandidates([]);
      setTrackSelection({});
      setSelectedSources({});
      setScanProgress(null);
      setExecuteState({ loading: false, error: null, result: null });
      setArtistImages({});
      setShowFeaturedOnlyArtists(true);
      setShowFeaturedOnlyInfo(false);
      setArtistSort("count-desc");
    }
  }, [status]);

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

  const tracksWithSources = useMemo(
    () => buildTracksWithSources(libraryData),
    [libraryData],
  );

  const playlistNameById = useMemo(
    () => buildPlaylistNameMap(libraryData),
    [libraryData],
  );

  const artistStats = useMemo(
    () => buildArtistStats(tracksWithSources),
    [tracksWithSources],
  );

  const artistList = useMemo(
    () => buildArtistList(artistStats, artistSort, showFeaturedOnlyArtists),
    [artistSort, artistStats, showFeaturedOnlyArtists],
  );

  const visibleArtistCount = useMemo(() => artistList.length, [artistList]);

  const artistIds = useMemo(
    () => artistList.map((artist) => artist.id),
    [artistList],
  );

  useEffect(() => {
    if (showFeaturedOnlyArtists) {
      return;
    }
    const visibleIds = new Set(artistIds);
    setSelectedArtistIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [artistIds, showFeaturedOnlyArtists]);

  const featuredOnlyArtists = useMemo(
    () => buildFeaturedOnlyArtists(artistStats, artistSort),
    [artistSort, artistStats],
  );

  const imageIds = useMemo(() => {
    const ids = new Set(artistIds);
    if (showFeaturedOnlyInfo) {
      featuredOnlyArtists.forEach((artist) => ids.add(artist.id));
    }
    return Array.from(ids);
  }, [artistIds, featuredOnlyArtists, showFeaturedOnlyInfo]);

  useEffect(() => {
    if (!libraryData || imageIds.length === 0) {
      return;
    }

    const missingIds = imageIds.filter((id) => !(id in artistImages));
    if (missingIds.length === 0) {
      return;
    }

    let cancelled = false;

    const loadArtistImages = async () => {
      try {
        const data = await fetchJson(
          "/api/spotify/artists",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: missingIds }),
          },
          { schema: artistImagesResponseSchema },
        );
        if (!cancelled) {
          setArtistImages((prev) => ({ ...prev, ...data.images }));
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error("Unable to load artist images.");
        }
      }
    };

    loadArtistImages();

    return () => {
      cancelled = true;
    };
  }, [artistImages, imageIds, libraryData]);

  const scanPercent = useMemo(
    () => computeScanPercent(scanProgress),
    [scanProgress],
  );

  const selectedTracks = useMemo(
    () => trackCandidates.filter((track) => trackSelection[track.id]),
    [trackCandidates, trackSelection],
  );

  const playlistImpact = useMemo(
    () => buildPlaylistImpact(selectedTracks),
    [selectedTracks],
  );

  const hasSelection = selectedArtistIds.length > 0;

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
      const meta = await fetchJson("/api/spotify/library/meta", undefined, {
        schema: libraryMetaSchema,
      });

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
          ? fetchJson("/api/spotify/liked", undefined, {
              schema: likedTracksResponseSchema,
            })
              .then((data) => {
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
          const data = await fetchJson(
            `/api/spotify/playlists/${playlist.id}/tracks`,
            undefined,
            { schema: playlistTracksResponseSchema },
          );
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
    const { candidates, selection } = buildTrackCandidates(
      tracksWithSources,
      selectedArtistIds,
    );
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

  const executeCleanup = async () => {
    const payload = buildRemovalPayload(selectedTracks, selectedSources);

    setExecuteState({ loading: true, error: null, result: null });

    try {
      const result = await fetchJson(
        "/api/spotify/execute",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        { schema: cleanupExecuteResponseSchema },
      );

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
    <AppShell header={<AppHeader activePath="/" />}>
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {status === "loading" && (
          <div className="space-y-4">
            <div className="h-6 w-40 animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
            <div className="h-4 w-full animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
          </div>
        )}

        {status === "unauthenticated" && <CleanupUnauthenticated />}

        {session && !libraryData && (
          <LibraryLoader
            loading={loadingLibrary}
            scanPercent={scanPercent}
            scanProgress={scanProgress}
            onLoad={loadLibrary}
          />
        )}

        {session && libraryData && (
          <div className="space-y-8">
            <FlowHeader
              libraryData={libraryData}
              visibleArtistCount={visibleArtistCount}
              step={step}
              steps={steps}
            />

            <FlowSteps steps={steps} activeStep={step} />

            {step === 0 && (
              <ArtistSelection
                artistList={artistList}
                artistImages={artistImages}
                selectedArtistIds={selectedArtistIds}
                showFeaturedOnlyArtists={showFeaturedOnlyArtists}
                artistSort={artistSort}
                onToggleFeaturedOnly={() =>
                  setShowFeaturedOnlyArtists((prev) => !prev)
                }
                onShowFeaturedOnlyInfo={() => setShowFeaturedOnlyInfo(true)}
                onSortChange={setArtistSort}
                onSelectAll={() =>
                  setSelectedArtistIds(artistList.map((artist) => artist.id))
                }
                onClearSelection={() => setSelectedArtistIds([])}
                onToggleArtist={(artistId, checked) => {
                  setSelectedArtistIds((prev) =>
                    checked
                      ? [...prev, artistId]
                      : prev.filter((id) => id !== artistId),
                  );
                }}
                onStartReview={startTrackReview}
                onRefreshLibrary={loadLibrary}
                hasSelection={hasSelection}
              />
            )}

            {step === 1 && (
              <TrackReview
                trackCandidates={trackCandidates}
                trackSelection={trackSelection}
                selectedTracks={selectedTracks}
                onSelectAll={() => {
                  const updated: Record<string, boolean> = {};
                  trackCandidates.forEach((track) => {
                    updated[track.id] = true;
                  });
                  setTrackSelection(updated);
                }}
                onClearSelection={() => {
                  const updated: Record<string, boolean> = {};
                  trackCandidates.forEach((track) => {
                    updated[track.id] = false;
                  });
                  setTrackSelection(updated);
                }}
                onToggleTrack={(trackId, checked) =>
                  setTrackSelection((prev) => ({
                    ...prev,
                    [trackId]: checked,
                  }))
                }
                onBack={() => setStep(0)}
                onReviewSelections={startPlaylistReview}
              />
            )}

            {step === 2 && (
              <SourceReview
                selectedTracks={selectedTracks}
                playlistImpact={playlistImpact}
                selectedSources={selectedSources}
                onToggleSource={(sourceId, checked) =>
                  setSelectedSources((prev) => ({
                    ...prev,
                    [sourceId]: checked,
                  }))
                }
                onBack={() => setStep(1)}
                onConfirm={executeCleanup}
                confirmDisabled={Object.values(selectedSources).every(
                  (value) => !value,
                )}
                loading={executeState.loading}
              />
            )}

            {step === 3 && executeState.result && (
              <CleanupResults
                result={executeState.result}
                playlistNameById={playlistNameById}
                onRunAgain={loadLibrary}
              />
            )}
          </div>
        )}
      </section>

      {showFeaturedOnlyInfo && (
        <FeaturedOnlyInfo
          artists={featuredOnlyArtists}
          artistImages={artistImages}
          onClose={() => setShowFeaturedOnlyInfo(false)}
        />
      )}
    </AppShell>
  );
}
