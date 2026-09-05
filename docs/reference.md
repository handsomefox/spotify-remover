# Repository reference

## Where a page lives

Each route under `app/` renders one feature component and nothing else:

- `/` renders `features/cleanup/CleanupPage.tsx`
- `/duplicates` renders `features/duplicates/DuplicatesPage.tsx`
- `/archives` renders `features/archives/ArchivesPage.tsx`

A feature directory owns its page and everything only that page uses, including the Zod schemas in `schemas.ts` and, where the page has real selection rules, the pure functions in `logic/`. Code that two features need moves to `lib/` or `components/`, not into the other feature.

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

## Two configuration traps

`eslint.config.mjs` calls `globalIgnores` with the four paths that `eslint-config-next` ignores by default. That call replaces the default ignore list rather than extending it, so a path you want ignored has to be listed there or it gets linted.

There is no Prettier config, so `prettier` runs on its defaults. That is where the two-space indents, double quotes, and semicolons come from, and it means adding a config file reformats the whole repository in one commit.

Dependency versions in `package.json` are exact, with no `^` or `~`, so `package-lock.json` and `npm ci` decide the tree. `components.json` pins shadcn to the `new-york` style with the `neutral` base color, so `npx shadcn@latest add` generates components that match what is already here.
