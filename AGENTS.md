# Contribute changes

The [repository reference](docs/reference.md) maps the source directories, API routes, and configuration files. Read it before you go looking for a file.

## Write code

- Put page code in `features/<name>/`. Keep the pure selection and grouping functions in `features/<name>/logic/`, where they stay testable without React.
- Keep every Spotify HTTP call in `lib/spotify.ts` and route it through `spotifyFetch`, which handles retries and 429 backoff. Do not call the Spotify API from a component.
- Fetch from the client with `fetchJson` in `lib/api.ts` and pass the Zod schema from the feature's `schemas.ts`. It parses the response and turns an error payload into a thrown `Error`.
- Import through the `@/*` alias, not relative paths that climb out of a directory.
- Style with Tailwind utility classes in JSX. Global styles and theme variables live in `app/globals.css`.
- Prettier owns formatting. Run `npm run format` instead of matching the existing style by hand.

To add a shadcn component, name it in place of `button`:

```sh
npx shadcn@latest add button --yes
```

## Check your changes

Run `npm run format`, `npm run lint`, and `npm run build` after a set of edits. The [local development guide](docs/development.md#check-your-changes) covers what each one does.

The repository has no test runner. If you add tests, put each `*.test.ts` or `*.test.tsx` file next to the code it tests, and add the `test` script to `package.json`.

## Be careful with removals

The cleanup routes delete tracks from a real Spotify account, and Spotify has no undo. Every removal path must create and verify the archive playlist before it removes anything, the way `app/api/spotify/execute/route.ts` does: create, add the URIs, read back the track total, and abort when the counts disagree.

## Commit and open a pull request

Write a short commit subject in the imperative, such as "Correct the redirect URI". Say in the pull request what you ran to check the change.

Keep credentials in `.env.local`. Never commit that file, and never paste a token or a client secret into an issue, a commit message, or a test fixture.
