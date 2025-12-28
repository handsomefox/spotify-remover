import type { ArtistListItem } from "./artist-selection";

type FeaturedOnlyInfoProps = {
  artists: ArtistListItem[];
  artistImages: Record<string, string | null>;
  onClose: () => void;
};

export default function FeaturedOnlyInfo({
  artists,
  artistImages,
  onClose,
}: FeaturedOnlyInfoProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-6 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Feature-only artists
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              These artists only appear as a feature on tracks in your library.
              Toggle the filter to include or hide them from the main picker.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <span>{artists.length} artists</span>
            <span>Tracks</span>
          </div>
          <div className="max-h-[50vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            {artists.length === 0 && (
              <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                No feature-only artists found.
              </div>
            )}
            {artists.map((artist) => (
              <div
                key={artist.id}
                className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm last:border-none dark:border-slate-800"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {artistImages[artist.id] ? (
                    <img
                      src={artistImages[artist.id] ?? ""}
                      alt={`${artist.name} icon`}
                      className="h-10 w-10 rounded-xl border border-slate-200 object-cover dark:border-slate-800"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                      {artist.name.slice(0, 2)}
                    </span>
                  )}
                  <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {artist.name}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {artist.count} tracks
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
