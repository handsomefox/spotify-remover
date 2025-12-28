import type { LibraryData } from "../types";

type FlowHeaderProps = {
  libraryData: LibraryData;
  visibleArtistCount: number;
  step: number;
  steps: string[];
};

export default function FlowHeader({
  libraryData,
  visibleArtistCount,
  step,
  steps,
}: FlowHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold">Cleanup flow</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {libraryData.likedTracks.length} liked tracks /{" "}
          {libraryData.playlists.length} owned playlists / {visibleArtistCount}{" "}
          artists
        </p>
      </div>
      <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
        Step {step + 1} of {steps.length}
      </div>
    </div>
  );
}
