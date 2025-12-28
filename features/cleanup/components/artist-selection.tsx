import { ChevronDownIcon, EyeIcon, EyeOffIcon, InfoIcon } from "lucide-react";

export type ArtistListItem = {
  id: string;
  name: string;
  count: number;
};

type ArtistSelectionProps = {
  artistList: ArtistListItem[];
  artistImages: Record<string, string | null>;
  selectedArtistIds: string[];
  showFeaturedOnlyArtists: boolean;
  artistSort: "count-desc" | "count-asc" | "name-asc" | "name-desc";
  onToggleFeaturedOnly: () => void;
  onShowFeaturedOnlyInfo: () => void;
  onSortChange: (
    value: "count-desc" | "count-asc" | "name-asc" | "name-desc",
  ) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onToggleArtist: (artistId: string, checked: boolean) => void;
  onStartReview: () => void;
  onRefreshLibrary: () => void;
  hasSelection: boolean;
};

export default function ArtistSelection({
  artistList,
  artistImages,
  selectedArtistIds,
  showFeaturedOnlyArtists,
  artistSort,
  onToggleFeaturedOnly,
  onShowFeaturedOnlyInfo,
  onSortChange,
  onSelectAll,
  onClearSelection,
  onToggleArtist,
  onStartReview,
  onRefreshLibrary,
  hasSelection,
}: ArtistSelectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Select artists to remove</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Artists are sorted by how many unique tracks appear across your
            liked songs and playlists.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70">
            <button
              type="button"
              onClick={onToggleFeaturedOnly}
              className={`flex h-9 items-center gap-2 px-4 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                showFeaturedOnlyArtists
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
              }`}
              aria-pressed={showFeaturedOnlyArtists}
            >
              Feature-only artists
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  showFeaturedOnlyArtists
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
                aria-label={
                  showFeaturedOnlyArtists
                    ? "Feature-only artists shown"
                    : "Feature-only artists hidden"
                }
              >
                {showFeaturedOnlyArtists ? (
                  <EyeIcon className="h-3 w-3" />
                ) : (
                  <EyeOffIcon className="h-3 w-3" />
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={onShowFeaturedOnlyInfo}
              className="flex h-9 w-10 items-center justify-center border-l border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
              aria-label="About feature-only artists"
            >
              <InfoIcon className="h-4 w-4" />
            </button>
          </div>
          <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <span>Sort</span>
            <div className="relative">
              <select
                value={artistSort}
                onChange={(event) =>
                  onSortChange(event.target.value as typeof artistSort)
                }
                className="h-7 appearance-none rounded-full border border-slate-200 bg-white py-1 pl-3 pr-8 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="count-desc">Count (high to low)</option>
                <option value="count-asc">Count (low to high)</option>
                <option value="name-asc">Name (A to Z)</option>
                <option value="name-desc">Name (Z to A)</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            </div>
          </label>
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
            onClick={onSelectAll}
          >
            Select all
          </button>
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
            onClick={onClearSelection}
          >
            Clear selection
          </button>
        </div>
      </div>

      <div className="max-h-[min(65vh,480px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
        {artistList.length === 0 && (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            No artists found yet. Try reloading your library.
          </div>
        )}
        {artistList.map((artist) => (
          <label
            key={artist.id}
            className="flex min-w-0 cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 text-sm leading-6 last:border-none dark:border-slate-800"
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              {artistImages[artist.id] ? (
                <img
                  src={artistImages[artist.id] ?? ""}
                  alt={`${artist.name} icon`}
                  className="h-12 w-12 rounded-xl border border-slate-200 object-cover dark:border-slate-800"
                  loading="lazy"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                  {artist.name.slice(0, 2)}
                </span>
              )}
              <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-100">
                {artist.name}
              </span>
            </span>
            <span className="flex items-center gap-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
              {artist.count} tracks
              <input
                type="checkbox"
                checked={selectedArtistIds.includes(artist.id)}
                onChange={(event) =>
                  onToggleArtist(artist.id, event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 bg-white text-emerald-600 accent-emerald-600 dark:border-slate-600 dark:bg-slate-900"
              />
            </span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <button
            className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
            onClick={onStartReview}
            disabled={!hasSelection}
          >
            Review tracks
          </button>
          <button
            className="rounded-full border border-slate-200 px-6 py-3 text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
            onClick={onRefreshLibrary}
          >
            Refresh library
          </button>
        </div>
        <span className="rounded-full bg-emerald-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
          {selectedArtistIds.length} selected
        </span>
      </div>
    </div>
  );
}
