export type SpotifyArtist = {
  id: string;
  name: string;
};

export type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: SpotifyArtist[];
  album: {
    name: string;
    imageUrl: string | null;
  };
};

export type SpotifyPlaylist = {
  id: string;
  name: string;
};

export type SpotifyUser = {
  id: string;
  display_name: string | null;
};

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type FetchOptions = {
  retries?: number;
  backoffMs?: number;
};

async function spotifyFetch<T>(
  token: string,
  url: string,
  init?: RequestInit,
  options: FetchOptions = {},
): Promise<T> {
  const { retries = 3, backoffMs = 500 } = options;
  let attempt = 0;

  while (true) {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (response.status === 429) {
      if (attempt >= retries) {
        const errorBody = await response.text();
        throw new Error(
          `Spotify API error (429): ${errorBody || "Rate limit exceeded."}`,
        );
      }
      const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
      const delay = Math.max(retryAfter * 1000, backoffMs * 2 ** attempt);
      await sleep(delay);
      attempt += 1;
      continue;
    }

    if (response.status >= 500 && response.status < 600 && attempt < retries) {
      await sleep(backoffMs * 2 ** attempt);
      attempt += 1;
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Spotify API error (${response.status}): ${errorBody || response.statusText}`,
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }
}

type PagingResponse<TItem> = {
  items: TItem[];
  next: string | null;
};

async function fetchAllPages<T>(token: string, url: string): Promise<T[]> {
  let nextUrl: string | null = url;
  const items: T[] = [];

  while (nextUrl) {
    const data: PagingResponse<T> = await spotifyFetch<PagingResponse<T>>(
      token,
      nextUrl,
    );
    items.push(...data.items);
    nextUrl = data.next;
  }

  return items;
}

const mapTrack = (track: {
  id: string | null;
  uri: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: { url: string; width: number | null; height: number | null }[];
  };
}) => {
  if (!track.id) {
    return null;
  }

  const albumImages = track.album?.images ?? [];
  const smallestImage =
    albumImages.length > 0
      ? albumImages.reduce((smallest, current) => {
          if (!smallest) {
            return current;
          }
          if (!current.height || !smallest.height) {
            return smallest;
          }
          return current.height < smallest.height ? current : smallest;
        }, albumImages[0])
      : null;

  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: track.artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
    })),
    album: {
      name: track.album?.name ?? "",
      imageUrl: smallestImage?.url ?? null,
    },
  } satisfies SpotifyTrack;
};

export async function getCurrentUser(token: string): Promise<SpotifyUser> {
  return spotifyFetch<SpotifyUser>(token, `${SPOTIFY_API_BASE}/me`);
}

export async function getAllOwnedPlaylists(
  token: string,
  userId: string,
): Promise<SpotifyPlaylist[]> {
  const archivePrefix = "Removed by Spotify Cleanup Tool";
  const playlists = await fetchAllPages<{
    id: string;
    name: string;
    owner: { id: string };
  }>(token, `${SPOTIFY_API_BASE}/me/playlists?limit=50`);

  return playlists
    .filter(
      (playlist) =>
        playlist.owner.id === userId &&
        !playlist.name.startsWith(archivePrefix),
    )
    .map((playlist) => ({ id: playlist.id, name: playlist.name }));
}

export async function getAllPlaylistTracks(
  token: string,
  playlistId: string,
): Promise<SpotifyTrack[]> {
  const items = await fetchAllPages<{
    track: {
      id: string | null;
      uri: string;
      name: string;
      artists: { id: string; name: string }[];
      album: {
        name: string;
        images: { url: string; width: number | null; height: number | null }[];
      };
    } | null;
    is_local: boolean;
  }>(token, `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=100`);

  return items
    .map((item) => item.track)
    .filter((track): track is NonNullable<typeof track> => Boolean(track))
    .map(mapTrack)
    .filter((track): track is SpotifyTrack => Boolean(track));
}

export async function getAllLikedTracks(
  token: string,
): Promise<SpotifyTrack[]> {
  const items = await fetchAllPages<{
    track: {
      id: string | null;
      uri: string;
      name: string;
      artists: { id: string; name: string }[];
      album: {
        name: string;
        images: { url: string; width: number | null; height: number | null }[];
      };
    };
  }>(token, `${SPOTIFY_API_BASE}/me/tracks?limit=50`);

  return items
    .map((item) => mapTrack(item.track))
    .filter((track): track is SpotifyTrack => Boolean(track));
}

export async function getLikedTrackTotal(token: string): Promise<number> {
  const data = await spotifyFetch<{ total: number }>(
    token,
    `${SPOTIFY_API_BASE}/me/tracks?limit=1`,
  );
  return data.total;
}

export async function getPlaylistTrackTotal(
  token: string,
  playlistId: string,
): Promise<number> {
  const data = await spotifyFetch<{ tracks: { total: number } }>(
    token,
    `${SPOTIFY_API_BASE}/playlists/${playlistId}?fields=tracks.total`,
  );
  return data.tracks.total;
}

export async function removeSavedTracks(
  token: string,
  trackIds: string[],
): Promise<void> {
  for (let i = 0; i < trackIds.length; i += 50) {
    const chunk = trackIds.slice(i, i + 50);
    const idsParam = chunk.join(",");
    await spotifyFetch<void>(
      token,
      `${SPOTIFY_API_BASE}/me/tracks?ids=${encodeURIComponent(idsParam)}`,
      { method: "DELETE" },
    );
  }
}

export async function removePlaylistTracks(
  token: string,
  playlistId: string,
  trackUris: string[],
): Promise<void> {
  for (let i = 0; i < trackUris.length; i += 100) {
    const chunk = trackUris.slice(i, i + 100);
    await spotifyFetch<void>(
      token,
      `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
      {
        method: "DELETE",
        body: JSON.stringify({
          tracks: chunk.map((uri) => ({ uri })),
        }),
      },
    );
  }
}

export async function createArchivePlaylist(
  token: string,
  userId: string,
  name: string,
): Promise<SpotifyPlaylist> {
  return spotifyFetch<SpotifyPlaylist>(
    token,
    `${SPOTIFY_API_BASE}/users/${userId}/playlists`,
    {
      method: "POST",
      body: JSON.stringify({
        name,
        public: false,
        description: "Backup playlist created by Spotify Cleanup Tool.",
      }),
    },
  );
}

export async function addTracksToPlaylist(
  token: string,
  playlistId: string,
  trackUris: string[],
): Promise<void> {
  for (let i = 0; i < trackUris.length; i += 100) {
    const chunk = trackUris.slice(i, i + 100);
    await spotifyFetch<void>(
      token,
      `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        body: JSON.stringify({
          uris: chunk,
        }),
      },
    );
  }
}
