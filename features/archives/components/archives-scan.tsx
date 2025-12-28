type ArchivesScanProps = {
  loading: boolean;
  onScan: () => void;
};

export default function ArchivesScan({ loading, onScan }: ArchivesScanProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <h3 className="text-lg font-semibold">Scan tool playlists</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        We will list playlists named &quot;Removed by Spotify Cleanup Tool&quot;
        so you can delete them in bulk.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
          onClick={onScan}
          disabled={loading}
        >
          {loading ? "Scanning..." : "Scan playlists"}
        </button>
      </div>
    </div>
  );
}
