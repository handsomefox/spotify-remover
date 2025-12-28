import type { ArchivePlaylist } from "../types";

type ArchivesListProps = {
  archives: ArchivePlaylist[];
  selectedIds: ArchivePlaylist[];
  selection: Record<string, boolean>;
  executeLoading: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: () => void;
};

export default function ArchivesList({
  archives,
  selectedIds,
  selection,
  executeLoading,
  onSelectAll,
  onClear,
  onToggle,
  onDelete,
}: ArchivesListProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Playlists found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {archives.length} playlists / {selectedIds.length} selected
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
            onClick={onSelectAll}
          >
            Select all
          </button>
          <button
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
            onClick={onClear}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {archives.map((playlist) => (
          <label
            key={playlist.id}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm dark:border-slate-800 dark:bg-slate-900/70"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                {playlist.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {playlist.trackTotal} tracks
              </p>
            </div>
            <input
              type="checkbox"
              checked={Boolean(selection[playlist.id])}
              onChange={(event) => onToggle(playlist.id, event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 bg-white text-emerald-600 accent-emerald-600 dark:border-slate-600 dark:bg-slate-900"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          className="rounded-full bg-slate-900 px-6 py-3 text-white transition hover:bg-slate-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
          onClick={onDelete}
          disabled={selectedIds.length === 0 || executeLoading}
        >
          {executeLoading ? "Deleting..." : "Delete selected"}
        </button>
      </div>
    </div>
  );
}
