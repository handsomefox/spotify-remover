"use client";

import { signIn } from "next-auth/react";

export default function CleanupUnauthenticated() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">
        Connect Spotify to get started.
      </h2>
      <p className="text-slate-600 dark:text-slate-300">
        We only request the permissions needed to read your library and remove
        tracks. You can revoke access any time from your Spotify settings.
      </p>
      <button
        className="rounded-full bg-emerald-600 px-6 py-3 text-white transition hover:bg-emerald-700 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300"
        onClick={() => signIn("spotify")}
      >
        Sign in and scan my library
      </button>
    </div>
  );
}
