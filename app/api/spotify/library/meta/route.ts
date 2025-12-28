import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllOwnedPlaylists,
  getCurrentUser,
  getLikedTrackTotal,
  getPlaylistTrackTotal,
} from "@/lib/spotify";
import { mapWithConcurrency } from "@/lib/async";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  if (!accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getCurrentUser(accessToken);
    const playlists = await getAllOwnedPlaylists(accessToken, user.id);

    const playlistsWithTotals = await mapWithConcurrency(
      playlists,
      4,
      async (playlist) => ({
        ...playlist,
        trackTotal: await getPlaylistTrackTotal(accessToken, playlist.id),
      }),
    );

    const likedTotal = await getLikedTrackTotal(accessToken);

    return Response.json({
      user: {
        id: user.id,
        displayName: user.display_name ?? "",
      },
      playlists: playlistsWithTotals,
      likedTotal,
    });
  } catch (error) {
    console.error("Failed to load Spotify meta", error);
    return Response.json(
      { error: "Failed to load Spotify data." },
      { status: 500 },
    );
  }
}
