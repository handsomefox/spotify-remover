"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

type ArchivePlaylist = {
  id: string;
  name: string;
  trackTotal: number;
};

type ExecuteResult = {
  removed: number;
  failures?: { id: string; message: string }[];
};

const steps = ["Scan tool playlists", "Select deletions", "Review results"];

export default function ArchivesPage() {
  const { data: session, status } = useSession();
  const [archives, setArchives] = useState<ArchivePlaylist[]>([]);
  const [loadingArchives, setLoadingArchives] = useState(false);
  const [archivesError, setArchivesError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [executeState, setExecuteState] = useState<{
    loading: boolean;
    error: string | null;
    result: ExecuteResult | null;
  }>({ loading: false, error: null, result: null });
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
      const response = await fetch("/api/spotify/archives");
      if (!response.ok) {
        throw new Error("Unable to load archive playlists.");
      }
      const data = (await response.json()) as {
        playlists: ArchivePlaylist[];
      };
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
      const response = await fetch("/api/spotify/archives/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistIds: selectedIds.map((playlist) => playlist.id),
        }),
      });
      if (!response.ok) {
        const errorPayload = (await response.json()) as { error?: string };
        throw new Error(errorPayload.error ?? "Archive deletion failed.");
      }
      const result = (await response.json()) as ExecuteResult;
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
              <Link
                className="hover:text-slate-700 dark:hover:text-slate-200"
                href="/duplicates"
              >
                Duplicate finder
              </Link>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-emerald-700 dark:text-emerald-300">
                Archive cleanup
              </span>
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
                  Clean up tool-created playlists.
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  We will scan for playlists created by the Spotify Cleanup Tool
                  and let you delete them in bulk.
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
                    <h2 className="text-2xl font-semibold">Archive cleanup</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Find playlists created by the cleanup tool and remove the
                      ones you no longer need.
                    </p>
                  </div>
                  {hasLoaded && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                        Step {flowStep + 1} of {steps.length}
                      </div>
                      <button
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                        onClick={loadArchives}
                        disabled={loadingArchives}
                      >
                        {loadingArchives ? "Loading..." : "Reload"}
                      </button>
                    </div>
                  )}
                </div>

                {!hasLoaded && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
                    <h3 className="text-lg font-semibold">
                      Scan tool playlists
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      We will list playlists named “Removed by Spotify Cleanup
                      Tool” so you can delete them in bulk.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
                        onClick={loadArchives}
                        disabled={loadingArchives}
                      >
                        {loadingArchives ? "Scanning..." : "Scan playlists"}
                      </button>
                    </div>
                  </div>
                )}

                {hasLoaded && flowStep === 1 && (
                  <>
                    {archives.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                        No tool playlists found.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">
                              Playlists found
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {archives.length} playlists · {selectedIds.length}{" "}
                              selected
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                              onClick={() => {
                                const updated: Record<string, boolean> = {};
                                archives.forEach((playlist) => {
                                  updated[playlist.id] = true;
                                });
                                setSelection(updated);
                              }}
                            >
                              Select all
                            </button>
                            <button
                              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                              onClick={() => {
                                const updated: Record<string, boolean> = {};
                                archives.forEach((playlist) => {
                                  updated[playlist.id] = false;
                                });
                                setSelection(updated);
                              }}
                            >
                              Clear
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {archives.map((playlist) => (
                            <label
                              key={playlist.id}
                              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm dark:border-slate-800 dark:bg-slate-900/70"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                                  {playlist.name}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {playlist.trackTotal} tracks
                                </p>
                              </div>
                              <input
                                type="checkbox"
                                checked={Boolean(selection[playlist.id])}
                                onChange={(event) =>
                                  setSelection((prev) => ({
                                    ...prev,
                                    [playlist.id]: event.target.checked,
                                  }))
                                }
                                className="h-5 w-5 rounded border-slate-300 bg-white text-emerald-600 accent-emerald-600 dark:border-slate-600 dark:bg-slate-900"
                              />
                            </label>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-4">
                          <button
                            className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
                            onClick={applyDeletion}
                            disabled={
                              selectedIds.length === 0 || executeState.loading
                            }
                          >
                            {executeState.loading
                              ? "Deleting..."
                              : "Delete selected"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {flowStep === 2 && executeState.result && (
                  <div ref={resultRef} className="space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-500/10">
                      <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                        Archive cleanup complete
                      </h3>
                      <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
                        Deleted {executeState.result.removed} playlists.
                      </p>
                    </div>

                    {executeState.result.failures &&
                      executeState.result.failures.length > 0 && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-200">
                          <p className="font-semibold">
                            Some deletions did not complete:
                          </p>
                          <ul className="mt-2 space-y-1 text-amber-800 dark:text-amber-200">
                            {executeState.result.failures.map(
                              (failure, index) => (
                                <li key={`${failure.id}-${index}`}>
                                  {failure.id}: {failure.message}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                    <div className="flex flex-wrap gap-4">
                      <button
                        className="rounded-full border border-slate-200 px-6 py-3 text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                        onClick={loadArchives}
                      >
                        Run another scan
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
