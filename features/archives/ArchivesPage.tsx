"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import AppHeader from "@/components/layout/app-header";
import AppShell from "@/components/layout/app-shell";
import { fetchJson } from "@/lib/api";
import ArchivesHeader from "./components/archives-header";
import ArchivesList from "./components/archives-list";
import ArchivesResults from "./components/archives-results";
import ArchivesScan from "./components/archives-scan";
import ArchivesUnauthenticated from "./components/archives-unauthenticated";
import {
  archivesDeleteResponseSchema,
  archivesResponseSchema,
} from "./schemas";
import type { ArchivePlaylist, ExecuteResult } from "./types";

const steps = ["Scan tool playlists", "Select deletions", "Review results"];

type ExecuteState = {
  loading: boolean;
  error: string | null;
  result: ExecuteResult | null;
};

export default function ArchivesPage() {
  const { data: session, status } = useSession();
  const [archives, setArchives] = useState<ArchivePlaylist[]>([]);
  const [loadingArchives, setLoadingArchives] = useState(false);
  const [archivesError, setArchivesError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [executeState, setExecuteState] = useState<ExecuteState>({
    loading: false,
    error: null,
    result: null,
  });
  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      setArchives([]);
      setSelection({});
      setHasLoaded(false);
      setExecuteState({ loading: false, error: null, result: null });
    }
  }, [status]);

  useEffect(() => {
    if (archivesError) {
      toast.error(archivesError);
    }
  }, [archivesError]);

  useEffect(() => {
    if (executeState.error) {
      toast.error(executeState.error);
    }
  }, [executeState.error]);

  useEffect(() => {
    if (executeState.result?.failures?.length) {
      toast.warning(
        `Some deletions failed (${executeState.result.failures.length}). See details below.`,
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

  const flowStep = useMemo(() => {
    if (executeState.result) {
      return 2;
    }
    if (hasLoaded) {
      return 1;
    }
    return 0;
  }, [executeState.result, hasLoaded]);

  const selectedIds = useMemo(
    () => archives.filter((playlist) => selection[playlist.id]),
    [archives, selection],
  );

  const loadArchives = async () => {
    setLoadingArchives(true);
    setArchivesError(null);
    setArchives([]);
    setSelection({});
    setHasLoaded(false);
    setExecuteState({ loading: false, error: null, result: null });

    try {
      const data = await fetchJson("/api/spotify/archives", undefined, {
        schema: archivesResponseSchema,
      });
      setArchives(data.playlists);
      const defaults: Record<string, boolean> = {};
      data.playlists.forEach((playlist) => {
        defaults[playlist.id] = true;
      });
      setSelection(defaults);
      setHasLoaded(true);
    } catch (error) {
      console.error(error);
      setArchivesError("Unable to load archive playlists. Try again.");
    } finally {
      setLoadingArchives(false);
    }
  };

  const applyDeletion = async () => {
    if (selectedIds.length === 0) {
      setExecuteState({
        loading: false,
        error: "Select at least one playlist to delete.",
        result: null,
      });
      return;
    }

    setExecuteState({ loading: true, error: null, result: null });

    try {
      const result = await fetchJson(
        "/api/spotify/archives/delete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playlistIds: selectedIds.map((playlist) => playlist.id),
          }),
        },
        { schema: archivesDeleteResponseSchema },
      );
      setExecuteState({ loading: false, error: null, result });
    } catch (error) {
      console.error(error);
      setExecuteState({
        loading: false,
        error:
          error instanceof Error ? error.message : "Archive deletion failed.",
        result: null,
      });
    }
  };

  return (
    <AppShell header={<AppHeader activePath="/archives" />}>
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {status === "loading" && (
          <div className="space-y-4">
            <div className="h-6 w-40 animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
            <div className="h-4 w-full animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-emerald-100 dark:bg-emerald-900/40" />
          </div>
        )}

        {status === "unauthenticated" && <ArchivesUnauthenticated />}

        {session && (
          <div className="space-y-8">
            <ArchivesHeader
              steps={steps}
              flowStep={flowStep}
              hasLoaded={hasLoaded}
              loadingArchives={loadingArchives}
              onReload={loadArchives}
            />

            {!hasLoaded && (
              <ArchivesScan loading={loadingArchives} onScan={loadArchives} />
            )}

            {hasLoaded && flowStep === 1 && (
              <>
                {archives.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                    No tool playlists found.
                  </div>
                ) : (
                  <ArchivesList
                    archives={archives}
                    selectedIds={selectedIds}
                    selection={selection}
                    executeLoading={executeState.loading}
                    onSelectAll={() => {
                      const updated: Record<string, boolean> = {};
                      archives.forEach((playlist) => {
                        updated[playlist.id] = true;
                      });
                      setSelection(updated);
                    }}
                    onClear={() => {
                      const updated: Record<string, boolean> = {};
                      archives.forEach((playlist) => {
                        updated[playlist.id] = false;
                      });
                      setSelection(updated);
                    }}
                    onToggle={(id, checked) =>
                      setSelection((prev) => ({ ...prev, [id]: checked }))
                    }
                    onDelete={applyDeletion}
                  />
                )}
              </>
            )}

            {flowStep === 2 && executeState.result && (
              <div ref={resultRef}>
                <ArchivesResults
                  result={executeState.result}
                  onRunAgain={loadArchives}
                />
              </div>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
