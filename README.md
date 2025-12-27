# Spotify Cleanup Tool

Bulk-remove songs by selected artists from your Liked Songs and owned playlists, with a backup playlist created for every removal.

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
