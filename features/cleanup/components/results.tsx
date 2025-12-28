import type { ExecuteResult } from "../types";

type CleanupResultsProps = {
  result: ExecuteResult;
  playlistNameById: Map<string, string>;
  onRunAgain: () => void;
};

export default function CleanupResults({
  result,
  playlistNameById,
  onRunAgain,
}: CleanupResultsProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-500/10">
        <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">
          Cleanup complete
        </h3>
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
          Removed {result.removedTracks} tracks from {result.playlistsUpdated}{" "}
          playlists and {result.removedFromLiked} liked songs.
        </p>
        {result.archivePlaylist && (
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-200">
            Backup playlist created:{" "}
            <span className="font-semibold">{result.archivePlaylist.name}</span>
            .
          </p>
        )}
      </div>
      {result.failures && result.failures.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-semibold">Some removals did not complete:</p>
          <ul className="mt-2 space-y-1 text-amber-800 dark:text-amber-200">
            {result.failures.map((failure, index) => {
              const label =
                failure.scope === "liked"
                  ? "Liked Songs"
                  : (playlistNameById.get(failure.id ?? "") ??
                    `Playlist ${failure.id ?? "unknown"}`);
              return (
                <li key={`${failure.scope}-${failure.id}-${index}`}>
                  {label}: {failure.message}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
            You can retry, or check Spotify to confirm what moved.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <button
          className="rounded-full border border-slate-200 px-6 py-3 text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
          onClick={onRunAgain}
        >
          Run another cleanup
        </button>
      </div>
    </div>
  );
}
