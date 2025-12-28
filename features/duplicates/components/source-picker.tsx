import type { LibraryMeta } from "../types";

type SourcePickerProps = {
  libraryMeta: LibraryMeta;
  sourceType: "liked" | "playlist";
  selectedPlaylistId: string;
  onSourceTypeChange: (value: "liked" | "playlist") => void;
  onPlaylistChange: (value: string) => void;
  onScan: () => void;
  scanLoading: boolean;
};

export default function SourcePicker({
  libraryMeta,
  sourceType,
  selectedPlaylistId,
  onSourceTypeChange,
  onPlaylistChange,
  onScan,
  scanLoading,
}: SourcePickerProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Choose a source</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Liked songs or a playlist you own.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              sourceType === "liked"
                ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
            }`}
            onClick={() => onSourceTypeChange("liked")}
          >
            Liked Songs
          </button>
          <button
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              sourceType === "playlist"
                ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
            }`}
            onClick={() => onSourceTypeChange("playlist")}
          >
            Playlist
          </button>
          <select
            className={`h-10 min-w-[220px] rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${
              sourceType === "playlist" ? "" : "cursor-not-allowed opacity-50"
            }`}
            value={selectedPlaylistId}
            onChange={(event) => onPlaylistChange(event.target.value)}
            disabled={sourceType !== "playlist"}
          >
            {libraryMeta.playlists.length === 0 && (
              <option value="" disabled>
                No playlists found
              </option>
            )}
            {libraryMeta.playlists.length > 0 && (
              <option value="" disabled>
                Select a playlist
              </option>
            )}
            {libraryMeta.playlists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {sourceType === "liked"
            ? `${libraryMeta.likedTotal} liked tracks`
            : `${libraryMeta.playlists.length} playlists`}
        </span>
        <button
          className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
          onClick={onScan}
          disabled={scanLoading}
        >
          {scanLoading ? "Scanning..." : "Scan for duplicates"}
        </button>
      </div>
    </div>
  );
}
