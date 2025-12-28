import type { ExecuteResult } from "../types";

type ArchivesResultsProps = {
  result: ExecuteResult;
  onRunAgain: () => void;
};

export default function ArchivesResults({
  result,
  onRunAgain,
}: ArchivesResultsProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-500/10">
        <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
          Archive cleanup complete
        </h3>
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
          Deleted {result.removed} playlists.
        </p>
      </div>

      {result.failures && result.failures.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">Some deletions did not complete:</p>
          <ul className="mt-2 space-y-1 text-amber-800 dark:text-amber-200">
            {result.failures.map((failure, index) => (
              <li key={`${failure.id}-${index}`}>
                {failure.id}: {failure.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <button
          className="rounded-full border border-slate-200 px-6 py-3 text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
          onClick={onRunAgain}
        >
          Run another scan
        </button>
      </div>
    </div>
  );
}
