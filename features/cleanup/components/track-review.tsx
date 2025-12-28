import type { TrackWithSources } from "../types";

type TrackReviewProps = {
  trackCandidates: TrackWithSources[];
  trackSelection: Record<string, boolean>;
  selectedTracks: TrackWithSources[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onToggleTrack: (trackId: string, checked: boolean) => void;
  onBack: () => void;
  onReviewSelections: () => void;
};

export default function TrackReview({
  trackCandidates,
  trackSelection,
  selectedTracks,
  onSelectAll,
  onClearSelection,
  onToggleTrack,
  onBack,
  onReviewSelections,
}: TrackReviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Review tracks</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Uncheck any songs you want to keep.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:border-slate-700 dark:text-slate-300"
            onClick={onSelectAll}
          >
            Check all
          </button>
          <button
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:border-slate-700 dark:text-slate-300"
            onClick={onClearSelection}
          >
            Clear selection
          </button>
        </div>
      </div>

      <div className="max-h-[min(66vh,540px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
        {trackCandidates.length === 0 && (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            No tracks found for the selected artists.
          </div>
        )}
        {trackCandidates.map((track) => (
          <label
            key={track.id}
            className="flex cursor-pointer flex-col gap-2 border-b border-slate-100 px-6 py-4 text-base last:border-none dark:border-slate-800"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
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
                <div className="space-y-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
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
              <input
                type="checkbox"
                checked={Boolean(trackSelection[track.id])}
                onChange={(event) =>
                  onToggleTrack(track.id, event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 bg-white text-emerald-600 accent-emerald-600 dark:border-slate-600 dark:bg-slate-900"
              />
            </div>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <button
            className="rounded-full border border-slate-200 px-6 py-3 text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
            onClick={onBack}
          >
            Back
          </button>
          <button
            className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
            onClick={onReviewSelections}
            disabled={selectedTracks.length === 0}
          >
            Review selections
          </button>
        </div>
        <span className="rounded-full bg-emerald-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
          {selectedTracks.length} selected
        </span>
      </div>
    </div>
  );
}
