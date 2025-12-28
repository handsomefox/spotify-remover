"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import AppHeader from "@/components/layout/app-header";
import AppShell from "@/components/layout/app-shell";
import { fetchJson } from "@/lib/api";
import type { SpotifyPlaylistTrackItem, SpotifyTrack } from "@/lib/spotify";
import DuplicateGroups from "./components/duplicate-groups";
import DuplicatesHeader from "./components/duplicates-header";
import DuplicatesResults from "./components/duplicates-results";
import DuplicatesUnauthenticated from "./components/duplicates-unauthenticated";
import ScanProgress from "./components/scan-progress";
import SourcePicker from "./components/source-picker";
import {
  buildDuplicatesSummary,
  buildGroupsFromLiked,
  buildGroupsFromPlaylist,
  buildRemovalPayload,
  buildSelectedItems,
  computeScanPercent,
} from "./logic/duplicates";
import {
  duplicatesExecuteResponseSchema,
  libraryMetaSchema,
  likedTracksPageSchema,
  playlistItemsPageSchema,
} from "./schemas";
import type { DuplicateGroup, ExecuteResult, LibraryMeta } from "./types";

const steps = [
  "Choose a source",
  "Scan for duplicates",
  "Select removals",
  "Review results",
];

type ExecuteState = {
  loading: boolean;
  error: string | null;
  result: ExecuteResult | null;
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
  const [executeState, setExecuteState] = useState<ExecuteState>({
    loading: false,
    error: null,
    result: null,
  });
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
        `Some removals failed (${executeState.result.failures.length}). See details below.`,
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
        (playlist) => playlist.id === selectedPlaylistId,
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

  const scanPercent = useMemo(
    () => computeScanPercent(scanProgress),
    [scanProgress],
  );

  const duplicatesSummary = useMemo(
    () => buildDuplicatesSummary(duplicateGroups),
    [duplicateGroups],
  );

  const selectedItems = useMemo(
    () => buildSelectedItems(duplicateGroups, selection),
    [duplicateGroups, selection],
  );

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
      const data = await fetchJson("/api/spotify/library/meta", undefined, {
        schema: libraryMetaSchema,
      });
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
          const data = await fetchJson(
            `/api/spotify/liked?offset=${offset}&limit=${limit}`,
            undefined,
            { schema: likedTracksPageSchema },
          );
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
          const data = await fetchJson(
            `/api/spotify/playlists/${selectedPlaylistId}/items?offset=${offset}&limit=${limit}`,
            undefined,
            { schema: playlistItemsPageSchema },
          );
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
          : "Failed to scan for duplicates.",
      );
      setScanProgress(null);
    } finally {
      setScanLoading(false);
    }
  };

  const applyResolution = async () => {
    const invalidGroups = duplicateGroups.filter((group) =>
      group.items.every((item) => selection[item.key]),
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

    const payload = buildRemovalPayload(selectedItems, sourceType);

    setExecuteState({ loading: true, error: null, result: null });

    try {
      const result = await fetchJson(
        "/api/spotify/duplicates/execute",
        {
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
        },
        { schema: duplicatesExecuteResponseSchema },
      );
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
    <AppShell header={<AppHeader activePath="/duplicates" />}>
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {status === "loading" && (
          <div className="space-y-4">
            <div className="h-6 w-40 animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
            <div className="h-4 w-full animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
          </div>
        )}

        {status === "unauthenticated" && <DuplicatesUnauthenticated />}

        {session && (
          <div className="space-y-8">
            <DuplicatesHeader
              libraryMeta={libraryMeta}
              steps={steps}
              flowStep={flowStep}
              loadingMeta={loadingMeta}
              onReload={loadSources}
            />

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
                  <SourcePicker
                    libraryMeta={libraryMeta}
                    sourceType={sourceType}
                    selectedPlaylistId={selectedPlaylistId}
                    onSourceTypeChange={setSourceType}
                    onPlaylistChange={setSelectedPlaylistId}
                    onScan={scanDuplicates}
                    scanLoading={scanLoading}
                  />
                )}

                {flowStep === 1 && (
                  <ScanProgress
                    sourceType={sourceType}
                    selectedPlaylistName={selectedPlaylistName}
                    scanPercent={scanPercent}
                    scanProgress={scanProgress}
                  />
                )}

                {flowStep === 2 && (
                  <DuplicateGroups
                    duplicateGroups={duplicateGroups}
                    selection={selection}
                    summary={duplicatesSummary}
                    onSelectExtras={() => {
                      const updated: Record<string, boolean> = {};
                      duplicateGroups.forEach((group) => {
                        group.items.forEach((item, index) => {
                          updated[item.key] = index > 0;
                        });
                      });
                      setSelection(updated);
                    }}
                    onClearSelection={() => {
                      const updated: Record<string, boolean> = {};
                      duplicateGroups.forEach((group) => {
                        group.items.forEach((item) => {
                          updated[item.key] = false;
                        });
                      });
                      setSelection(updated);
                    }}
                    onToggleItem={(key, checked) =>
                      setSelection((prev) => ({ ...prev, [key]: checked }))
                    }
                  />
                )}

                {flowStep === 2 && duplicateGroups.length > 0 && (
                  <div className="flex flex-wrap gap-4">
                    <button
                      className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
                      onClick={applyResolution}
                      disabled={
                        selectedItems.length === 0 || executeState.loading
                      }
                    >
                      {executeState.loading ? "Removing..." : "Remove selected"}
                    </button>
                  </div>
                )}

                {flowStep === 3 && executeState.result && (
                  <div ref={resultRef}>
                    <DuplicatesResults
                      result={executeState.result}
                      onRunAgain={scanDuplicates}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
