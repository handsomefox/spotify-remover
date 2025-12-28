import type { TrackWithSources } from "../types";
import type { PlaylistImpact } from "../logic/cleanup";

type SourceReviewProps = {
  selectedTracks: TrackWithSources[];
  playlistImpact: PlaylistImpact[];
  selectedSources: Record<string, boolean>;
  onToggleSource: (sourceId: string, checked: boolean) => void;
  onBack: () => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
  loading: boolean;
};

export default function SourceReview({
  selectedTracks,
  playlistImpact,
  selectedSources,
  onToggleSource,
  onBack,
  onConfirm,
  confirmDisabled,
  loading,
}: SourceReviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Review selections</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Confirm what will be removed and where.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
            Selected tracks
          </h4>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {selectedTracks.length} total
          </span>
        </div>
        <div className="max-h-[min(56vh,420px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
          {selectedTracks.length === 0 && (
            <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
              No tracks selected. Go back to update your selection.
            </div>
          )}
          {selectedTracks.map((track) => (
            <div
              key={track.id}
              className="flex items-start gap-4 border-b border-slate-100 px-6 py-4 text-sm last:border-none dark:border-slate-800"
            >
              {track.album.imageUrl ? (
                <img
                  src={track.album.imageUrl}
                  alt={`${track.name} cover art`}
                  className="h-12 w-12 rounded-xl border border-slate-200 object-cover dark:border-slate-800"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                  Cover
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                  {track.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {track.artists.map((artist) => artist.name).join(", ")} /{" "}
                  {track.sources
                    .map((source) =>
                      source.type === "liked"
                        ? "Liked Songs"
                        : source.playlistName,
                    )
                    .join(", ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
            Choose sources to modify
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Toggle off any playlist or your liked songs to keep it untouched.
          </p>
        </div>
        {playlistImpact.map((source) => (
          <label
            key={source.id}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm dark:border-slate-800 dark:bg-slate-900/70"
          >
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {source.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {source.trackCount} tracks will be removed
              </p>
            </div>
            <input
              type="checkbox"
              checked={Boolean(selectedSources[source.id])}
              onChange={(event) =>
                onToggleSource(source.id, event.target.checked)
              }
              className="h-5 w-5 rounded border-slate-300 bg-white text-emerald-600 accent-emerald-600 dark:border-slate-600 dark:bg-slate-900"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          className="rounded-full border border-slate-200 px-6 py-3 text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
          onClick={onBack}
        >
          Back
        </button>
        <button
          className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
          onClick={onConfirm}
          disabled={confirmDisabled || loading}
        >
          {loading ? "Removing..." : "Confirm removal"}
        </button>
      </div>
    </div>
  );
}
