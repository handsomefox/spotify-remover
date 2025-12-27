import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  addTracksToPlaylist,
  createArchivePlaylist,
  getCurrentUser,
  getPlaylistTrackTotal,
  removePlaylistTrackPositions,
  removePlaylistTracks,
  removeSavedTracks,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

type DuplicateExecutePayload = {
  sourceType: "liked" | "playlist";
  playlistId?: string;
  sourceName?: string;
  likedTrackIds: string[];
  playlistTrackUris: string[];
  playlistTrackPositions: { uri: string; positions: number[] }[];
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

  let payload: DuplicateExecutePayload;

  try {
    payload = (await request.json()) as DuplicateExecutePayload;
  } catch (error) {
    console.error("Invalid duplicate execute payload", error);
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const {
    sourceType,
    playlistId,
    sourceName,
    likedTrackIds,
    playlistTrackUris,
    playlistTrackPositions,
    removedTrackUris,
  } = payload;

  try {
    let archivePlaylist = null as null | { id: string; name: string };
    const uniqueArchiveUris = Array.from(new Set(removedTrackUris));

    if (uniqueArchiveUris.length > 0) {
      const user = await getCurrentUser(accessToken);
      const dateLabel = new Date().toISOString().slice(0, 10);
      const label = sourceName ? ` — ${sourceName}` : "";
      const name = `Removed by Spotify Cleanup Tool — Duplicates${label} — ${dateLabel}`;
      archivePlaylist = await createArchivePlaylist(accessToken, user.id, name);
      await addTracksToPlaylist(
        accessToken,
        archivePlaylist.id,
        uniqueArchiveUris,
      );

      const expectedCount = uniqueArchiveUris.length;

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
          "Archive playlist verification failed. Duplicate cleanup aborted before removals.",
        );
      }
    }

    const failures: FailureDetail[] = [];
    let removedFromLiked = 0;
    let removedFromPlaylist = 0;

    if (sourceType === "playlist" && playlistId) {
      const positionRemovals = playlistTrackPositions.filter(
        (removal) => removal.positions.length > 0,
      );
      if (positionRemovals.length > 0) {
        try {
          await removePlaylistTrackPositions(
            accessToken,
            playlistId,
            positionRemovals,
          );
          removedFromPlaylist += positionRemovals.reduce(
            (sum, removal) => sum + removal.positions.length,
            0,
          );
        } catch (error) {
          console.error(
            `Failed to remove duplicate positions from playlist ${playlistId}`,
            error,
          );
          failures.push({
            scope: "playlist",
            id: playlistId,
            message: "Failed to remove some duplicate positions.",
          });
        }
      }

      if (playlistTrackUris.length > 0) {
        try {
          await removePlaylistTracks(
            accessToken,
            playlistId,
            playlistTrackUris,
          );
          removedFromPlaylist += playlistTrackUris.length;
        } catch (error) {
          console.error(
            `Failed to remove duplicate tracks from playlist ${playlistId}`,
            error,
          );
          failures.push({
            scope: "playlist",
            id: playlistId,
            message: "Failed to remove some duplicate tracks.",
          });
        }
      }
    }

    if (sourceType === "liked" && likedTrackIds.length > 0) {
      try {
        await removeSavedTracks(accessToken, likedTrackIds);
        removedFromLiked = likedTrackIds.length;
      } catch (error) {
        console.error("Failed to remove duplicates from Liked Songs", error);
        failures.push({
          scope: "liked",
          message: "Failed to remove some duplicates from Liked Songs.",
        });
      }
    }

    return Response.json({
      removedFromLiked,
      removedFromPlaylist,
      removedTracks: uniqueArchiveUris.length,
      archivePlaylist,
      failures,
    });
  } catch (error) {
    console.error("Failed to execute duplicate cleanup", error);
    return Response.json(
      { error: "Failed to execute duplicate cleanup." },
      { status: 500 },
    );
  }
}
