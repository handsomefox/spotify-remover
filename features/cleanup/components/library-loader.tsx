type LibraryLoaderProps = {
  loading: boolean;
  scanPercent: number;
  scanProgress: {
    phase: "meta" | "tracks" | "done";
    completedSources: number;
    totalSources: number;
    completedTracks: number;
    totalTracks: number;
  } | null;
  onLoad: () => void;
};

export default function LibraryLoader({
  loading,
  scanPercent,
  scanProgress,
  onLoad,
}: LibraryLoaderProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Ready to audit your playlists?</h2>
      <p className="text-slate-600 dark:text-slate-300">
        We will load your liked songs and playlists you own. Nothing will be
        removed until you confirm every step.
      </p>
      <button
        className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
        onClick={onLoad}
        disabled={loading}
      >
        {loading ? "Loading..." : "Load my Spotify library"}
      </button>
      {loading && scanProgress && (
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-emerald-100 dark:bg-emerald-950/60">
            <div
              className="h-2 rounded-full bg-emerald-600 transition-all dark:bg-emerald-400"
              style={{ width: `${scanPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {scanProgress.phase === "meta"
              ? "Preparing scan..."
              : `Scanning ${scanProgress.completedSources}/${scanProgress.totalSources} sources / ${scanProgress.completedTracks}/${scanProgress.totalTracks} tracks`}
          </p>
        </div>
      )}
    </div>
  );
}
