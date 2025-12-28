"use client";

import { signIn } from "next-auth/react";

export default function ArchivesUnauthenticated() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">
        Clean up tool-created playlists.
      </h2>
      <p className="text-slate-600 dark:text-slate-300">
        We will scan for playlists created by the Spotify Cleanup Tool and let
        you delete them in bulk.
      </p>
      <button
        className="rounded-full bg-emerald-600 px-6 py-3 text-white transition hover:bg-emerald-700 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
        onClick={() => signIn("spotify")}
      >
        Sign in with Spotify
      </button>
    </div>
  );
}
