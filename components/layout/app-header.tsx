"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import AppNav from "./app-nav";

type AppHeaderProps = {
  activePath: string;
};

export default function AppHeader({ activePath }: AppHeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex flex-wrap items-center justify-between gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-base uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
          Spotify Cleanup Tool
        </p>
        <AppNav activePath={activePath} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 text-base">
        {session && (
          <span className="text-slate-600 dark:text-slate-300">
            Signed in as{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {session.user?.name ?? "Spotify user"}
            </span>
          </span>
        )}
        <button
          className="rounded-full border-2 border-emerald-500 px-4 py-2 text-base text-emerald-800 transition hover:border-emerald-600 hover:text-emerald-900 dark:border-emerald-300 dark:text-emerald-200 dark:hover:border-emerald-200 dark:hover:text-emerald-100"
          onClick={() => (session ? signOut() : signIn("spotify"))}
        >
          {session ? "Sign out" : "Sign in with Spotify"}
        </button>
      </div>
    </header>
  );
}
