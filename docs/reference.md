# Repository reference

## Source layout

`app/` is the App Router tree: the root layout, the providers, `globals.css`, the route handlers under `app/api/`, and three pages that do nothing but render a feature component.

- `/` renders `features/cleanup/CleanupPage.tsx`
- `/duplicates` renders `features/duplicates/DuplicatesPage.tsx`
- `/archives` renders `features/archives/ArchivesPage.tsx`

A feature directory owns one page and everything only that page uses: `components/` for its UI, `schemas.ts` for the Zod schemas its responses parse against, and `types.ts`. Cleanup and duplicates also have `logic/`, which holds the pure functions that group tracks and set the selection defaults. Archives has no `logic/`, because the page only lists playlists and deletes them.

Shared code sits in `lib/` and `components/`. `lib/` holds the Spotify client in `spotify.ts`, the NextAuth options in `auth.ts`, the `fetchJson` wrapper in `api.ts`, and `mapWithConcurrency` in `async.ts`. `components/layout/` holds the shell, header, and nav that every page renders, and `components/ui/` holds shadcn components, so far only `sonner.tsx`.

The `@/*` alias resolves from the repository root, so `@/lib/utils` is `lib/utils.ts`.

## API routes

Every route under `app/api/spotify/` sets `dynamic = "force-dynamic"`, reads the access token from the NextAuth session, and answers 401 when the token is missing.

| Method and route                         | Result                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `GET /api/spotify/summary`               | The user, every owned playlist with all its tracks, and all Liked Songs       |
| `GET /api/spotify/library/meta`          | The user, owned playlists with track totals, and the Liked Songs total        |
| `GET /api/spotify/liked`                 | All Liked Songs, or one page when `offset` or `limit` is set                  |
| `GET /api/spotify/playlists/{id}/tracks` | Every track in the playlist                                                   |
| `GET /api/spotify/playlists/{id}/items`  | Playlist items with positions, or one page when `offset` or `limit` is set    |
| `POST /api/spotify/artists`              | Artist image URLs for the `ids` in the body, keyed by artist ID               |
| `POST /api/spotify/execute`              | Runs an artist cleanup and reports counts, the archive playlist, and failures |
| `POST /api/spotify/duplicates/execute`   | Runs a duplicate cleanup and reports the same fields                          |
| `GET /api/spotify/archives`              | Owned playlists whose names start with `Removed by Spotify Cleanup Tool`      |
| `POST /api/spotify/archives/delete`      | Unfollows the playlists in `playlistIds` and reports the count and failures   |
| `/api/auth/[...nextauth]`                | NextAuth handler for the Spotify provider                                     |

`summary` reads three playlists at a time, `library/meta` reads four, both through `mapWithConcurrency` in `lib/async.ts`.

## Spotify request handling

`spotifyFetch` in `lib/spotify.ts` wraps every Spotify call. It retries up to 3 times, with 500 ms of backoff that doubles per attempt. On a 429 it waits for the longer of `Retry-After` and the backoff. It retries 5xx responses on the same schedule, and throws on any other error status. Playlist writes go out in chunks of 100 items. `removeSavedTracks` chunks at 50, the Spotify limit for the Liked Songs endpoint.

## Authentication

`lib/auth.ts` configures the NextAuth Spotify provider with a JWT session and these five scopes: `user-library-read`, `user-library-modify`, `playlist-read-private`, `playlist-modify-private`, and `playlist-modify-public`. `playlist-modify-public` is in the list even though `createArchivePlaylist` sends `public: false`, because the cleanup also removes tracks from public playlists you own. The provider sets `show_dialog: "true"`, so Spotify asks for consent on every sign-in instead of redirecting straight through.

The `jwt` callback refreshes the access token 60 seconds before `expiresAt`. A failed refresh does not throw. It returns the token with `error: "RefreshAccessTokenError"`, which reaches the client as `session.error`, and `CleanupPage.tsx` turns that into the "Your Spotify session expired" toast. `next-auth.d.ts` declares `accessToken` and `error` on the session, so both type-check.

`refreshAccessToken` checks `SPOTIFY_ID`, `SPOTIFY_SECRET`, and the stored refresh token before it calls Spotify, and returns `RefreshAccessTokenError` when any of the three is missing. A missing secret therefore looks like an expired session rather than a configuration error. The [local development guide](development.md) lists all four variables and their local values.

## Configuration

`eslint.config.mjs` composes `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`, then calls `globalIgnores` with the four paths that `eslint-config-next` ignores by default. That call replaces the default ignore list rather than extending it, so anything you want ignored has to be listed there.

`tsconfig.json` runs `strict: true` against `target: ES2017` with `moduleResolution: bundler`, and defines the `@/*` alias. `components.json` pins shadcn to the `new-york` style with the `neutral` base color, RSC and CSS variables on, and lucide icons, so `bunx --bun shadcn@latest add` generates components that match what is already here. `app/globals.css` imports Tailwind and `tw-animate-css`, declares the dark variant as a class, and defines the theme variables the shadcn components read.

`next.config.ts` exports an empty `NextConfig`. `postcss.config.mjs` loads `@tailwindcss/postcss` and nothing else. There is no Prettier config, so `prettier` runs on its defaults, which is where the 2-space indents, double quotes, and semicolons come from.

Dependency versions in `package.json` are exact, with no `^` or `~`, so `bun install --frozen-lockfile` and `bun.lock` decide the tree.

## Commands

`package.json` defines `dev`, `build`, `start`, `lint`, and `format`. `dev` and `start` serve on port 3000, and `build` writes the production build. `lint` is bare `eslint`, which picks up the flat config. `format` is `prettier --write .`, which rewrites files in place, so run it before you stage. There is no test runner and no `test` script.
