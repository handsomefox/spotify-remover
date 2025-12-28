import type { DuplicateGroup } from "../types";

type DuplicateGroupsProps = {
  duplicateGroups: DuplicateGroup[];
  selection: Record<string, boolean>;
  summary: { groups: number; items: number };
  onSelectExtras: () => void;
  onClearSelection: () => void;
  onToggleItem: (key: string, checked: boolean) => void;
};

export default function DuplicateGroups({
  duplicateGroups,
  selection,
  summary,
  onSelectExtras,
  onClearSelection,
  onToggleItem,
}: DuplicateGroupsProps) {
  if (duplicateGroups.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
        No duplicates found in this source.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Duplicates found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {summary.groups} groups / {summary.items} tracks
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Select tracks to remove / unchecked = keep
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Leaving a group untouched keeps every track as-is.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Each group must keep at least one track.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
            onClick={onSelectExtras}
          >
            Select extras (keep one)
          </button>
          <button
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
            onClick={onClearSelection}
          >
            Clear (keep all)
          </button>
        </div>
      </div>

      <div className="max-h-[min(68vh,560px)] space-y-4 overflow-y-auto pr-1">
        {duplicateGroups.map((group) => (
          <div
            key={group.id}
            className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {group.title}
                </p>
                {group.subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {group.subtitle}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                {group.kind === "exact" ? "Exact match" : "Potential"}
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {group.items.map((item) => (
                <label
                  key={item.key}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                      {item.track.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.track.artists
                        .map((artist) => artist.name)
                        .join(", ")}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(selection[item.key])}
                    onChange={(event) =>
                      onToggleItem(item.key, event.target.checked)
                    }
                    className="h-5 w-5 rounded border-slate-300 bg-white text-emerald-600 accent-emerald-600 dark:border-slate-600 dark:bg-slate-900"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
