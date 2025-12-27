import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  addTracksToPlaylist,
  createArchivePlaylist,
  getCurrentUser,
  getPlaylistTrackTotal,
  removePlaylistTracks,
  removeSavedTracks,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

type ExecutePayload = {
  likedTrackIds: string[];
  playlistTrackUris: Record<string, string[]>;
  removedTrackUris: string[];
};

type FailureDetail = {
  scope: "playlist" | "liked";
  id?: string;
  message: string;
};

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ExecutePayload;

  try {
    payload = (await request.json()) as ExecutePayload;
  } catch (error) {
    console.error("Invalid execute payload", error);
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const { likedTrackIds, playlistTrackUris, removedTrackUris } = payload;

  try {
    let archivePlaylist = null as null | { id: string; name: string };

    if (removedTrackUris.length > 0) {
      const user = await getCurrentUser(accessToken);
      const dateLabel = new Date().toISOString().slice(0, 10);
      const name = `Removed by Spotify Cleanup Tool — ${dateLabel}`;
      archivePlaylist = await createArchivePlaylist(accessToken, user.id, name);
      await addTracksToPlaylist(
        accessToken,
        archivePlaylist.id,
        removedTrackUris,
      );

      const expectedCount = removedTrackUris.length;

      let verified = false;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const total = await getPlaylistTrackTotal(
          accessToken,
          archivePlaylist.id,
        );
        verified = total === expectedCount;
        if (verified) {
          break;
        }
        await sleep(1000);
      }

      if (!verified) {
        throw new Error(
          "Archive playlist verification failed. Cleanup aborted before removals.",
        );
      }
    }

    const failures: FailureDetail[] = [];
    let playlistsUpdated = 0;
    let likedRemoved = 0;

    const playlistIds = Object.keys(playlistTrackUris);

    for (const playlistId of playlistIds) {
      const uris = playlistTrackUris[playlistId] ?? [];
      if (uris.length === 0) {
        continue;
      }
      try {
        await removePlaylistTracks(accessToken, playlistId, uris);
        playlistsUpdated += 1;
      } catch (error) {
        console.error(
          `Failed to remove tracks from playlist ${playlistId}`,
          error,
        );
        failures.push({
          scope: "playlist",
          id: playlistId,
          message: "Failed to remove some tracks from a playlist.",
        });
      }
    }

    if (likedTrackIds.length > 0) {
      try {
        await removeSavedTracks(accessToken, likedTrackIds);
        likedRemoved = likedTrackIds.length;
      } catch (error) {
        console.error("Failed to remove liked songs", error);
        failures.push({
          scope: "liked",
          message: "Failed to remove some tracks from Liked Songs.",
        });
      }
    }

    return Response.json({
      removedFromLiked: likedRemoved,
      playlistsUpdated,
      removedTracks: removedTrackUris.length,
      archivePlaylist,
      failures,
    });
  } catch (error) {
    console.error("Failed to execute cleanup", error);
    return Response.json(
      { error: "Failed to execute cleanup." },
      { status: 500 },
    );
  }
}
