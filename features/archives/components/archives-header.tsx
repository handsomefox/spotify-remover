type ArchivesHeaderProps = {
  steps: string[];
  flowStep: number;
  hasLoaded: boolean;
  loadingArchives: boolean;
  onReload: () => void;
};

export default function ArchivesHeader({
  steps,
  flowStep,
  hasLoaded,
  loadingArchives,
  onReload,
}: ArchivesHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold">Archive cleanup</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Find playlists created by the cleanup tool and remove the ones you no
          longer need.
        </p>
      </div>
      {hasLoaded && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
            Step {flowStep + 1} of {steps.length}
          </div>
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
            onClick={onReload}
            disabled={loadingArchives}
          >
            {loadingArchives ? "Loading..." : "Reload"}
          </button>
        </div>
      )}
    </div>
  );
}
