# Spotify Cleanup Tool

A Next.js app that removes tracks from your Spotify library in bulk, either by artist or by finding duplicates. Before it deletes anything, the app copies every selected track into a private archive playlist and checks that the copy arrived.

## What each page does

The site header links to three pages. The names below are the names in the navigation.

**Cleanup flow** (`/`). The app loads Liked Songs and every playlist you own, then counts tracks per artist. You pick artists, review the tracks that matched, and choose which sources to remove them from. A track matches when the selected artist is credited anywhere on it, not only as the primary artist. A filter hides feature-only artists, meaning the artists who are never the primary artist on any track in your library.

**Duplicate finder** (`/duplicates`). Scan Liked Songs or one playlist you own. In a playlist, an exact duplicate is the same track ID at more than one position. The first occurrence starts unselected and every later occurrence starts selected for removal. A potential duplicate is a set of different track IDs that share a normalized title and primary artist name. Normalization lowercases the text, drops anything inside parentheses or square brackets, and strips punctuation, so a remix or a live version can land in the same group as the studio recording. Potential duplicates start unselected, and you should read them before you accept them. A Liked Songs scan reports potential duplicates only.

**Archive cleanup** (`/archives`). Lists the playlists you own whose name starts with `Removed by Spotify Cleanup Tool`, and deletes the ones you select. The Spotify Web API has no delete endpoint for playlists, so the app unfollows them, the same thing the Spotify clients do. Deleting an archive creates no new archive.

The cleanup flow and the duplicate finder both skip playlists whose names start with `Removed by Spotify Cleanup Tool`, so an archive never becomes a source for another cleanup.

A switcher in the bottom-right corner sets the theme to Auto, Light, or Dark. Auto follows your system setting.

## How removals work

Every removal on the cleanup flow and the duplicate finder starts with the same archive step:

1. Create a private playlist named for the run.
2. Add one copy of each selected track URI, 100 URIs per request.
3. Read the archive's track total and compare it with the number of URIs sent. The app tries this up to three times, one second apart.

If any of those three steps fails, the app stops and removes nothing.

Two limits are worth knowing before you trust the archive. It stores track URIs and nothing else, so it does not record the original playlist positions or which source each track came from. Restoring is manual. The second limit is that removals run after the archive is verified, and each one can still fail on its own. The results page lists every failure, and the app does not undo the removals that already succeeded.

Archive playlists are private, and the date in the name is UTC:

- Cleanup flow: `Removed by Spotify Cleanup Tool — 2026-09-05`
- Duplicate finder: `Removed by Spotify Cleanup Tool — Duplicates — Road Trip — 2026-09-05`

The duplicate name drops the source segment when the page sends no source name.

## Where to go next

- [Run the app locally](docs/development.md)
- [Repository reference](docs/reference.md)
- [Contribute changes](AGENTS.md)
