type ScanProgressProps = {
  sourceType: "liked" | "playlist";
  selectedPlaylistName: string;
  scanPercent: number;
  scanProgress: { loaded: number; total: number } | null;
};

export default function ScanProgress({
  sourceType,
  selectedPlaylistName,
  scanPercent,
  scanProgress,
}: ScanProgressProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <h3 className="text-lg font-semibold">Scanning for duplicates</h3>
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
  );
}
