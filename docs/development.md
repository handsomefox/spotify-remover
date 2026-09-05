# Run the app locally

You need Bun, a Spotify app of your own, and OpenSSL to generate a session secret.

## Register a Spotify app

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Add `http://127.0.0.1:3000/api/auth/callback/spotify` as a redirect URI. Spotify rejects `localhost` in redirect URIs and requires the loopback address instead. See [Spotify's redirect URI rules](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).
3. Copy the client ID and client secret from the app's settings page.

## Write the local configuration

1. Generate a session secret:

   ```sh
   openssl rand -base64 32
   ```

2. Create `.env.local` in the repository root and fill in your own values. NextAuth builds the OAuth callback URL from `NEXTAUTH_URL`, so it has to match the redirect URI you registered:

   ```dotenv
   SPOTIFY_ID=your_spotify_client_id
   SPOTIFY_SECRET=your_spotify_client_secret
   NEXTAUTH_SECRET=your_generated_secret
   NEXTAUTH_URL=http://127.0.0.1:3000
   ```

Git ignores `.env*`, so `.env.local` stays out of commits.

## Start the development server

1. Install the dependencies from the repository root:

   ```sh
   bun install --frozen-lockfile
   ```

2. Start the server:

   ```sh
   bun run dev
   ```

3. Open `http://127.0.0.1:3000`, not `http://localhost:3000`. The browser treats the two spellings as separate hosts, so starting on `localhost` leaves your session cookies there while the callback lands you on `127.0.0.1`, and sign-in fails.
4. Sign in with Spotify. The app asks for the scopes it needs to read your library and to edit the playlists you own.

## Check your changes

Run all three after a set of edits:

```sh
bun run format
bun run lint
bun run build
```

`bun run format` rewrites files in place, so run it before you stage anything.

## Serve the production build

After `bun run build` succeeds:

```sh
bun run start
```

The production server also listens on `http://127.0.0.1:3000`.
