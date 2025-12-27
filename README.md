# Spotify Cleanup Tool

Bulk-remove songs by selected artists from your Liked Songs and owned playlists, with a backup playlist created for every removal.

## Features

- **Cleanup flow:** remove tracks by artist across Liked Songs + owned playlists with step-by-step review.
- **Duplicate finder:** scan Liked Songs or a playlist for duplicates, review selections, and remove extras safely.
- **Archive cleanup:** find playlists created by this tool and delete them in bulk.
- **Safety first:** every removal is archived in a backup playlist before deletion.
- **Progress + UX:** real scanning progress for duplicates, selectable removals, and clear results summaries.
- **Modern UI:** dark mode with system detection plus an Auto/Light/Dark theme switcher.

## Setup

1. Create a Spotify app in the Spotify Developer Dashboard.
2. Add a redirect URI: `http://localhost:3000/api/auth/callback/spotify`.
3. Create `.env.local` with:

```bash
SPOTIFY_ID=your_spotify_client_id
SPOTIFY_SECRET=your_spotify_client_secret
NEXTAUTH_SECRET=generate_a_random_secret
NEXTAUTH_URL=http://localhost:3000
```

## Development

```bash
bun run dev
```

## Build

```bash
bun run build
bun run start
```

## Notes

- The app only edits playlists you own.
- Liked Songs are treated separately via Spotify's library endpoints.
- Every removal is archived in a new playlist named `Removed by Spotify Cleanup Tool — YYYY-MM-DD`.
